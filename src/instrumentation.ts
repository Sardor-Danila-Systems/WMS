/**
 * Выполняется один раз при старте сервера.
 * Создаёт схему и, если база пустая, наполняет её демонстрационными данными —
 * чтобы система была работоспособной сразу после `npm run dev` без ручных шагов.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureSeeded } = await import("@/lib/db/seed");
  try {
    ensureSeeded();
  } catch (error) {
    console.error("[wms] Не удалось подготовить базу данных:", error);
  }
}
