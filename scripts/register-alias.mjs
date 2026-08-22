/**
 * Позволяет запускать серверные модули проекта обычным `node`, а не только
 * через сборщик Next.js: превращает алиас `@/...` из tsconfig в путь до `src/...`
 * и дописывает расширение, как это делает бандлер.
 * Node 26 сам снимает типы с .ts-файлов, поэтому отдельный компилятор не нужен.
 */
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const srcDir = path.resolve(import.meta.dirname, "..", "src");
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

function resolveFile(basePath) {
  if (existsSync(basePath) && path.extname(basePath)) return basePath;
  for (const ext of EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (existsSync(candidate)) return candidate;
  }
  for (const ext of EXTENSIONS) {
    const candidate = path.join(basePath, `index${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return basePath;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const resolved = resolveFile(path.join(srcDir, specifier.slice(2)));
      return nextResolve(pathToFileURL(resolved).href, context);
    }
    // Относительные импорты внутри нашего кода идут без расширения — дописываем его.
    // Пакеты из node_modules трогать нельзя: у них своя схема разрешения (CommonJS),
    // и подмена пути ломает их внутренние require.
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:") &&
      !context.parentURL.includes("/node_modules/")
    ) {
      const parentDir = path.dirname(new URL(context.parentURL).pathname);
      const candidate = resolveFile(path.resolve(parentDir, specifier));
      if (existsSync(candidate) && candidate.startsWith(path.dirname(srcDir))) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
