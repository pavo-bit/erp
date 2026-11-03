import request from "supertest";
import { createTestApp } from "./helpers/testApp";
const app = createTestApp();

describe("Auth Routes", () => {
  it("should fail login with invalid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent@school.com",
        password: "wrongpassword"
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // More tests would be added here depending on db seeding
});
