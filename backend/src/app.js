import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import routes from "./routes/index.js";
import { getSitemap, getRobots } from "./controllers/sitemap.controller.js";
import {
  notFoundHandler,
  errorHandler,
} from "./middleware/error.middleware.js";

const app = express();

// CLIENT_URLS is a comma-separated list, e.g.
// "https://stevenkayelu.online,https://devegenventures.com"; CLIENT_URL is
// still honoured for existing deployments.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || "").split(","),
]
  .map((o) => o?.trim())
  .filter(Boolean);

// Behind Render/Nginx the client IP arrives in X-Forwarded-For. Without
// this, every visitor shares the proxy's IP and rate limits become global.
app.set("trust proxy", process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : process.env.NODE_ENV === "production" ? 1 : false);

app.use(helmet());
app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin
      // e.g. Postman/server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Refuse without throwing, so a disallowed origin gets a normal
      // response without CORS headers instead of a 500.
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(compression());

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan(
    process.env.NODE_ENV === "production"
      ? "combined"
      : "dev"
  )
);

app.use(
  "/uploads",
  express.static(
    process.env.UPLOAD_DIR || "./src/uploads"
  )
);

app.get("/sitemap.xml", getSitemap);
app.get("/robots.txt", getRobots);

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
