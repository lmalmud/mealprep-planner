import { fetchFromApi } from "@/lib/api";
import type { HealthResponse } from "@/types/health";

export async function fetchApiHealth(): Promise<HealthResponse> {
  return fetchFromApi<HealthResponse>("/api/health");
}
