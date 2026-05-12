import type { Metadata } from "next";
import VaultClient from "./VaultClient";

export const metadata: Metadata = {
  title: "Vault — ZZC",
  robots: { index: false, follow: false },
};

export default function VaultPage() {
  return <VaultClient />;
}
