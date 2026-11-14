import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { ZodError } from "zod";
import { authRoutes, SESSION_COOKIE } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { orderRoutes } from "./routes/orders.js";
import { adminRoutes, staffRoutes } from "./routes/admin.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] });
await app.register(cookie);
await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  cookie: { cookieName: SESSION_COOKIE, signed: false },
});

app.setErrorHandler((err: any, _req, reply) => {
  if (err instanceof ZodError) return reply.code(400).send({ error: "Ongeldige invoer", details: err.flatten() });
  app.log.error(err);
  reply.code(err.statusCode ?? 500).send({ error: err.message ?? "Er ging iets mis" });
});

app.get("/health", async () => ({ ok: true, service: "wicotreats-b2b-api" }));

await app.register(authRoutes);
await app.register(catalogRoutes);
await app.register(orderRoutes);
await app.register(staffRoutes);
await app.register(adminRoutes);

const port = Number(process.env.API_PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
