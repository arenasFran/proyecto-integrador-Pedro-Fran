import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { buildAppointmentRouter } from "./wiring/appointment";
import { buildAuthRouter } from "./wiring/auth";
import { buildBarberRouter } from "./wiring/barber";
import { buildServiceRouter } from "./wiring/service";
import { buildTempLockRouter } from "./wiring/tempLock";
import { getConfig } from "./infrastructure/config/env";

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(helmet());

const config = getConfig();

const loginLimiter = rateLimit({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  message: { error: "Demasiados intentos de login, esperá 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

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

app.use("/auth", buildAuthRouter());
app.use("/api/barbers", buildBarberRouter());
app.use("/api/services", buildServiceRouter());
app.use("/api/appointments", buildAppointmentRouter());
app.use("/api/appointments/temp-lock", buildTempLockRouter());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
