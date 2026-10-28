// Vercel Function: GET /api/resume?t=<company token>&a=<application id>
// Checks that the application belongs to the company behind the private link,
// then redirects to a 10-minute signed URL for the resume in the private bucket.
// Uses the service key that the Vercel ↔ Supabase integration provides; it never
// reaches the browser.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvogrxgqddabtckoinbo.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

function headers(): Record<string, string> {
  const h: Record<string, string> = { apikey: SERVICE_KEY, 'Content-Type': 'application/json' };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys go in apikey only.
  if (SERVICE_KEY.startsWith('ey')) h.Authorization = `Bearer ${SERVICE_KEY}`;
  return h;
}

function text(status: number, body: string) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  if (!SERVICE_KEY) return text(500, 'Resume links are not configured on the server.');
  const url = new URL(request.url);
  const token = url.searchParams.get('t') || '';
  const app = url.searchParams.get('a') || '';
  if (token.length < 24 || !/^[0-9a-f-]{36}$/i.test(app)) return text(400, 'Bad resume link.');

  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/company_resume_path`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_token: token, p_application: app }),
  });
  if (!rpc.ok) return text(502, 'Could not check this link.');
  const path = (await rpc.json()) as string | null;
  if (!path) return text(404, 'This resume is not available on this company link.');

  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const sign = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/resumes/${encoded}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ expiresIn: 600 }),
  });
  if (!sign.ok) return text(502, 'Could not open the resume.');
  const { signedURL } = (await sign.json()) as { signedURL: string };
  return new Response(null, {
    status: 302,
    headers: { Location: `${SUPABASE_URL}/storage/v1${signedURL}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
