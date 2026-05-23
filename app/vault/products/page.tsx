import type { Metadata } from "next";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
  title: "Products — ZZC Vault",
  robots: { index: false, follow: false },
};

export default function ProductsPage() {
  return <ProductsClient />;
}
