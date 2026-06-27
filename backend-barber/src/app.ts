import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { buildAppointmentRouter } from "./wiring/appointment";
import { buildAuthRouter } from "./wiring/auth";
import { buildBarberRouter, buildServiceRouter, buildTempLockRouter, buildUserRouter } from "./wiring";
import { createAnalyticsRouter } from "./interface-adapters/routes/analytics.routes";
import { createAuthenticate } from "./interface-adapters/middlewares/auth.middleware";
import { buildTokenService } from "./wiring/auth";
import { getConfig } from "./infrastructure/config/env";

const app = express();
const config = getConfig();

app.use(express.json());
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
  })
);

app.use(
  cors({
    origin: config.corsOrigin.split(",").map((o) => o.trim()),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

const registerLimiter = rateLimit({
  windowMs: config.rateLimit.register.windowMs,
  max: config.rateLimit.register.max,
  message: { error: "Demasiados registros, esperá 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: config.rateLimit.reset.windowMs,
  max: config.rateLimit.reset.max,
  message: { error: "Demasiadas solicitudes de reset, esperá 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

const twoFALimiter = rateLimit({
  windowMs: config.rateLimit.twoFA.windowMs,
  max: config.rateLimit.twoFA.max,
  message: { error: "Demasiados códigos 2FA solicitados, esperá 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

const googleLimiter = rateLimit({
  windowMs: config.rateLimit.google.windowMs,
  max: config.rateLimit.google.max,
  message: { error: "Demasiados intentos con Google, esperá 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiadas solicitudes de refresh, esperá 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/auth/register", registerLimiter);
app.use("/auth/refresh", refreshLimiter);
app.use("/auth/request-reset", resetLimiter);
app.use("/auth/reset-password", resetLimiter);
app.use("/auth/2fa/send", twoFALimiter);
app.use("/auth/2fa/verify", twoFALimiter);
app.use("/auth/google", googleLimiter);
app.use("/auth/google/complete-profile", googleLimiter);

app.use("/auth", buildAuthRouter());
app.use("/api/barbers", buildBarberRouter());
app.use("/api/services", buildServiceRouter());
app.use("/api/appointments", buildAppointmentRouter());
app.use("/api/appointments/temp-lock", buildTempLockRouter());
app.use("/api/users", buildUserRouter());
const tokenService = buildTokenService();
const analyticsAuth = createAuthenticate(tokenService);
app.use("/api/analytics", createAnalyticsRouter(analyticsAuth));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error no manejado:", err instanceof Error ? err.message : err);
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
