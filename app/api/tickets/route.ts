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

// Global Memory Store Terpusat di Server
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

// POST: Dipanggil oleh Form Publik untuk mengirim pengaduan baru atau mengembalikan backup
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newTicket: TicketData = {
      id: body.id || `TK-${Date.now().toString().slice(-5)}`,
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

    // Cegah duplikasi ID yang sama
    const existingIndex = globalTickets.findIndex((t) => t.id === newTicket.id);
    if (existingIndex !== -1) {
      // Jika tiket sudah ada, update datanya
      globalTickets[existingIndex] = {
        ...globalTickets[existingIndex],
        ...newTicket,
      };
    } else {
      // Jika tiket baru, tambahkan ke urutan paling atas
      globalTickets.unshift(newTicket);
    }

    return NextResponse.json({
      success: true,
      message: "Pengaduan berhasil tersimpan permanen di server!",
      data: newTicket,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan pengaduan ke server." },
      { status: 500 }
    );
  }
}

// PUT: Dipanggil oleh Admin Dinas saat menyelesaikan tiket & mengunggah bukti perbaikan
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
// DELETE: Dipanggil oleh Admin untuk menghapus seluruh data pengaduan uji coba
export async function DELETE() {
  globalTickets = []; // Kosongkan memory server
  return NextResponse.json({
    success: true,
    message: "Seluruh data pengaduan berhasil dibersihkan dari server!",
    data: [],
  });
}