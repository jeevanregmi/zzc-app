import type { Metadata } from "next";
import BusinessClient from "./BusinessClient";

export const metadata: Metadata = {
  title: "Business BI — Vault",
  robots: { index: false, follow: false },
};

export default function BusinessPage() {
  return <BusinessClient />;
}
