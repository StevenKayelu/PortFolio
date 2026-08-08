import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import routes from "./routes/index.js";
import { getSitemap } from "./controllers/sitemap.controller.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/uploads", express.static(process.env.UPLOAD_DIR || "./src/uploads"));

// Lives at the bare root (not /api/v1) so it can be fetched directly,
// or proxied to from the frontend's own domain — see frontend/vercel.json.
app.get("/sitemap.xml", getSitemap);

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
