import type { Metadata } from "next";
import { ECOTRACE_DESCRIPTION } from "@/lib/branding";

export const metadata: Metadata = {
  title: {
    default: "EcoTrace",
    template: "%s | EcoTrace",
  },
  description: ECOTRACE_DESCRIPTION,
  applicationName: "EcoTrace",
  keywords: [
    "e-waste",
    "electronic waste recycling",
    "waste tracking",
    "recycling platform",
    "EcoTrace",
  ],
  openGraph: {
    title: "EcoTrace",
    description: ECOTRACE_DESCRIPTION,
    type: "website",
    siteName: "EcoTrace",
  },
  twitter: {
    card: "summary_large_image",
    title: "EcoTrace",
    description: ECOTRACE_DESCRIPTION,
  },
};
