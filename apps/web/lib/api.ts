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

export type Role = "ADMIN" | "STAFF" | "CUSTOMER";
export type Company = {
  id: string; name: string; email: string; phone: string | null; kvkNumber: string | null; vatNumber: string | null; companyType: string | null; website: string | null;
  status: string; shipStreet: string | null; shipPostcode: string | null; shipCity: string | null; shipCountry: string; invoiceStreet: string | null; invoicePostcode: string | null; invoiceCity: string | null; invoiceCountry: string;
  vatValidated: boolean; vatCheckNote: string | null; paymentTermDays: number; prepaidOrders: number; locale: string | null; createdAt: string; _count?: { orders: number };
};
export type Me = { user: { sub: string; name: string; role: Role; email: string }; company: Company | null };

export type Variant = {
  id: string; sku: string; title: string; unitType: "PACK" | "BULK"; packContent: string | null; ean: string | null; caseSize: number; orderInCase: boolean;
  stock: number; analysis: string | null; nextBatch: { batchNumber: string; bestBefore: string } | null; retailPrice: number | null; vatRate: number; price: number | null; tiers: { minQty: number; price: number }[];
};
export type Product = { id: string; handle: string; title: string; animal: string | null; tags: string[]; imageUrl: string | null; variants: Variant[] };
export type LineBatch = { qty: number; batch: { id?: string; batchNumber: string; bestBefore: string; analysis?: string | null } };
export type OrderLine = { id: string; sku: string; title: string; qty: number; unitPriceExVat: string; vatRate: string; lineTotalExVat: string; batches: LineBatch[] };
export type Order = {
  id: string; number: number; reference: string | null; note: string | null; status: string; vatScheme: string; paymentTerms: string; paymentStatus: string; paidAt: string | null; dueDate: string | null;
  trackingCode: string | null; trackingUrl: string | null; shippedAt: string | null; invoiceNumber: string | null;
  subtotalExVat: string; shippingExVat: string; vatTotal: string; totalIncVat: string; createdAt: string;
  shipStreet: string | null; shipPostcode: string | null; shipCity: string | null; shipCountry: string;
  lines: OrderLine[]; company?: { id: string; name: string; email: string; phone: string | null; vatNumber: string | null; shipCountry: string };
};
export type Quote = {
  subtotalExVat: number; shippingExVat: number; vatTotal: number; totalIncVat: number; vatScheme: string; vatSchemeLabel: string; paymentTerms: string; paymentTermDays: number;
  minOrderExVat: number; freeShippingExVat: number; errors: string[]; lines: { variantId: string; unitPriceExVat: number; lineTotalExVat: number }[];
};

export const eur = (n: number | string) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n));
export const date = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString("nl-NL") : "–");
export const STATUS_NL: Record<string, string> = { RECEIVED: "Ontvangen", PROCESSING: "In behandeling", SHIPPED: "Verzonden", INVOICED: "Gefactureerd", CANCELLED: "Geannuleerd" };
export const PAYMENT_NL: Record<string, string> = { PREPAID: "Vooruitbetaling", ON_ACCOUNT: "Op rekening" };
export const VAT_NL: Record<string, string> = { NL_VAT: "NL btw", EU_REVERSE_CHARGE: "Btw verlegd", EXPORT: "0% export" };
export const UNIT_NL: Record<string, string> = { PACK: "Verpakking", BULK: "Bulk" };
export const paymentTermsText = (c: { prepaidOrders: number; paymentTermDays: number }, paidOrders = 0) =>
  c.prepaidOrders > paidOrders ? `eerste ${c.prepaidOrders === 1 ? "order" : `${c.prepaidOrders} orders`} vooruit, daarna ${c.paymentTermDays} dagen op rekening` : `${c.paymentTermDays} dagen op rekening`;
