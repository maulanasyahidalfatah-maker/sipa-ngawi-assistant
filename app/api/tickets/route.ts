import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export interface TicketData {
  id: string;
  namaPelapor: string;
  nikPelapor?: string;
  noWhatsapp: string;
  asalSekolah: string;
  npsn: string;
  kategori: string;
  rincian: string;
  fotoKeluhan?: string; // Lampiran foto kendala dari pelapor
  status: "PENDING" | "RESOLVED";
  buktiPerbaikan?: string; // Lampiran foto bukti perbaikan dari admin dinas
  createdAt?: string;
}

// Inisialisasi Database Cloud Upstash Redis
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Memory Storage Backup Jika Redis Belum Terhubung
let globalTickets: TicketData[] = [];

// Helper Ambil Data dari Redis Cloud
async function getTicketsFromCloud(): Promise<TicketData[]> {
  if (redis) {
    try {
      const data = await redis.get<TicketData[]>("sipa_tickets");
      if (Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      console.warn("⚠️ Gagal membaca dari Upstash Redis, menggunakan memori server:", err);
    }
  }
  return globalTickets;
}

// Helper Simpan Data ke Redis Cloud
async function saveTicketsToCloud(tickets: TicketData[]) {
  globalTickets = tickets;
  if (redis) {
    try {
      await redis.set("sipa_tickets", tickets);
    } catch (err) {
      console.error("❌ Gagal menyimpan ke Upstash Redis:", err);
    }
  }
}

// GET: Dipanggil oleh Dashboard Admin untuk mengambil semua tiket pengaduan
export async function GET() {
  try {
    const tickets = await getTicketsFromCloud();

    return NextResponse.json(
      {
        success: true,
        data: tickets,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error GET /api/tickets:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}

// POST: Dipanggil saat ada pengaduan baru (Dengan De-duplikasi Konten & Integrasi Cloud)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const inputNama = body.namaPelapor || body.nama || "-";
    const inputWa = body.noWhatsapp || body.wa || "-";
    const inputRincian = body.rincian || body.rincianKeluhan || "-";
    const inputSekolah = body.asalSekolah || body.sekolah || "-";

    // 1. Ambil Tiket dari Database Cloud
    let currentTickets = await getTicketsFromCloud();

    // 2. CEK DE-DUPLIKASI KONTEN (Pencegahan Double-Trigger)
    const duplicateTicket = currentTickets.find(
      (t) =>
        t.namaPelapor.toLowerCase().trim() === inputNama.toLowerCase().trim() &&
        t.noWhatsapp.trim() === inputWa.trim() &&
        t.asalSekolah.toLowerCase().trim() === inputSekolah.toLowerCase().trim() &&
        t.rincian.trim() === inputRincian.trim()
    );

    let finalId = body.id;

    if (duplicateTicket) {
      finalId = duplicateTicket.id; // Pakai ID lama jika duplikat
    } else if (!finalId || !finalId.startsWith("TK-")) {
      const nextNum = currentTickets.length + 1;
      finalId = `TK-${nextNum < 10 ? `00${nextNum}` : nextNum < 100 ? `0${nextNum}` : nextNum}`;
    }

    const newTicket: TicketData = {
      id: finalId,
      namaPelapor: inputNama,
      nikPelapor: body.nikPelapor || body.nik || duplicateTicket?.nikPelapor || "-",
      noWhatsapp: inputWa,
      asalSekolah: inputSekolah,
      npsn: body.npsn || duplicateTicket?.npsn || "-",
      kategori: body.kategori || body.kategoriKendala || duplicateTicket?.kategori || "-",
      rincian: inputRincian,
      fotoKeluhan: body.fotoKeluhan || body.lampiran || duplicateTicket?.fotoKeluhan || undefined,
      status: body.status || duplicateTicket?.status || "PENDING",
      buktiPerbaikan: body.buktiPerbaikan || duplicateTicket?.buktiPerbaikan || undefined,
      createdAt: body.createdAt || duplicateTicket?.createdAt || new Date().toLocaleDateString("id-ID"),
    };

    // 3. Update atau Tambahkan Tiket
    const existingIndex = currentTickets.findIndex((t) => t.id === newTicket.id);

    if (existingIndex !== -1) {
      currentTickets[existingIndex] = {
        ...currentTickets[existingIndex],
        ...newTicket,
      };
    } else {
      currentTickets.unshift(newTicket);
    }

    // 4. Simpan Permanen ke Upstash Redis Cloud
    await saveTicketsToCloud(currentTickets);

    return NextResponse.json({
      success: true,
      message: "Pengaduan berhasil tersimpan permanen di cloud server!",
      data: newTicket,
    });
  } catch (error) {
    console.error("❌ Error POST /api/tickets:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan pengaduan ke server." },
      { status: 500 }
    );
  }
}

// PUT: Dipanggil saat Admin mengunggah bukti perbaikan
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, buktiPerbaikan } = body;

    let currentTickets = await getTicketsFromCloud();

    currentTickets = currentTickets.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status: status || "RESOLVED",
          buktiPerbaikan: buktiPerbaikan || t.buktiPerbaikan,
        };
      }
      return t;
    });

    await saveTicketsToCloud(currentTickets);

    return NextResponse.json({
      success: true,
      message: "Status tiket & bukti perbaikan berhasil diperbarui secara permanen!",
      data: currentTickets,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui status tiket." },
      { status: 500 }
    );
  }
}

// DELETE: Dipanggil oleh Admin untuk RESET TOTAL SELURUH DATA
export async function DELETE() {
  await saveTicketsToCloud([]);
  return NextResponse.json({
    success: true,
    message: "Seluruh data pengaduan berhasil dibersihkan dari server!",
    data: [],
  });
}