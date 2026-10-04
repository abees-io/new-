import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (
        /^\/api\/(create-order|verify-payment|order-status|payment-webhook)$/.test(
          pathname,
        )
      ) {
        const handler = await import(`.${pathname}.js`);
        await handler.default(req, res);
        return;
      }
      const file = path.resolve(
        root,
        "." +
          (pathname === "/"
            ? "/index.html"
            : pathname === "/admin"
              ? "/admin.html"
              : pathname === "/admin/orders"
                ? "/orders.html"
                : pathname),
      );
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      const types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".png": "image/png",
      };
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(Number(process.env.PORT) || 4173, "127.0.0.1", () =>
    console.log("MIROKU preview server running"),
  );
