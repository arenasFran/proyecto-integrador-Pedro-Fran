import dotenv from "dotenv";
import express from "express";
import authRoutes from "./auth/routes/auth.routes";

dotenv.config();

const app = express();

app.use(express.json());
app.use("/auth", authRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
