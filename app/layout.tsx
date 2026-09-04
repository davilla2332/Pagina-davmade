import type { Metadata } from "next";
import "./globals.css";

const productionUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title: "Nuestra Historia — David y Madeline",
  description: "Una pregunta, dos corazones y el comienzo de nuestra historia para siempre.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nuestra Historia — David y Madeline",
    description: "Una pregunta, dos corazones y el comienzo de nuestra historia para siempre.",
    url: "/",
    siteName: "Nuestra Historia",
    locale: "es_PA",
    type: "website",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Nuestra Historia — David y Madeline" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nuestra Historia — David y Madeline",
    description: "Una pregunta, dos corazones y el comienzo de nuestra historia para siempre.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
