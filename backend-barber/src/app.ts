import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { buildAuthRouter } from "./wiring/auth";

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos, esperá 15 minutos" },
});

app.use(express.json());
app.use(helmet());
app.use("/auth", authLimiter, buildAuthRouter());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
