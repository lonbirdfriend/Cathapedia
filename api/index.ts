import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server/app";
export default function handler(req: IncomingMessage, res: ServerResponse) {
  // The explicit rewrite keeps all nested API routes on one Vercel function.
  const url = new URL(req.url || "/", "https://cathapedia.local");
  const route = url.searchParams.get("route");
  if (route !== null) {
    url.searchParams.delete("route");
    req.url = "/api/" + route + (url.search ? url.search : "");
  }
  app(req, res);
}
