// Supabase-Zugangsdaten. Der "anon"/"publishable"-Key ist bewusst oeffentlich
// (so bei Supabase vorgesehen) — die Absicherung passiert ueber Row Level Security.
// NIE den "service_role"-Key hier eintragen!
export const SUPABASE_URL = 'https://ruxjfznugisdrusjhrvz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_XtL4aBMxgkXwkIMif8UIuw_CSoWup6w';

// Cloudflare Turnstile (Bot-Schutz). Leer lassen, wenn in Supabase kein
// Captcha aktiv ist. Ist ein Key gesetzt, muss beim Login ein Token mitgehen.
export const TURNSTILE_SITE_KEY = '0x4AAAAAADvieMRGJTY8O1qN';
