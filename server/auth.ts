import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
const localSecret = randomBytes(48).toString("hex");
function secret() {
  if (process.env.VERCEL && !process.env.SESSION_SECRET) throw Object.assign(new Error("SESSION_SECRET fehlt in der Serverkonfiguration."), {status:503});
  return process.env.SESSION_SECRET || localSecret;
}
export function checkPassword(password: unknown) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) throw Object.assign(new Error("ADMIN_PASSWORD fehlt in der Serverkonfiguration."), {status:503});
  if (typeof password !== "string" || password.length > 500) return false;
  const a = Buffer.from(password); const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function issueToken() {
  const body = Buffer.from(JSON.stringify({ role:"admin", exp:Date.now()+8*60*60*1000, nonce:randomBytes(12).toString("hex") })).toString("base64url");
  return `${body}.${createHmac("sha256",secret()).update(body).digest("base64url")}`;
}
export const requireAdmin: RequestHandler = (req,res,next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
  const [body, sig] = token.split(".");
  try {
    if (!body || !sig || token.length > 1000) throw new Error();
    const expected = Buffer.from(createHmac("sha256", secret()).update(body).digest("base64url"));
    const received = Buffer.from(sig);
    if (expected.length !== received.length || !timingSafeEqual(expected,received)) throw new Error();
    const payload = JSON.parse(Buffer.from(body,"base64url").toString());
    if (payload.role !== "admin" || !Number.isFinite(payload.exp) || payload.exp < Date.now()) throw new Error();
    next();
  } catch { res.status(401).json({message:"Bitte als Admin anmelden. Deine Sitzung ist möglicherweise abgelaufen."}); }
};
