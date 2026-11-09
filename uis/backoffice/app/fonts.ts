import localFont from "next/font/local";

/**
 * Self-hosted variable fonts (from @fontsource-variable, bundled at build time).
 * Replaces the render-blocking @import of fonts.googleapis.com: no third-party
 * request chain, the font files are preloaded, and next/font adds a size-adjusted
 * fallback so the swap does not shift the layout.
 */
export const dmSans = localFont({
  src: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

export const spaceGrotesk = localFont({
  src: "../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});
