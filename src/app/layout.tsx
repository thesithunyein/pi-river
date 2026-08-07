import type { Metadata } from "next";
import { Nunito, Plus_Jakarta_Sans } from "next/font/google";
import { Web3Provider } from "@/components/Web3Provider";
import { GameProvider } from "@/context/GameContext";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const displayFont = Nunito({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: "pi River",
  description:
    "Heads-up confidential Texas Hold'em on Inco Lightning. Hole cards stay private until showdown. Live on Base Sepolia at pi.sithunyein.com.",
  metadataBase: new URL("https://pi.sithunyein.com"),
  icons: { icon: "/brand/mi-mark.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-river-bg text-river-white antialiased`}
      >
        <Web3Provider>
          <GameProvider>{children}</GameProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
