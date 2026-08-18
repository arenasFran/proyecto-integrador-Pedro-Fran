import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { buildAppointmentRouter } from "./wiring/appointment";
import { buildAuthRouter } from "./wiring/auth";
import { buildBarberRouter, buildMembershipRouter, buildServiceRouter, buildTempLockRouter, buildUploadRouter, buildUserRouter, buildPaymentRouter, buildProductRouter, buildOrderRouter, buildClientRouter } from "./wiring";
import { buildAnalisisCorteRouter } from "./wiring/analisisCorte";
import { buildCartRouter } from "./wiring/cart";
import { ReportsController } from "./interface-adapters/controllers/reports/ReportsController";
import { createReportsRouter } from "./interface-adapters/routes/reports.routes";
import { ExportOrdersCsvUseCase } from "./application/use-cases/reports/ExportOrdersCsvUseCase";
import { ExportSalesCsvUseCase } from "./application/use-cases/reports/ExportSalesCsvUseCase";
import { ExportProductsCsvUseCase } from "./application/use-cases/reports/ExportProductsCsvUseCase";
import { ExportMembershipsCsvUseCase } from "./application/use-cases/reports/ExportMembershipsCsvUseCase";
import { createAnalyticsRouter } from "./interface-adapters/routes/analytics.routes";
import { createAuthenticate } from "./interface-adapters/middlewares/auth.middleware";
import { buildTokenService } from "./wiring/auth";
import { getConfig } from "./infrastructure/config/env";
import { buildTelegramRouter } from "./wiring/telegram";
import { sendError } from "./common/response";
import { AppError } from "./domain/errors/AppError";

const app = express();
app.set('trust proxy', 1);
const config = getConfig();
const corsOrigins = config.corsOrigin
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: corsOrigins,
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
app.use("/auth/verify-reset-code", resetLimiter);
app.use("/auth/reset-password", resetLimiter);
app.use("/auth/2fa/send", twoFALimiter);
app.use("/auth/2fa/verify", twoFALimiter);
app.use("/auth/google", googleLimiter);
app.use("/auth/google/complete-profile", googleLimiter);

const globalApiLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  message: { error: 'Demasiadas solicitudes. Esperá un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalApiLimiter);

app.use("/auth", buildAuthRouter());
app.use("/api/barbers", buildBarberRouter());
const tokenService = buildTokenService();
const serviceAuth = createAuthenticate(tokenService);
app.use("/api/services", buildServiceRouter({ authenticate: serviceAuth }));
app.use("/api/appointments", buildAppointmentRouter());
app.use("/api/appointments/temp-lock", buildTempLockRouter());
app.use("/api/users", buildUserRouter());
app.use("/api/clients", buildClientRouter());
app.use("/api/upload", buildUploadRouter());
const analyticsAuth = createAuthenticate(tokenService);
app.use("/api/analytics", createAnalyticsRouter(analyticsAuth));
app.use("/api/memberships", buildMembershipRouter());
app.use("/api/payments", buildPaymentRouter());
app.use("/api/products", buildProductRouter());
app.use("/api/orders", buildOrderRouter());
app.use("/api/cart", buildCartRouter());
app.use("/api/analisis-corte", buildAnalisisCorteRouter());
const reportsController = new ReportsController(
  new ExportOrdersCsvUseCase(),
  new ExportSalesCsvUseCase(),
  new ExportProductsCsvUseCase(),
  new ExportMembershipsCsvUseCase(),
);
const reportsAuth = createAuthenticate(tokenService);
app.use("/api/reports", createReportsRouter({ reportsController, authenticate: reportsAuth }));
const telegramAuth = createAuthenticate(tokenService);
app.use("/api/telegram", buildTelegramRouter({ authenticate: telegramAuth }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export const errorHandler = (
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  if (err instanceof AppError) {
    return sendError(res, err, "Error interno del servidor");
  }
  console.error("Error no manejado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
};

app.use(errorHandler);

export default app;
