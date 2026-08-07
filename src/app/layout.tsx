import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RIVER | Onchain Poker",
  description: "The first poker room where the house cannot see your cards. Powered by Inco FHE.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-river-bg text-river-white antialiased">
        {children}
      </body>
    </html>
  );
}
