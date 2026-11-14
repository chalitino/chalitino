import type { FastifyReply, FastifyRequest } from "fastify";

export type JwtUser = { sub: string; role: "ADMIN" | "CUSTOMER"; companyId: string | null; name: string; email: string };

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Niet ingelogd" });
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (req.user.role !== "ADMIN") return reply.code(403).send({ error: "Alleen voor beheerders" });
}

export async function requireActiveCustomer(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (req.user.role !== "CUSTOMER" || !req.user.companyId) {
    return reply.code(403).send({ error: "Alleen voor zakelijke klanten" });
  }
}
