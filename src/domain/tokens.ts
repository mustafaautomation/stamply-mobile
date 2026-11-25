const TOKEN = /^stmp_[a-z0-9_]+$/i;

export function isStampToken(value: string): boolean {
  return TOKEN.test(value);
}

export function isUserToken(token: string): boolean {
  return token.toLowerCase().startsWith('stmp_user_');
}

export function customerQrUrl(token: string): string {
  const kind = isUserToken(token) ? 'u' : 'c';
  return `https://stamply-app.quvantic.com/${kind}/${token}`;
}

export function parseCustomerCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (TOKEN.test(trimmed)) return trimmed;

  const normalized = trimmed.replace(/^stamply:\/\//i, 'https://stamply-app.quvantic.com/');
  try {
    const url = new URL(normalized.includes('://') ? normalized : `https://stamply-app.quvantic.com/${trimmed.replace(/^\//, '')}`);
    const parts = url.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
    const marker = parts.findIndex((part) => part === 'c' || part === 'u');
    const token = marker >= 0 ? parts[marker + 1] : parts[parts.length - 1];
    if (token && TOKEN.test(token)) return token;
  } catch {
    return null;
  }
  return null;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
