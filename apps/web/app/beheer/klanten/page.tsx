"use client";
import { useEffect, useState } from "react";
import { api, date } from "@/lib/api";

type Company = { id: string; name: string; kvkNumber: string | null; vatNumber: string | null; email: string; phone: string | null; status: string; shipCountry: string; shipCity: string | null; paymentTermDays: number; prepaidOrders: number; vatValidated: boolean; vatCheckNote: string | null; locale: string | null; createdAt: string; _count: { orders: number } };
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
      <h1 className="h1 text-4xl">Klanten</h1>
      <p className="text-sm text-wt-muted">Aanvragen goedkeuren, btw-nummer controleren (EU-klanten krijgen dan btw verlegd) en betaalafspraken instellen.</p>
      {msg && <p className="mt-3 rounded bg-wt-cream px-3 py-2 text-sm">{msg}</p>}
      <div className="mt-6 space-y-3">
        {(rows ?? []).map((c) => (
          <div key={c.id} className="rounded-lg border border-wt-sand bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{c.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "ACTIVE" ? "bg-emerald-50 text-green-800" : c.status === "PENDING" ? "bg-wt-honey/30 text-wt-rust" : "bg-red-50 text-red-700"}`}>{STATUS[c.status]}</span>
              <span className="text-wt-muted">{c.shipCity}, {c.shipCountry} · {c.email}{c.phone && ` · ${c.phone}`}</span>
              <span className="ml-auto text-wt-muted">{c._count.orders} orders · sinds {date(c.createdAt)}</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-wt-muted">Btw / KvK</div>
                <div>{c.vatNumber ?? "–"}{c.kvkNumber && <span className="text-wt-muted"> · KvK {c.kvkNumber}</span>}</div>
                <div className={`text-xs ${c.vatValidated ? "text-green-700" : "text-wt-muted"}`}>{c.vatValidated ? "✓ gecontroleerd" : "niet gecontroleerd"}{c.vatCheckNote && ` · ${c.vatCheckNote}`}</div>
                {c.shipCountry !== "NL" && c.vatNumber && (
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => vies(c.id)} className="btn ghost sm">Check bij VIES</button>
                    <button onClick={() => patch(c.id, { vatValidated: !c.vatValidated })} className="btn ghost sm">{c.vatValidated ? "Intrekken" : "Handmatig goedkeuren"}</button>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase text-wt-muted">Betaling</div>
                <label className="block">Vooruitbetalen bij eerste <input type="number" min={0} defaultValue={c.prepaidOrders} onBlur={(e) => Number(e.target.value) !== c.prepaidOrders && patch(c.id, { prepaidOrders: Number(e.target.value) })} className="mx-1 w-14 rounded border border-wt-sand px-1" /> orders</label>
                <label className="block">Taal mails/documenten <select defaultValue={c.locale ?? ""} onChange={(e) => patch(c.id, { locale: e.target.value || null })} className="mx-1 rounded border border-wt-sand px-1"><option value="">Automatisch ({["NL", "BE"].includes(c.shipCountry) ? "NL" : "EN"})</option><option value="nl">NL</option><option value="en">EN</option></select></label>
                <label className="block">Daarna <input type="number" min={0} defaultValue={c.paymentTermDays} onBlur={(e) => Number(e.target.value) !== c.paymentTermDays && patch(c.id, { paymentTermDays: Number(e.target.value) })} className="mx-1 w-14 rounded border border-wt-sand px-1" /> dagen</label>
              </div>
              <div className="flex items-start gap-2">
                {c.status !== "ACTIVE" && <button onClick={() => patch(c.id, { status: "ACTIVE" })} className="btn sm">Goedkeuren / activeren</button>}
                {c.status === "ACTIVE" && <button onClick={() => patch(c.id, { status: "BLOCKED" })} className="btn danger sm">Blokkeren</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
