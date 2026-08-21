import type { ReactNode } from "react";

/**
 * Короткое появление контента при переходе между разделами.
 * Реализовано на CSS: анимация не требует состояния, поэтому страница
 * остаётся серверной и не тянет за собой библиотеку анимаций.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-in fade-in duration-200">{children}</div>;
}
