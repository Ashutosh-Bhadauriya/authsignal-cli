import { describe, it, expect } from "vitest";
import { ApiError } from "../src/client.js";

describe("ApiError", () => {
  it("formats error message with method, path, and status", () => {
    const err = new ApiError(404, { error: "not found" }, "GET", "/users/123");
    expect(err.message).toBe("GET /users/123 failed (404): not found");
    expect(err.statusCode).toBe(404);
    expect(err.method).toBe("GET");
    expect(err.path).toBe("/users/123");
  });

  it("extracts error field from body object", () => {
    const err = new ApiError(400, { error: "invalid_request", errorDescription: "bad" }, "POST", "/test");
    expect(err.message).toContain("invalid_request");
  });

  it("handles string body", () => {
    const err = new ApiError(500, "Internal Server Error", "GET", "/test");
    expect(err.message).toContain("Internal Server Error");
  });

  it("handles non-string non-object body", () => {
    const err = new ApiError(500, null, "GET", "/test");
    expect(err.message).toContain("null");
  });

  describe("contextual hints", () => {
    it("adds API key hint for 401", () => {
      const err = new ApiError(401, { error: "unauthorized" }, "GET", "/users");
      expect(err.hint).toContain("API key");
      expect(err.hint).toContain("authsignal config set api-key");
    });

    it("adds session token hint for 401 on session endpoints", () => {
      const err = new ApiError(401, { error: "unauthorized" }, "POST", "/sessions/validate");
      expect(err.hint).toContain("session token");
      expect(err.hint).not.toContain("API key");
    });

    it("adds permission hint for 403", () => {
      const err = new ApiError(403, { error: "forbidden" }, "GET", "/test");
      expect(err.hint).toContain("permission");
    });

    it("adds not found hint for 404", () => {
      const err = new ApiError(404, { error: "not found" }, "GET", "/test");
      expect(err.hint).toContain("not found");
    });

    it("adds rate limit hint for 429", () => {
      const err = new ApiError(429, { error: "rate limited" }, "GET", "/test");
      expect(err.hint).toContain("Rate limit");
    });

    it("adds priority hint for 400 with priority error", () => {
      const err = new ApiError(400, {
        error: "invalid_request",
        errorDescription: "There is already another rule with priority: 1",
      }, "POST", "/rules");
      expect(err.hint).toContain("unique priority");
    });

    it("adds verification method hint for 400 with method error", () => {
      const err = new ApiError(400, {
        error: "invalid_request",
        errorDescription: "EMAIL_OTP is not an enabled verification method",
      }, "POST", "/action-configurations");
      expect(err.hint).toContain("authenticator-configs list");
    });
  });
});
