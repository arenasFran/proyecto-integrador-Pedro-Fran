import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no definido");

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }

    const user = decoded as JwtPayload;
    req.user = { username: user.username, _id: user.id };
    next();
  });
};