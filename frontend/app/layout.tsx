import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "../styles/globals.css";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--nf-display",
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--nf-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Macro & Market",
  description: "Meal planning, recipes, and grocery organization.",
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
