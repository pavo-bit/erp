import client from "prom-client";
import { Request, Response, NextFunction } from "express";

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "ssvm-backend",
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Create a custom histogram for HTTP request durations
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "code"],
  // buckets for response time from 0.1ms to 1s
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000],
});

// Register the histogram
register.registerMetric(httpRequestDurationMicroseconds);

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;

    // Record metrics
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
  });

  next();
};

export const getMetrics = async (req: Request, res: Response) => {
  res.setHeader("Content-Type", register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
};
