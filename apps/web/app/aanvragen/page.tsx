"use client";
import { useState } from "react";
import { api } from "@/lib/api";

const fields: [string, string, string?][] = [
  ["companyName", "Bedrijfsnaam"], ["kvkNumber", "KvK-nummer"], ["vatNumber", "Btw-nummer"],
  ["contactName", "Contactpersoon"], ["email", "E-mail", "email"], ["phone", "Telefoon"],
  ["street", "Straat + huisnummer"], ["postcode", "Postcode"], ["city", "Plaats"], ["password", "Wachtwoord (min. 8 tekens)", "password"],
];

export default function RegisterPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const r = await api<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify(form) });
      setDone(r.message);
    } catch (err) { setError((err as Error).message); }
  }

  if (done) return <div className="mx-auto max-w-md rounded-lg border border-green-200 bg-green-50 p-6 text-green-900">{done}</div>;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Dealeraccount aanvragen</h1>
      <p className="mt-1 text-sm text-stone-600">Na goedkeuring ontvang je toegang tot het assortiment met jouw inkoopprijzen.</p>
      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-6">
        {fields.map(([name, label, type]) => (
          <label key={name} className="block text-sm">{label}
            <input type={type ?? "text"} required={!["vatNumber", "phone", "kvkNumber"].includes(name)} value={form[name] ?? ""} onChange={(e) => setForm({ ...form, [name]: e.target.value })} className="mt-1 w-full rounded border border-stone-300 px-3 py-2" />
          </label>
        ))}
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">{error}</p>}
        <button className="rounded bg-amber-700 py-2 font-medium text-white hover:bg-amber-800">Aanvraag versturen</button>
      </form>
    </div>
  );
}
