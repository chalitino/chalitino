import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type JwtUser } from "../lib/auth.js";

const COOKIE = "wt_session";

export async function authRoutes(app: FastifyInstance) {
  // Inloggen
  app.post("/auth/login", async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() }, include: { company: true } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "Onjuiste e-mail of wachtwoord" });
    }
    if (user.role === "CUSTOMER" && user.company?.status !== "ACTIVE") {
      return reply.code(403).send({ error: "Uw account is nog niet goedgekeurd. We nemen contact met u op." });
    }
    const payload: JwtUser = { sub: user.id, role: user.role, companyId: user.companyId, name: user.name, email: user.email };
    const token = app.jwt.sign(payload, { expiresIn: "12h" });
    reply.setCookie(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
    return { user: payload, company: user.company ? { id: user.company.id, name: user.company.name } : null };
  });

  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (req) => {
    const company = req.user.companyId
      ? await prisma.company.findUnique({ where: { id: req.user.companyId }, select: { id: true, name: true, status: true, paymentTermDays: true } })
      : null;
    return { user: req.user, company };
  });

  // Dealer-aanvraag: maakt bedrijf (PENDING) + gebruiker aan; admin keurt goed.
  app.post("/auth/register", async (req, reply) => {
    const body = z
      .object({
        companyName: z.string().min(2),
        kvkNumber: z.string().min(8).max(8).optional(),
        vatNumber: z.string().optional(),
        contactName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        password: z.string().min(8),
        street: z.string().min(2),
        postcode: z.string().min(4),
        city: z.string().min(2),
        country: z.string().length(2).default("NL"),
      })
      .parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) return reply.code(409).send({ error: "Er bestaat al een account met dit e-mailadres" });

    const company = await prisma.company.create({
      data: {
        name: body.companyName,
        kvkNumber: body.kvkNumber,
        vatNumber: body.vatNumber,
        email: body.email.toLowerCase(),
        phone: body.phone,
        invoiceStreet: body.street,
        invoicePostcode: body.postcode,
        invoiceCity: body.city,
        invoiceCountry: body.country,
        shipStreet: body.street,
        shipPostcode: body.postcode,
        shipCity: body.city,
        shipCountry: body.country,
        users: {
          create: { email: body.email.toLowerCase(), name: body.contactName, passwordHash: await bcrypt.hash(body.password, 10) },
        },
      },
    });
    return reply.code(201).send({ companyId: company.id, status: company.status, message: "Aanvraag ontvangen. We beoordelen uw aanvraag en nemen contact op." });
  });
}

export const SESSION_COOKIE = COOKIE;
