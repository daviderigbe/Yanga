const DEFAULT_API_BASE = "https://afrab-dev-api-v1.onrender.com";

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  DEFAULT_API_BASE
).replace(/\/$/, "");

const TOKEN_KEY = "afrab_token";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T = any>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (opts.body && !(opts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

export function queryString(params: Record<string, unknown> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function unwrapItems<T>(data: { data?: { items?: T[] } | T[] } | undefined): T[] {
  const value = data?.data;
  if (Array.isArray(value)) return value;
  return value?.items ?? [];
}

export function unwrapData<T>(data: { data?: T } | undefined): T | undefined {
  return data?.data;
}

export const formatNGN = (v: number | string) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
};

export const discountedPrice = (base: number | string, discount?: number) => {
  const b = typeof base === "string" ? parseFloat(base) : base;
  if (!discount) return b;
  return b - (b * discount) / 100;
};

// ---- Types ----
export interface ProductImage {
  id: string;
  url: string;
  order: number;
}
export interface Seller {
  id: string;
  name: string;
  userName?: string;
  avatarUrl?: string;
}
export interface Product {
  id: string;
  title: string;
  description: string;
  basePrice: string | number;
  discountPercent?: number;
  status: string;
  condition: string;
  size?: string;
  gender?: string;
  color?: string;
  images: ProductImage[];
  seller: Seller;
  isLiked?: boolean;
  isNew?: boolean;
  categories?: { category: { id: string; name: string } }[];
  brand?: { id: string; name: string } | null;
}
export interface ApiResp<T> {
  status: string;
  message: string;
  data: T;
}
export interface Paged<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
}
