import { NextResponse } from "next/server";

export interface TicketData {
  id: string;
  namaPelapor: string;
  noWhatsapp: string;
  asalSekolah: string;
  npsn: string;
  kategori: string;
  rincian: string;
  status: "PENDING" | "RESOLVED";
  buktiPerbaikan?: string;
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

// POST: Dipanggil saat ada pengaduan baru (Nomor Tiket Urut Otomatis)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Penomoran Urut Otomatis: TK-001, TK-002, TK-003, dst.
    const nextNum = globalTickets.length + 1;
    const autoId = `TK-${nextNum < 10 ? `00${nextNum}` : nextNum < 100 ? `0${nextNum}` : nextNum}`;

    const newTicket: TicketData = {
      id: body.id && body.id.startsWith("TK-") ? body.id : autoId,
      namaPelapor: body.namaPelapor || body.nama || "-",
      noWhatsapp: body.noWhatsapp || body.wa || "-",
      asalSekolah: body.asalSekolah || body.sekolah || "-",
      npsn: body.npsn || "-",
      kategori: body.kategori || body.kategoriKendala || "-",
      rincian: body.rincian || body.rincianKeluhan || "-",
      status: body.status || "PENDING",
      buktiPerbaikan: body.buktiPerbaikan || undefined,
      createdAt: body.createdAt || new Date().toLocaleDateString("id-ID"),
    };

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