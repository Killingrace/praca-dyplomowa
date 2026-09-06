// Backend URL is taken from the VITE_BACKEND_URL env var (see .env).
// If it is empty, requests stay relative and rely on the Vite dev proxy.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${BACKEND_URL}${path}`;
}

export function wsUrl(path: string): string {
  if (BACKEND_URL) {
    return `${BACKEND_URL.replace(/^http/, 'ws')}${path}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || '127.0.0.1:8000';
  return `${protocol}//${host}${path}`;
}
