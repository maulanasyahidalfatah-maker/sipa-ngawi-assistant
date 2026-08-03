import type { Metadata, Viewport } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "SIPA-NGAWI - Portal Konsultasi Dapodik Disdikbud Ngawi",
  description:
    "Sistem Informasi & Pelayanan Asisten Pendidikan dan Kebudayaan Kabupaten Ngawi. Layanan konsultasi teknis Dapodik, VervalPD, VervalPTK, NUPTK, dan Pelestarian Kebudayaan.",
  keywords: [
    "SIPA NGAWI",
    "Dapodik Ngawi",
    "Disdikbud Ngawi",
    "Dinas Pendidikan Ngawi",
    "VervalPD Ngawi",
    "VervalPTK Ngawi",
    "Bantuan Dapodik Ngawi",
    "Kebudayaan Ngawi",
  ],
  authors: [{ name: "Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi" }],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "SIPA-NGAWI - Portal Konsultasi Dapodik Ngawi",
    description:
      "Asisten Virtual Resmi Layanan Dapodik, Verval, dan Kebudayaan Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.",
    url: "https://disdikbud.ngawikab.go.id",
    siteName: "SIPA-NGAWI",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#006837",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-[#FAFAFA] text-neutral-900 antialiased selection:bg-[#006837] selection:text-white">
        {children}
      </body>
    </html>
  );
}