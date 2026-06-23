import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
