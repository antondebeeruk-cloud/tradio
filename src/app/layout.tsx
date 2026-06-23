import type { Metadata } from "next";
import { CookieConsent } from "@/components/cookie-consent";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradio",
  description: "Customer, quote, invoice, and PDF tools for UK tradespeople.",
  icons: {
    icon: "/tradio-logo.png",
    apple: "/tradio-logo.png",
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
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
