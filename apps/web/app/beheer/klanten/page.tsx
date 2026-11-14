"use client";
import { useEffect, useState } from "react";
import { api, date } from "@/lib/api";

type Company = { id: string; name: string; kvkNumber: string | null; vatNumber: string | null; email: string; phone: string | null; status: string; shipCountry: string; shipCity: string | null; paymentTermDays: number; prepaidOrders: number; vatValidated: boolean; vatCheckNote: string | null; createdAt: string; _count: { orders: number } };
const STATUS: Record<string, string> = { PENDING: "Aanvraag", ACTIVE: "Actief", BLOCKED: "Geblokkeerd" };

export default function CustomersPage() {
  const [rows, setRows] = useState<Company[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => api<Company[]>("/admin/companies").then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  async function patch(id: string, data: Record<string, unknown>) {
    setMsg(null);
    try { await api(`/admin/companies/${id}`, { method: "PATCH", body: JSON.stringify(data) }); load(); } catch (e) { setMsg((e as Error).message); }
  }
  async function vies(id: string) {
    setMsg(null);
    try { const r = await api<{ valid: boolean; name?: string }>(`/admin/companies/${id}/check-vat`, { method: "POST" }); setMsg(r.valid ? `VIES: geldig${r.name ? ` (${r.name})` : ""}` : "VIES: ongeldig btw-nummer"); load(); } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Klanten</h1>
      <p className="text-sm text-stone-600">Aanvragen goedkeuren, btw-nummer controleren (EU-klanten krijgen dan btw verlegd) en betaalafspraken instellen.</p>
      {msg && <p className="mt-3 rounded bg-stone-100 px-3 py-2 text-sm">{msg}</p>}
      <div className="mt-6 space-y-3">
        {(rows ?? []).map((c) => (
          <div key={c.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{c.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "ACTIVE" ? "bg-green-50 text-green-800" : c.status === "PENDING" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>{STATUS[c.status]}</span>
              <span className="text-stone-500">{c.shipCity}, {c.shipCountry} · {c.email}{c.phone && ` · ${c.phone}`}</span>
              <span className="ml-auto text-stone-500">{c._count.orders} orders · sinds {date(c.createdAt)}</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-stone-500">Btw / KvK</div>
                <div>{c.vatNumber ?? "–"}{c.kvkNumber && <span className="text-stone-500"> · KvK {c.kvkNumber}</span>}</div>
                <div className={`text-xs ${c.vatValidated ? "text-green-700" : "text-stone-500"}`}>{c.vatValidated ? "✓ gecontroleerd" : "niet gecontroleerd"}{c.vatCheckNote && ` · ${c.vatCheckNote}`}</div>
                {c.shipCountry !== "NL" && c.vatNumber && (
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => vies(c.id)} className="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-50">Check bij VIES</button>
                    <button onClick={() => patch(c.id, { vatValidated: !c.vatValidated })} className="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-50">{c.vatValidated ? "Intrekken" : "Handmatig goedkeuren"}</button>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase text-stone-500">Betaling</div>
                <label className="block">Vooruitbetalen bij eerste <input type="number" min={0} defaultValue={c.prepaidOrders} onBlur={(e) => Number(e.target.value) !== c.prepaidOrders && patch(c.id, { prepaidOrders: Number(e.target.value) })} className="mx-1 w-14 rounded border border-stone-300 px-1" /> orders</label>
                <label className="block">Daarna <input type="number" min={0} defaultValue={c.paymentTermDays} onBlur={(e) => Number(e.target.value) !== c.paymentTermDays && patch(c.id, { paymentTermDays: Number(e.target.value) })} className="mx-1 w-14 rounded border border-stone-300 px-1" /> dagen</label>
              </div>
              <div className="flex items-start gap-2">
                {c.status !== "ACTIVE" && <button onClick={() => patch(c.id, { status: "ACTIVE" })} className="rounded bg-amber-700 px-3 py-1.5 text-white hover:bg-amber-800">Goedkeuren / activeren</button>}
                {c.status === "ACTIVE" && <button onClick={() => patch(c.id, { status: "BLOCKED" })} className="rounded border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50">Blokkeren</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
