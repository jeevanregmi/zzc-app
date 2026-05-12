import type { Metadata } from "next";
import MediaClient from "./MediaClient";

export const metadata: Metadata = {
  title: "Media Vault",
  robots: { index: false, follow: false },
};

export default function MediaPage() {
  return <MediaClient />;
}
