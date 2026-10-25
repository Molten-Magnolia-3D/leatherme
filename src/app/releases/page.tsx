import type { Metadata } from "next";
import { ReleasesView } from "@/components/releases-view";

export const metadata: Metadata = {
  title: "Releases · Leatherme",
  description: "Leatherme version history, and install on a computer or phone.",
};

export default function ReleasesPage() {
  return <ReleasesView />;
}
