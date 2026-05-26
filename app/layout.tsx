import "./globals.scss";
import type { Viewport } from "next";
import RootLayoutClient from "./layout-client";

export const metadata = {
  title: "HBC - Himalayan Bullion Jewelry Management",
  description: "Jewelry management system for HBC",
};

// Without this, mobile browsers render at desktop width (~980px) and zoom
// out — the entire admin UI is shrunk and the hamburger button becomes
// un-tappable. This single declaration is the difference between "menu
// doesn't show on mobile" and "menu works".
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#b8860b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
