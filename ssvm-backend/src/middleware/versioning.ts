import { Request, Response, NextFunction } from "express";

/**
 * Middleware to mark an API endpoint as deprecated.
 * Attaches the X-API-Deprecated header and optionally a Link to the new version.
 */
export const deprecated = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Deprecation", "true");
  
  const sunsetDate = new Date();
  sunsetDate.setMonth(sunsetDate.getMonth() + 6);
  res.setHeader("Sunset", sunsetDate.toUTCString());

  const originalUrl = req.originalUrl;
  if (originalUrl.startsWith("/api/") && !originalUrl.startsWith("/api/v1/")) {
    const newUrl = originalUrl.replace("/api/", "/api/v1/");
    res.setHeader("Link", `<${req.protocol}://${req.get("host")}${newUrl}>; rel="successor-version"`);
  }

  next();
};
