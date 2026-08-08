import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import routes from "./routes/index.js";
import { getSitemap } from "./controllers/sitemap.controller.js";
import {
  notFoundHandler,
  errorHandler,
} from "./middleware/error.middleware.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(helmet());

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

      return callback(
        new Error(`CORS blocked origin: ${origin}`)
      );
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

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
