// Verzenden van e-mail. Provider via MAIL_PROVIDER:
//   console (standaard in dev): logt en schrijft de HTML naar MAIL_OUTBOX_DIR (handig om te bekijken)
//   resend:  HTTP-API van Resend (RESEND_API_KEY)
//   smtp:    eigen mailserver via nodemailer (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Mail = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string };

const provider = process.env.MAIL_PROVIDER ?? "console";
const from = process.env.MAIL_FROM ?? "WicoTreats B2B <noreply@wicotreats.com>";

export async function sendMail(mail: Mail): Promise<{ ok: boolean; id?: string; error?: string }> {
  const to = Array.isArray(mail.to) ? mail.to : [mail.to];
  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject: mail.subject, html: mail.html, text: mail.text, reply_to: mail.replyTo }),
      });
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: j?.message ?? `Resend ${res.status}` };
      return { ok: true, id: j.id };
    }
    if (provider === "smtp") {
      const nodemailer = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      const info = await transport.sendMail({ from, to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: mail.replyTo });
      return { ok: true, id: info.messageId };
    }
    // console / outbox
    const dir = process.env.MAIL_OUTBOX_DIR;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      const name = `${Date.now()}-${mail.subject.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
      writeFileSync(join(dir, name), `<!-- to: ${to.join(", ")} -->\n${mail.html}`);
    }
    console.log(`[mail:console] → ${to.join(", ")} | ${mail.subject}`);
    return { ok: true, id: "console" };
  } catch (e: any) {
    console.error("[mail] verzenden mislukt:", e?.message ?? e);
    return { ok: false, error: e?.message ?? String(e) };
  }
}
