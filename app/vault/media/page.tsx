import type { Metadata } from "next";
import MediaClient from "./MediaClient";

export const metadata: Metadata = {
  title: "Media Workspace — ZZC",
  robots: { index: false, follow: false },
};

export default function MediaPage() {
  return <MediaClient />;
}
