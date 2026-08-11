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

// Memory Storage Terpusat di Server Vercel Backend
let globalTickets: TicketData[] = [];

// GET: Dipanggil oleh Dashboard Admin untuk mengambil semua tiket pengaduan
export async function GET() {
  return NextResponse.json({
    success: true,
    data: globalTickets,
  });
}

// POST: Dipanggil oleh Form Publik untuk mengirim pengaduan baru
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newTicket: TicketData = {
      id: body.id || `TK-00${globalTickets.length + 1}`,
      namaPelapor: body.namaPelapor || body.nama || "-",
      noWhatsapp: body.noWhatsapp || body.wa || "-",
      asalSekolah: body.asalSekolah || body.sekolah || "-",
      npsn: body.npsn || "-",
      kategori: body.kategori || body.kategoriKendala || "-",
      rincian: body.rincian || body.rincianKeluhan || "-",
      status: body.status || "PENDING",
      createdAt: body.createdAt || new Date().toLocaleDateString("id-ID"),
    };

    // Simpan ke memori server global
    globalTickets.unshift(newTicket);

    return NextResponse.json({
      success: true,
      message: "Pengaduan berhasil tersimpan di server!",
      data: newTicket,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan pengaduan ke server." },
      { status: 500 }
    );
  }
}

// PUT: Dipanggil oleh Admin Dinas saat menyelesaikan tiket & mengunggah bukti
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
      message: "Status tiket berhasil diperbarui di server!",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui status tiket." },
      { status: 500 }
    );
  }
}