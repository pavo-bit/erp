import express from "express";
import request from "supertest";
import {
  getCurrentSchoolId,
  getSchoolContext,
  schoolContextMiddleware,
  setAuthenticatedSchoolContext,
} from "../../middleware/school-context.middleware";

function createApp() {
  const app = express();
  app.use(schoolContextMiddleware);
  app.get("/school/:schoolId", async (req, res) => {
    // Models the point where authenticate() has verified and loaded the user.
    setAuthenticatedSchoolContext({
      id: `user-${req.params.schoolId}`,
      schoolId: req.params.schoolId,
      role: "ERP_ADMIN",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    res.json({ schoolId: getCurrentSchoolId(), userId: getSchoolContext()?.userId });
  });
  app.get("/super-admin", (_req, res) => {
    setAuthenticatedSchoolContext({ id: "root", schoolId: null, role: "SUPER_ADMIN" });
    res.json({ schoolId: getCurrentSchoolId(), role: getSchoolContext()?.role });
  });
  return app;
}

describe("authenticated school context", () => {
  it("replaces the provisional null context with the verified school identity", async () => {
    const app = createApp();
    await request(app)
      .get("/school/school-a")
      .expect(200)
      .expect({ schoolId: "school-a", userId: "user-school-a" });
  });

  it("keeps concurrent request tenants isolated", async () => {
    const app = createApp();
    const [schoolA, schoolB] = await Promise.all([
      request(app).get("/school/school-a"),
      request(app).get("/school/school-b"),
    ]);

    expect(schoolA.body).toEqual({ schoolId: "school-a", userId: "user-school-a" });
    expect(schoolB.body).toEqual({ schoolId: "school-b", userId: "user-school-b" });
  });

  it("preserves explicit super-admin context semantics", async () => {
    await request(createApp())
      .get("/super-admin")
      .expect(200)
      .expect({ schoolId: null, role: "SUPER_ADMIN" });
  });
});
