import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomInt, randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type JwtUser } from "../lib/auth.js";
import { sendMail } from "../lib/mail.js";
import { loginCode, registrationReceived } from "../emails/templates.js";

const COOKIE = "wt_session";
const CODE_TTL_MIN = 10;

export const COMPANY_TYPES = ["Dierenspeciaalzaak", "Groothandel / distributeur", "Online retailer / webshop", "Private-label merk", "Trimsalon, fokker, pension of hondenschool", "Anders"];

async function startSession(app: FastifyInstance, reply: any, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { company: true } });
  if (user.role === "CUSTOMER" && user.company?.status !== "ACTIVE") {
    return reply.code(403).send({ error: user.company?.status === "PENDING" ? "Je aanvraag wacht op goedkeuring. Je krijgt binnen één werkdag bericht per e-mail." : "Dit account is geblokkeerd. Neem contact op via info@wicotreats.com." });
  }
  const payload: JwtUser = { sub: user.id, role: user.role, companyId: user.companyId, name: user.name, email: user.email };
  const token = app.jwt.sign(payload, { expiresIn: "12h" });
  reply.setCookie(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  return { user: payload, company: user.company ? { id: user.company.id, name: user.company.name } : null };
}

export async function authRoutes(app: FastifyInstance) {
  // Stap 1 van inloggen met e-mailcode: code aanvragen. Antwoord is altijd neutraal (geen e-mailadressen lekken).
  app.post("/auth/request-code", async (req) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { company: true } });
    if (user) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      await prisma.loginCode.create({ data: { email: user.email, code, expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60000) } });
      const mail = loginCode({ email: user.email, name: user.company?.name ?? user.name, shipCountry: user.company?.shipCountry ?? "NL", locale: user.company?.locale }, code, CODE_TTL_MIN);
      await sendMail(mail);
      if (process.env.NODE_ENV !== "production") app.log.info({ email: user.email, code }, "inlogcode (dev)");
    }
    return { ok: true, message: `Als dit e-mailadres bij ons bekend is, ontvang je binnen een minuut een code. De code is ${CODE_TTL_MIN} minuten geldig.` };
  });

  // Stap 2: code controleren en sessie starten.
  app.post("/auth/verify-code", async (req, reply) => {
    const { email, code } = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) }).parse(req.body);
    const row = await prisma.loginCode.findFirst({ where: { email: email.toLowerCase(), code, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
    if (!row) return reply.code(401).send({ error: "Onjuiste of verlopen code. Vraag een nieuwe code aan." });
    await prisma.loginCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    return startSession(app, reply, user.id);
  });

  // Inloggen met wachtwoord (medewerkers/beheer, en als terugvaloptie).
  app.post("/auth/login", async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "Onjuiste e-mail of wachtwoord" });
    }
    return startSession(app, reply, user.id);
  });

  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (req) => {
    const company = req.user.companyId
      ? await prisma.company.findUnique({ where: { id: req.user.companyId }, include: { _count: { select: { orders: true } } } })
      : null;
    return { user: req.user, company };
  });

  app.get("/auth/company-types", async () => COMPANY_TYPES);

  // Dealer-aanvraag (geen wachtwoord: inloggen gaat met e-mailcode). Bedrijf komt op PENDING; beheer keurt goed.
  app.post("/auth/register", async (req, reply) => {
    const body = z
      .object({
        companyName: z.string().min(2),
        companyType: z.string().min(2),
        kvkNumber: z.string().min(4).optional().or(z.literal("")),
        vatNumber: z.string().optional().or(z.literal("")),
        website: z.string().optional(),
        contactName: z.string().min(2),
        phone: z.string().min(6),
        email: z.string().email(),
        street: z.string().min(2),
        postcode: z.string().min(4),
        city: z.string().min(2),
        country: z.string().length(2).default("NL"),
        howFound: z.string().optional(),
        note: z.string().max(2000).optional(),
        acceptTerms: z.literal(true, { errorMap: () => ({ message: "Ga akkoord met de handelsvoorwaarden" }) }),
      })
      .superRefine((v, ctx) => {
        if (v.country.toUpperCase() !== "NL" && !v.vatNumber) ctx.addIssue({ code: "custom", path: ["vatNumber"], message: "Buiten Nederland is een btw-nummer verplicht" });
        if (v.country.toUpperCase() === "NL" && !v.kvkNumber) ctx.addIssue({ code: "custom", path: ["kvkNumber"], message: "KvK-nummer is verplicht" });
      })
      .parse(req.body);

    const email = body.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) return reply.code(409).send({ error: "Er bestaat al een account met dit e-mailadres. Log in met een e-mailcode." });

    const company = await prisma.company.create({
      data: {
        name: body.companyName,
        companyType: body.companyType,
        kvkNumber: body.kvkNumber || null,
        vatNumber: body.vatNumber || null,
        website: body.website || null,
        email,
        phone: body.phone,
        howFound: body.howFound || null,
        requestNote: body.note || null,
        invoiceStreet: body.street,
        invoicePostcode: body.postcode,
        invoiceCity: body.city,
        invoiceCountry: body.country.toUpperCase(),
        shipStreet: body.street,
        shipPostcode: body.postcode,
        shipCity: body.city,
        shipCountry: body.country.toUpperCase(),
        users: { create: { email, name: body.contactName, passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10) } },
      },
    });
    registrationReceived(company).then(async (m) => { await sendMail(m.dealer); await sendMail(m.internal); }).catch((e) => app.log.error({ err: e }, "aanvraagmail mislukt"));
    return reply.code(201).send({ companyId: company.id, status: company.status, message: `Aanvraag ontvangen. We controleren je gegevens en sturen binnen één werkdag een e-mail naar ${email}.` });
  });
}

export const SESSION_COOKIE = COOKIE;
