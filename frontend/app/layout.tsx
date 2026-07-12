import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "MealPrep Planner",
  description: "Meal planning, recipes, and grocery organization.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
