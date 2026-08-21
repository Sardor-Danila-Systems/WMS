/** Единый формат ответа server action для форм. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; field?: string };
