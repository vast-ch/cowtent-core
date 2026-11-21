/**
 * The modules of an `import.meta.glob('@content/<collection>/*\/index.md')`,
 * by id: the folder name. The glob's keys are paths, and the path depends on
 * where @content points (vite.config.mjs).
 */
export function byFolder<T>(modules: Record<string, T>): Map<string, T> {
  return new Map(
    Object.entries(modules).map(([path, module]) => [
      path.split('/').at(-2)!,
      module,
    ]),
  );
}
