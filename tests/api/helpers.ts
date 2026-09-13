import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../../server';

let server: Server | null = null;
let baseUrl = '';

/** Поднимает Express-приложение на свободном порту (без vite-мидлвари). */
export async function startApi(): Promise<string> {
  if (server) return baseUrl;
  server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1');
    s.once('listening', () => resolve(s));
    s.once('error', reject);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  return baseUrl;
}

export async function stopApi(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = null;
  baseUrl = '';
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Обёртка над fetch: возвращает статус и разобранное тело. */
export async function api<T = any>(
  method: Method,
  route: string,
  body?: unknown
): Promise<{ status: number; body: T }> {
  const res = await fetch(baseUrl + route, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* оставляем как текст */
  }
  return { status: res.status, body: parsed };
}
