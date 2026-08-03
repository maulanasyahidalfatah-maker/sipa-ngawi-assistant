# 🏛️ SIPA-NGAWI (Sistem Informasi & Pelayanan Asisten Pendidikan Ngawi)

![Next.js](https://img.shields.io/badge/Next.js-14%2B-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-API-8E7CC3?style=for-the-badge&logo=googlegemini)

**SIPA-NGAWI** adalah portal konsultasi dan asisten virtual berbasis Kecerdasan Buatan (AI) resmi untuk **Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi**. Sistem ini dirancang untuk membantu operator sekolah, guru, dan masyarakat umum dalam menyelesaikan kendala teknis Data Pokok Pendidikan (Dapodik), VervalPD/PTK, perizinan, serta informasi pelestarian kebudayaan daerah secara responsif dan akurat.

---

## 🌟 Fitur Utama

- 🤖 **AI Customer Service & Technical Assistance (Gemini API):**
  - Menggunakan model cerdas Google Gemini dengan sistem *Multi-Key Fallback* otomatis untuk menjamin kestabilan layanan.
  - Mengadopsi metode **RAG (Retrieval-Augmented Generation)** berbasis file pengetahuan lokal (`SOP.txt`) agar jawaban konsisten dan akurat sesuai aturan Disdikbud Ngawi.

- 📋 **Formulir Pengaduan Layanan Integratif:**
  - Dilengkapi formulir tiket pengaduan terstruktur untuk laporan teknis yang membutuhkan penanganan manual oleh tim Admin Dinas.
  - **Google Sheets Webhook Integration:** Data pengaduan dikirim secara *real-time* dan tercatat otomatis pada spreadsheet Google Sheets resmi.

- 🎨 **Antarmuka & Rebranding Khas Pemkab Ngawi:**
  - Identitas visual disesuaikan dengan warna resmi Disdikbud Ngawi (**Hijau `#006837`**, **Biru `#00529B`**, dan **Emas `#FDB913`**).
  - Tampilan responsif (Mobile & Desktop), modern, ramah aksesibilitas, dan cepat menggunakan **shadcn/ui** serta **Tailwind CSS**.

---

## 📂 Struktur Direktori Proyek

```text
sipa-ngawi/
├── app/                        # Next.js App Router
│   ├── api/
│   │   └── chat/
│   │       └── route.ts        # Endpoint API Chat Gemini & Webhook Pengaduan
│   ├── globals.css             # Konfigurasi Tailwind CSS & Styling Global
│   ├── layout.tsx              # Root Layout, Metadata, & Viewport SIPA-NGAWI
│   └── page.tsx                # Halaman Utama Portal
├── components/                 # Komponen UI React
│   ├── chat-interface.tsx      # Komponen Antarmuka Chat & Form Pengaduan
│   └── ui/                     # Komponen Atomik (shadcn/ui)
├── lib/                        # Library, Utility, & Logika RAG
│   ├── rag/
│   │   ├── prompt.ts           # Persona, System Rules, & Prompt Engineer AI
│   │   └── sop.ts              # Loader & Engine Pencarian RAG
│   └── utils.ts                # Helper Utility Functions
├── public/                     # Aset Statis (Icon, Logo, & Images)
├── .env.local                  # Environment Variables (API Key & Webhook URL)
├── package.json                # Dependencies & Script Proyek
├── README.md                   # Dokumentasi Resmi Proyek
└── SOP.txt                     # Knowledge Base SOP Teknis Disdikbud Ngawi