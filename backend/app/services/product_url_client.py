import ipaddress
import json
import socket
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

_MAX_REDIRECTS = 5
_USER_AGENT = "MealPrepPlanner/0.1 (+product-info fetcher)"


@dataclass(frozen=True)
class ProductUrlCandidate:
    name: str
    price_amount: float | None
    price_currency: str | None
    image_url: str | None
    source_url: str


class ProductUrlUnavailableError(RuntimeError):
    pass


class ProductUrlParseError(RuntimeError):
    pass


def _assert_public_host(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ProductUrlUnavailableError(f"Unsupported URL scheme: {parsed.scheme or '(none)'}")
    if not parsed.hostname:
        raise ProductUrlUnavailableError(f"Could not parse a hostname from: {url}")

    try:
        addr_infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as exc:
        raise ProductUrlUnavailableError(f"Could not resolve host: {parsed.hostname}") from exc

    for _family, _type, _proto, _canonname, sockaddr in addr_infos:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ProductUrlUnavailableError(
                f"Refusing to fetch a URL that resolves to a non-public address: {parsed.hostname}"
            )


class ProductUrlClient:
    def fetch_product(self, url: str) -> ProductUrlCandidate:
        current_url = url
        response: httpx.Response | None = None

        with httpx.Client(timeout=15.0, follow_redirects=False, headers={"User-Agent": _USER_AGENT}) as client:
            for _ in range(_MAX_REDIRECTS):
                _assert_public_host(current_url)
                try:
                    response = client.get(current_url)
                except httpx.HTTPError as exc:
                    raise ProductUrlUnavailableError(f"Could not fetch {current_url}: {exc}") from exc

                if response.is_redirect:
                    next_url = response.headers.get("location")
                    if not next_url:
                        break
                    current_url = str(httpx.URL(current_url).join(next_url))
                    continue
                break

            if response is None:
                raise ProductUrlUnavailableError(f"Could not fetch {url}: too many redirects")

            if response.status_code >= 400:
                raise ProductUrlUnavailableError(
                    f"Fetching {current_url} failed: HTTP {response.status_code}"
                )

        candidate = _extract_product(response.text, source_url=current_url)
        if candidate is None:
            raise ProductUrlParseError(f"Could not extract product info from {url}")
        return candidate


def _extract_product(html: str, source_url: str) -> ProductUrlCandidate | None:
    soup = BeautifulSoup(html, "html.parser")

    product = _find_json_ld_product(soup)
    if product is not None:
        name = _clean_str(product.get("name"))
        if name:
            price_amount, price_currency = _extract_offer_price(product.get("offers"))
            return ProductUrlCandidate(
                name=name,
                price_amount=price_amount,
                price_currency=price_currency,
                image_url=_extract_image(product.get("image")),
                source_url=source_url,
            )

    name = _og_content(soup, "og:title")
    if name:
        return ProductUrlCandidate(
            name=name,
            price_amount=_coerce_price(_og_content(soup, "product:price:amount")),
            price_currency=_og_content(soup, "product:price:currency"),
            image_url=_og_content(soup, "og:image"),
            source_url=source_url,
        )

    return None


def _find_json_ld_product(soup: BeautifulSoup) -> dict[str, Any] | None:
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue

        for node in _flatten_json_ld(data):
            node_type = node.get("@type")
            types = node_type if isinstance(node_type, list) else [node_type]
            # ProductGroup is schema.org's type for a parent product with variants
            # (e.g. size/flavor) — common on Shopify and similar storefronts.
            if "Product" in types or "ProductGroup" in types:
                return node
    return None


def _flatten_json_ld(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        nodes: list[dict[str, Any]] = []
        for item in data:
            nodes.extend(_flatten_json_ld(item))
        return nodes
    if isinstance(data, dict):
        if isinstance(data.get("@graph"), list):
            return _flatten_json_ld(data["@graph"])
        return [data]
    return []


def _extract_offer_price(offers: Any) -> tuple[float | None, str | None]:
    if isinstance(offers, list):
        offers = offers[0] if offers else None
    if not isinstance(offers, dict):
        return None, None
    return _coerce_price(offers.get("price")), _clean_str(offers.get("priceCurrency"))


def _extract_image(image: Any) -> str | None:
    if isinstance(image, list):
        image = image[0] if image else None
    if isinstance(image, dict):
        return _clean_str(image.get("url"))
    return _clean_str(image)


def _og_content(soup: BeautifulSoup, property_name: str) -> str | None:
    tag = soup.find("meta", attrs={"property": property_name})
    if tag is None:
        return None
    return _clean_str(tag.get("content"))


def _clean_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _coerce_price(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = "".join(ch for ch in str(value).strip() if ch.isdigit() or ch in ".,")
    text = text.replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None
