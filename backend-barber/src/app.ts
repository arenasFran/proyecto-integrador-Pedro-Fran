import express from "express";
<<<<<<< HEAD
import cors from "cors";
=======
import helmet from "helmet";
>>>>>>> 8eefbfb6df44754e7a5baf43217cb085047dce85
import rateLimit from "express-rate-limit";
import authRoutes from "./modules/auth/routes/auth.routes";

const app = express();
<<<<<<< HEAD

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

=======
>>>>>>> 8eefbfb6df44754e7a5baf43217cb085047dce85
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos, esperá 15 minutos" },
});

app.use(express.json());
app.use(helmet()); // ← acá
app.use("/auth", authLimiter, authRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
