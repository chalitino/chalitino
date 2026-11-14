"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/");
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Inloggen</h1>
      <p className="mt-1 text-sm text-stone-600">Alleen voor zakelijke klanten van WicoTreats.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        <label className="block text-sm">E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm">Wachtwoord
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border border-stone-300 px-3 py-2" />
        </label>
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50">{busy ? "Bezig…" : "Inloggen"}</button>
      </form>
      <p className="mt-4 text-sm text-stone-600">Nog geen account? <Link href="/aanvragen" className="text-amber-800 underline">Dealeraccount aanvragen</Link></p>
    </div>
  );
}
