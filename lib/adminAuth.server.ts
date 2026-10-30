// Guards operations that spend Anthropic tokens on demand (currently
// `?force=true` regeneration). The caller must send
// `Authorization: Bearer <ADMIN_TOKEN>`. If ADMIN_TOKEN isn't configured the
// check always fails, so forced regeneration is disabled rather than open.

const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

// Compares fixed-length digests in constant time so response timing can't
// be used to guess the token byte by byte.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length < 32) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return timingSafeEqual(match[1].trim(), expected);
}
