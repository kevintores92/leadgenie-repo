import { Request, Response, NextFunction } from "express";

export function requireUploadToken(req: Request, res: Response, next: NextFunction) {
  const token = process.env.UPLOAD_TOKEN;
  if (!token) return res.status(500).send({ ok: false, error: "upload token not configured" });
  const auth = req.header("authorization") || req.query.token || "";
  const match = auth.replace(/^Bearer\s+/i, "");
  if (match !== token) return res.status(401).send({ ok: false, error: "unauthorized" });
  next();
}
