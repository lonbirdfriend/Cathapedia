import { createServer } from "node:http";
import { app } from "./app";
import { serveStatic } from "./static";
export function log(message: string) { console.log(message); }
const httpServer = createServer(app);
(async () => {
  if (process.env.NODE_ENV === "production") serveStatic(app);
  else { const {setupVite} = await import("./vite"); await setupVite(httpServer,app); }
  httpServer.listen({port:Number(process.env.PORT || 5000),host:"0.0.0.0"}, () => log("Cathapedia läuft auf Port " + (process.env.PORT || 5000)));
})();
