"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"code" | "password">("code");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const finish = (r: { user: { role: string } }) => router.push(r.user.role === "CUSTOMER" ? "/" : "/beheer");

  return (
    <div className="grid gap-10 py-10 lg:grid-cols-[1fr_380px] lg:gap-16">
      <div>
        <div className="page-head pt-0">
          <div className="eyebrow">Zakelijk account</div>
          <h1 className="h1">{mode === "code" ? "Inloggen met e-mailcode." : "Inloggen als medewerker."}</h1>
        </div>
        {mode === "code" ? (
          <>
            <p className="lead">Geen wachtwoord nodig. Vul je e-mailadres in, je ontvangt een eenmalige code en je bent ingelogd. Gebruik het e-mailadres waarmee je het zakelijke account hebt aangevraagd.</p>
            {step === "email" ? (
              <form className="form mt-6 max-w-md" onSubmit={(e) => { e.preventDefault(); go(async () => { const r = await api<{ message: string }>("/auth/request-code", { method: "POST", body: JSON.stringify({ email }) }); setMsg(r.message); setStep("code"); }); }}>
                <label>E-mailadres<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                {error && <div className="notice bad">{error}</div>}
                <div className="flex flex-wrap items-center gap-4"><button className="btn" disabled={busy}><span>Code aanvragen</span><span>→</span></button><small className="text-wt-mute">Nog geen account? <Link href="/aanvragen" className="underline">Aanvragen</Link></small></div>
              </form>
            ) : (
              <form className="form mt-6 max-w-md" onSubmit={(e) => { e.preventDefault(); go(async () => finish(await api("/auth/verify-code", { method: "POST", body: JSON.stringify({ email, code }) }))); }}>
                {msg && <div className="notice soft">{msg}</div>}
                <label>Code uit de e-mail<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="mono tracking-[0.3em] text-xl" /></label>
                {error && <div className="notice bad">{error}</div>}
                <div className="flex flex-wrap items-center gap-4"><button className="btn" disabled={busy || code.length !== 6}><span>Inloggen</span><span>→</span></button><button type="button" className="text-sm text-wt-mute underline" onClick={() => { setStep("email"); setCode(""); setMsg(null); }}>Ander e-mailadres of nieuwe code</button></div>
              </form>
            )}
          </>
        ) : (
          <form className="form mt-6 max-w-md" onSubmit={(e) => { e.preventDefault(); go(async () => finish(await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }))); }}>
            <label>E-mailadres<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Wachtwoord<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {error && <div className="notice bad">{error}</div>}
            <div><button className="btn" disabled={busy}><span>Inloggen</span><span>→</span></button></div>
          </form>
        )}
        <p className="mt-8 text-[13px] text-wt-mute">
          {mode === "code" ? <>Medewerker van WicoTreats? <button className="underline" onClick={() => { setMode("password"); setError(null); }}>Inloggen met wachtwoord</button></> : <><button className="underline" onClick={() => { setMode("code"); setError(null); }}>Terug naar inloggen met e-mailcode</button></>}
        </p>
      </div>
      <aside className="h-fit rounded-[2px] bg-wt-soft p-7">
        <h2 className="text-2xl">Nog geen zakelijk account?</h2>
        <p className="mt-3 text-[14.5px]">Aanvragen duurt twee minuten. We controleren KvK en BTW-nummer en keuren binnen één werkdag goed. Daarna: netto-prijzen ex BTW, bestellen per karton, snelbestellen en facturen met batch en THT in je account.</p>
        <div className="mt-6 flex flex-wrap gap-2.5"><Link className="btn" href="/aanvragen"><span>Account aanvragen</span><span>→</span></Link></div>
        <p className="mt-6 text-[13px]">Consument? Onze snacks voor thuis vind je bij <a href="https://bruunpets.com" className="underline">BRUUN</a>.</p>
      </aside>
    </div>
  );
}
