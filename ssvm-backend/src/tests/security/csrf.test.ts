import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { csrfProtection, injectCsrfToken } from "../../middleware/csrf";

function createApp() {
  const app = express();
  app.use(cookieParser());
  app.use(csrfProtection);
  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return injectCsrfToken(req, res, next);
    next();
  });
  app.get("/token", (_req, res) => res.status(200).json({ ok: true }));
  app.post("/change", (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe("CSRF protection", () => {
  it("rejects cookie-authenticated state changes without a token", async () => {
    const client = request.agent(createApp());
    await client.get("/token").expect(200);
    await client.post("/change").expect(403);
  });

  it("rejects an invalid token and accepts the token issued on a safe request", async () => {
    const client = request.agent(createApp());
    const tokenResponse = await client.get("/token").expect(200);
    const token = tokenResponse.headers["x-csrf-token"] as string;

    await client.post("/change").set("X-CSRF-Token", "invalid-token").expect(403);
    await client.post("/change").set("X-CSRF-Token", token).expect(200);
  });

  it("rejects state changes from an unapproved browser origin", async () => {
    const client = request.agent(createApp());
    await client.get("/token").expect(200);
    await client.post("/change").set("Cookie", "access_token=fake").set("Origin", "https://attacker.example").expect(403);
  });
});
