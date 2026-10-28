import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Senzora Health Intelligence", template: "%s · Senzora" },
  description: "See Beyond the Signals.",
  applicationName: "Senzora Health Intelligence",
  openGraph: {
    type: "website",
    siteName: "Senzora Health Intelligence",
    title: "Senzora Health Intelligence",
    description: "See Beyond the Signals.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Senzora Health Intelligence",
    description: "See Beyond the Signals.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#071321" },
    { media: "(prefers-color-scheme: light)", color: "#f2faff" },
  ],
};

// Runs before first paint so the saved theme is applied with no flash.
// Senzora is dark-first: with no saved choice, the dark theme is used.
const themeScript = `(function(){try{var t=localStorage.getItem('senzora-theme');if(t!=='light'&&t!=='dark'){t='dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
