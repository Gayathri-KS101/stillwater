import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/toaster-provider";

export const metadata: Metadata = {
  title: "Fragilewhispers — A gentle mental wellness journal",
  description: "Take a moment. A calm, private space to check in with how you're feeling.",
  openGraph: {
    title: "Fragilewhispers",
    description: "Take a moment. There are no right or wrong answers.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
