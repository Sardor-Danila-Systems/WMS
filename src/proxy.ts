import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Оптимистичная защита маршрутов: проверяем только наличие cookie сессии,
 * без обращения к базе — proxy выполняется на каждый запрос, включая
 * предзагрузку страниц. Настоящая проверка прав живёт в `requireUser`
 * и в каждом server action, ближе к данным.
 *
 * Обратной переадресации «есть cookie → на дашборд» здесь намеренно нет.
 * Proxy не может проверить, жива ли сессия, а слой приложения может — и если
 * они расходятся (сессия истекла, пароль сменили, базу пересоздали), возникает
 * бесконечный цикл: proxy шлёт на дашборд, дашборд шлёт обратно на вход.
 * Решение о том, что пользователь уже вошёл, принимает страница входа,
 * у которой есть доступ к базе.
 */
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublic) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const loginUrl = new URL("/login", request.nextUrl);
    // Запоминаем, куда пользователь шёл, чтобы вернуть его туда после входа.
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
