export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
    location.href = "/login";
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? (data.errors ? data.errors.join("\n") : `Fout ${res.status}`));
  return data as T;
}

export type Variant = {
  id: string; sku: string; title: string; ean: string | null; caseSize: number; orderInCase: boolean;
  stock: number; retailPrice: number; vatRate: number; price: number | null; tiers: { minQty: number; price: number }[];
};
export type Product = { id: string; handle: string; title: string; animal: string | null; tags: string[]; imageUrl: string | null; variants: Variant[] };
export type OrderLine = { id: string; sku: string; title: string; qty: number; unitPriceExVat: string; lineTotalExVat: string };
export type Order = { id: string; number: number; reference: string | null; status: string; subtotalExVat: string; shippingExVat: string; vatTotal: string; totalIncVat: string; createdAt: string; lines: OrderLine[] };

export const eur = (n: number | string) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n));
export const STATUS_NL: Record<string, string> = { RECEIVED: "Ontvangen", PROCESSING: "In behandeling", SHIPPED: "Verzonden", INVOICED: "Gefactureerd", CANCELLED: "Geannuleerd" };
