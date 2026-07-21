"use client";

import { useEffect, useState } from "react";

/** Короткая имитация загрузки для skeleton-состояний в демо (данные локальные и уже готовы). */
export function useLoadingDelay(ms = 400): boolean {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), ms);
    return () => clearTimeout(timer);
  }, [ms]);

  return isLoading;
}
