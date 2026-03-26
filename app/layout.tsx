import "./globals.scss";
import RootLayoutClient from "./layout-client";

export const metadata = {
  title: "HBC - Himalayan Bullion Jewelry Management",
  description: "Jewelry management system for HBC",
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
