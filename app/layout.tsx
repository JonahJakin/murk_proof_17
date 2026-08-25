import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", base).toString();
  const description = "There’s something in Greenwake Lake.";
  return {
    metadataBase: base,
    title: "MURK",
    description,
    manifest: "/manifest.webmanifest",
    applicationName: "MURK",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MURK" },
    icons: {
      icon: [
        { url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: "/icons/favicon-64.png",
      apple: "/icons/apple-touch-icon.png",
    },
    openGraph: { title: "MURK", description, images: [{ url: socialImage, width: 1672, height: 941 }] },
    twitter: { card: "summary_large_image", title: "MURK", description, images: [socialImage] },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a3437",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
