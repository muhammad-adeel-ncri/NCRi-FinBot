const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  ip: string,
  limit = 10,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetInSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetInSeconds: Math.ceil((entry.resetAt - now) / 1000) };
}
