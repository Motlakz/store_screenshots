import type { Metadata } from "next";
import {
  Alfa_Slab_One,
  Caveat,
  Inter,
  Instrument_Serif,
  JetBrains_Mono,
  Montserrat,
  Quicksand,
} from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme-mode";

// Every face a theme can reference is loaded here and exposed as a CSS
// variable, so themes name fonts declaratively (see FONTS in lib/style.ts)
// without any component importing a font directly.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand" });
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-jetbrains-mono",
});
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
  montserrat.variable,
  jetbrainsMono.variable,
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
    // suppressHydrationWarning: the init script below stamps a light/dark class
    // onto <html> before React hydrates, so the client markup deliberately
    // differs from what the server rendered.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking and inline on purpose — it has to resolve the saved theme
            before the first paint, or the shell flashes the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${fontVars} ${inter.className}`}>{children}</body>
    </html>
  );
}
