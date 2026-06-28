import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Tradio Admin" },
  robots: { follow: false, index: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

