import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
