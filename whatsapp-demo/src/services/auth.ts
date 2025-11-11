const AUTH_URL_ENV = import.meta.env.VITE_AUTH_API_URL;
const AUTH_ENDPOINT = '/auth/token/refresh';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

const sanitizeUrl = (raw?: string): string | null => {
  if (!raw || !raw.trim()) {
    return null;
  }

  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
};

const authApiBase = sanitizeUrl(AUTH_URL_ENV);

interface AuthResponse {
  access_token?: string;
  expires_in?: number;
}

const isTokenValid = (): boolean => {
  if (!cachedToken) return false;
  return tokenExpiresAt > Date.now() + 5_000;
};

export const clearCachedAccessToken = (): void => {
  cachedToken = null;
  tokenExpiresAt = 0;
};

export const fetchAccessToken = async (): Promise<string> => {
  if (isTokenValid()) {
    return cachedToken as string;
  }

  if (!authApiBase) {
    throw new Error('Auth API no configurada');
  }

  const response = await fetch(`${authApiBase}${AUTH_ENDPOINT}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Auth API respondió ${response.status}`);
  }

  let data: AuthResponse;
  try {
    data = (await response.json()) as AuthResponse;
  } catch {
    throw new Error('Respuesta inválida de Auth API');
  }

  if (!data?.access_token) {
    throw new Error('Auth API no entregó access_token');
  }

  cachedToken = data.access_token;
  const ttl = typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : 55 * 60;
  tokenExpiresAt = Date.now() + ttl * 1000;

  return cachedToken;
};

