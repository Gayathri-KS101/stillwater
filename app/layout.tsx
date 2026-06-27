import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/toaster-provider";
import { ServiceWorkerRegistrar } from "@/components/sw-registrar";

export const metadata: Metadata = {
  title: "Fragilewhispers — A gentle mental wellness journal",
  description: "Take a moment. A calm, private space to check in with how you're feeling.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fragilewhispers",
  },
  openGraph: {
    title: "Fragilewhispers",
    description: "Take a moment. There are no right or wrong answers.",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <ToasterProvider />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
