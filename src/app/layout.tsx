import type { Metadata } from "next";
import { CookieConsent } from "@/components/cookie-consent";
import { Footer } from "@/components/footer";
import { NativeAppBridge } from "@/components/native-app-bridge";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Tradio",
  authors: [{ name: "Tradio" }],
  creator: "Tradio",
  description:
    "Tradio helps UK tradespeople manage customers, create quotes, send invoices, capture leads, track jobs, and export professional PDFs.",
  keywords: [
    "tradespeople software",
    "quote software UK",
    "invoice software for tradesmen",
    "plumber invoice app",
    "electrician quote app",
    "gardener quote software",
    "builder invoice software",
    "customer management for trades",
    "lead management for tradespeople",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tradio.uk"),
  openGraph: {
    description:
      "Quotes, invoices, leads, jobs, and customers sorted for UK tradespeople.",
    images: [
      {
        alt: "Tradio - quotes, invoices, jobs, sorted",
        height: 1254,
        url: "/tradio-logo.png",
        width: 1254,
      },
    ],
    locale: "en_GB",
    siteName: "Tradio",
    title: "Tradio | Quotes, Invoices, Jobs, Sorted",
    type: "website",
    url: "/",
  },
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: "Tradio | Quotes, Invoices, Jobs, Sorted",
    template: "%s | Tradio",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Simple quote, invoice, customer, lead, and job tracking software for UK tradespeople.",
    images: ["/tradio-logo.png"],
    title: "Tradio | Quotes, Invoices, Jobs, Sorted",
  },
  icons: {
    icon: "/tradio-mark.png",
    apple: "/tradio-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>
        <NativeAppBridge />
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
