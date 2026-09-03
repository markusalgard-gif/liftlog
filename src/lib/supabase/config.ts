/** True only when both Vite env values are non-empty after trim. */
export function isSupabaseConfigured(
  url: string | undefined,
  anonKey: string | undefined,
): boolean {
  return Boolean(url?.trim() && anonKey?.trim())
}
