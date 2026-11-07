// Minimal typings for the few Node APIs the scripts use. @types/node is not a dependency (DECISIONS.md: no new deps).
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string): void;
}
declare module 'node:path' {
  export function resolve(...parts: string[]): string;
  export function dirname(p: string): string;
}
declare module 'node:url' {
  export function fileURLToPath(url: string): string;
}
declare const process: { argv: string[]; env: Record<string, string | undefined>; exit(code?: number): never };
