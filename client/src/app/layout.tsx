import type { Metadata } from "next";
import { AppProviders } from "@/lib/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "LegalBridge India",
    template: "%s · LegalBridge India",
  },
  description:
    "Attorney-assistance platform with hosted persistence, source-linked synthetic analysis, ethics review, and an attorney approval gate.",
  applicationName: "LegalBridge India",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }],
  openGraph: {
    title: "LegalBridge India",
    description: "Source-linked legal assistance. Attorney-controlled export.",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "LegalBridge India abstract source-to-review bridge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LegalBridge India",
    description: "Source-linked legal assistance. Attorney-controlled export.",
    images: ["/og.png"],
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
