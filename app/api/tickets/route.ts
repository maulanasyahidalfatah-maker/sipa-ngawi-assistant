import { NextResponse } from "next/server";

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

// Memory Storage Terpusat di Server
let globalTickets: TicketData[] = [];

// GET: Dipanggil oleh Dashboard Admin untuk mengambil semua tiket pengaduan
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: globalTickets,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    }
  );
}

// POST: Dipanggil saat ada pengaduan baru (Dengan Proteksi Anti-Tiket Ganda)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const inputNama = body.namaPelapor || body.nama || "-";
    const inputWa = body.noWhatsapp || body.wa || "-";
    const inputRincian = body.rincian || body.rincianKeluhan || "-";
    const inputSekolah = body.asalSekolah || body.sekolah || "-";

    // 1. CEK DE-DUPLIKASI KONTEN (Pencegahan Double-Trigger dari Client/Server)
    // Jika ada tiket dengan Nama + No WA + Sekolah + Rincian yang persis sama, pakai ID tiket tersebut!
    const duplicateTicket = globalTickets.find(
      (t) =>
        t.namaPelapor.toLowerCase().trim() === inputNama.toLowerCase().trim() &&
        t.noWhatsapp.trim() === inputWa.trim() &&
        t.asalSekolah.toLowerCase().trim() === inputSekolah.toLowerCase().trim() &&
        t.rincian.trim() === inputRincian.trim()
    );

    let finalId = body.id;

    if (duplicateTicket) {
      finalId = duplicateTicket.id; // Gunakan ID lama agar tidak membuat TK-002
    } else if (!finalId || !finalId.startsWith("TK-")) {
      const nextNum = globalTickets.length + 1;
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

    // 2. SIMPAN / UPDATE DENGAN DEDUPLIKASI ID TIKET
    const existingIndex = globalTickets.findIndex((t) => t.id === newTicket.id);

    if (existingIndex !== -1) {
      globalTickets[existingIndex] = {
        ...globalTickets[existingIndex],
        ...newTicket,
      };
    } else {
      globalTickets.unshift(newTicket);
    }

    return NextResponse.json({
      success: true,
      message: "Pengaduan berhasil tersimpan permanen!",
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

    globalTickets = globalTickets.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status: status || "RESOLVED",
          buktiPerbaikan: buktiPerbaikan || t.buktiPerbaikan,
        };
      }
      return t;
    });

    return NextResponse.json({
      success: true,
      message: "Status tiket & bukti perbaikan berhasil diperbarui!",
      data: globalTickets,
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
  globalTickets = []; // KOSONGKAN TOTAL MEMORI SERVER
  return NextResponse.json({
    success: true,
    message: "Seluruh data pengaduan berhasil dibersihkan dari server!",
    data: [],
  });
}