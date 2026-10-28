require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDatabase = require("./config/database");
const authRoutes = require("./routes/auth");
const courseRoutes = require("./routes/courses");
const enquiryRoutes = require("./routes/enquiries");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admins");

const app = express();
const configuredOrigins = new Set(
  (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim()),
);
app.use(
  cors((request, callback) => {
    const requestOrigin = request.get("Origin");
    const requestHost = request.get("Host");
    let isSameOrigin = false;
    try {
      isSameOrigin = Boolean(
        requestOrigin && new URL(requestOrigin).host === requestHost,
      );
    } catch {}

    callback(null, {
      origin(origin, originCallback) {
        const isLocalDevelopmentOrigin =
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");
        if (
          !origin ||
          configuredOrigins.has(origin) ||
          isLocalDevelopmentOrigin ||
          isSameOrigin
        ) {
          return originCallback(null, true);
        }
        return originCallback(
          new Error(
            `Website origin "${origin}" is not allowed by the API. Add it to CLIENT_ORIGIN in .env, then restart the server.`,
          ),
        );
      },
    });
  }),
);
app.use(express.json({ limit: "100kb" }));
app.get("/api/health", (_request, response) =>
  response.json({ status: "ok", service: "admission-system-api" }),
);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api", (request, response) =>
  response
    .status(404)
    .json({ message: `Route not found: ${request.method} ${request.path}` }),
);
app.use((error, _request, response, _next) => {
  console.error(error);
  response
    .status(error.status || 500)
    .json({
      message: error.status
        ? error.message
        : "Something went wrong on the server.",
    });
});

const port = Number(process.env.PORT) || 5000;
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
app.use(express.static(frontendDist));
app.get("*", (_request, response) =>
  response.sendFile(path.join(frontendDist, "index.html")),
);

connectDatabase()
  .then(() =>
    app.listen(port, () =>
      console.log(`Admission API running at http://localhost:${port}`),
    ),
  )
  .catch((error) => {
    console.error("Could not connect to MongoDB:", error.message);
    process.exitCode = 1;
  });
