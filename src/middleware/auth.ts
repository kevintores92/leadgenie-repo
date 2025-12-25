import { Request, Response, NextFunction } from "express";

export function requireUploadToken(req: Request, res: Response, next: NextFunction) {
  const token = process.env.UPLOAD_TOKEN;
  if (!token) return res.status(500).send({ ok: false, error: "upload token not configured" });
  const header = req.header("authorization");
  const qtoken = (req.query as any)?.token;
  let auth = "";
  if (typeof header === "string") auth = header;
  else if (typeof qtoken === "string") auth = qtoken;
  else if (Array.isArray(qtoken) && qtoken.length) auth = String(qtoken[0]);

  const match = String(auth).replace(/^Bearer\s+/i, "");
  if (match !== token) return res.status(401).send({ ok: false, error: "unauthorized" });
  next();
}
