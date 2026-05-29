import type { Metadata } from "next";
import QualityClient from "./QualityClient";

export const metadata: Metadata = {
  title: "Quality Gate — Knowledge Card Audit",
};

export default function QualityPage() {
  return <QualityClient />;
}
