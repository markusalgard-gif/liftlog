/** Where Google should send the user after sign-in. Must match a URL
 *  allow-listed in Supabase Auth → URL Configuration. */
export function authRedirectUrl(origin: string, base: string): string {
  const path = base.endsWith('/') ? base : `${base}/`
  const root = origin.endsWith('/') ? origin : `${origin}/`
  return new URL(path, root).toString()
}
