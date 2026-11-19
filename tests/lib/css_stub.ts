/** Round 10: lets the in-process tests import components that import a .css file (Next handles those in the real build). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ext = (require as unknown as { extensions: Record<string, (m: unknown, f: string) => void> }).extensions;
if (ext && !ext['.css']) ext['.css'] = () => {};
export {};
