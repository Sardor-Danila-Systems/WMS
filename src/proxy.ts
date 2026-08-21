import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Оптимистичная защита маршрутов: проверяем только наличие cookie сессии,
 * без обращения к базе — proxy выполняется на каждый запрос, включая
 * предзагрузку страниц. Настоящая проверка прав живёт в `requireUser`
 * и в каждом server action, ближе к данным.
 */
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.nextUrl);
    // Запоминаем, куда пользователь шёл, чтобы вернуть его туда после входа.
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
