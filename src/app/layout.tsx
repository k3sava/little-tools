import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  DM_Sans,
  JetBrains_Mono,
  Noto_Serif_JP,
  Source_Serif_4,
} from "next/font/google";
import { BlobCanvas } from "@/components/blob-canvas";
import { ShareButton } from "@/components/share-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CommandPalette } from "@/components/tools/command-palette";
import { CopyToastContainer } from "@/components/tools/copy-toast";
import { JsonLd, rootLd } from "@/lib/json-ld";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

// Editorial: Cormorant Garamond for display (headings), Source Serif 4 for body
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-editorial-display",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-editorial-body",
});

// Zen: Noto Serif JP reads meditative even in English
const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-zen-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.iamkesava.com"),
  title: "little tools - fast, single-purpose web utilities by Kesava",
  description:
    "60 ad-free, privacy-first browser tools for text, design, and development. All processing happens in your browser. No accounts, no data collection.",
  authors: [{ name: "Kesava" }],
  alternates: { canonical: "https://tools.iamkesava.com" },
  openGraph: {
    title: "little tools - fast, single-purpose web utilities by Kesava",
    description:
      "60 ad-free, privacy-first browser tools for text, design, and development. All processing happens in your browser.",
    url: "https://tools.iamkesava.com",
    siteName: "little tools",
    type: "website",
    images: [{ url: "https://tools.iamkesava.com/og/default.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "little tools - fast, single-purpose web utilities by Kesava",
    description:
      "60 ad-free, privacy-first browser tools. All processing in your browser.",
    images: ["https://tools.iamkesava.com/og/default.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetBrainsMono.variable} ${cormorant.variable} ${sourceSerif.variable} ${notoSerifJP.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(!t){t="brutalist";localStorage.setItem("theme",t)}if(t&&t!=="default")document.documentElement.setAttribute("data-theme",t);else document.documentElement.removeAttribute("data-theme")}catch(e){}})()`,
          }}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="little tools, what's new"
          href="https://tools.iamkesava.com/feed.xml"
        />
        <link rel="service-doc" href="https://tools.iamkesava.com/llms.txt" />
        <link rel="api-catalog" href="https://tools.iamkesava.com/.well-known/api-catalog" />
        <link rel="describedby" href="https://tools.iamkesava.com/.well-known/agent-permissions.json" />
        <link rel="me" href="https://github.com/k3sava" />
        <link rel="me" href="https://www.linkedin.com/in/k3sava" />
        <link rel="me" href="https://iamkesava.com/" />
        <link rel="author" href="https://iamkesava.com/" />
        <JsonLd data={rootLd()} />
      </head>
      <body className="font-sans antialiased">
        <div className="kami-mobile-bar" aria-hidden="true" />
        <BlobCanvas />
        <div className="tools-light" style={{ position: "relative", zIndex: 10 }}>{children}</div>
        <ShareButton />
        <ThemeSwitcher />
        <CommandPalette />
        <CopyToastContainer />
      </body>
    </html>
  );
}
