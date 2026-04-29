import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import authRoutes from "./auth/routes/auth.routes";


dotenv.config();

const app = express();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos, esperá 15 minutos' }
})

app.use(express.json());
app.use("/auth", authLimiter, authRoutes);


app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;