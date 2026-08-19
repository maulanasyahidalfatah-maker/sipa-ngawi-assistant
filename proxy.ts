import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Bebaskan akses HANYA untuk /login, endpoint API, dan aset statis Next.js
  const isPublicPath =
    path === "/login" ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.includes(".") ||
    path === "/favicon.ico";

  // Cek Cookie Sesi Pengguna
  const sessionCookie = request.cookies.get("sipa_user_session")?.value;

  // 1. JIKA BELUM LOGIN: Paksa redirect pengguna ke gerbang /login
  if (!isPublicPath && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. JIKA SUDAH LOGIN & MEMBUKA /login: Lempar otomatis sesuai role
  if (path === "/login" && sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie);
      if (session.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.redirect(new URL("/", request.url));
    } catch {
      // Jika cookie corrupt, izinkan lanjut
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};