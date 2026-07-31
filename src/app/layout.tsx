import type { Metadata } from "next";
import {
  Alfa_Slab_One,
  Caveat,
  Inter,
  Instrument_Serif,
  Quicksand,
} from "next/font/google";
import "./globals.css";

// Every face a theme can reference is loaded here and exposed as a CSS
// variable, so themes name fonts declaratively (see FONTS in lib/style.ts)
// without any component importing a font directly.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand" });
// Brush-pen script for the editorial style's one emphasis phrase per slide.
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-caveat" });
// Stands in for Tiempos / GT Sectra, which are commercial.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});
// Stands in for Cooper Black, which is commercial.
const alfaSlab = Alfa_Slab_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-alfa",
});

const fontVars = [
  inter.variable,
  quicksand.variable,
  caveat.variable,
  instrumentSerif.variable,
  alfaSlab.variable,
].join(" ");

export const metadata: Metadata = {
  title: "App Store Screenshots",
  description: "Design and export App Store + Google Play screenshots.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fontVars} ${inter.className}`}>{children}</body>
    </html>
  );
}
