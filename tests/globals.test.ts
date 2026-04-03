import { describe, it, expect, afterEach } from "vitest";
import { isCI, isNoColor, isInteractive } from "../src/globals.js";

describe("globals", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    process.env = { ...originalEnv };
  });

  describe("isCI", () => {
    it("returns false when no CI env vars are set", () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.CIRCLECI;
      delete process.env.BUILDKITE;
      delete process.env.CODESPACES;
      delete process.env.TF_BUILD;
      expect(isCI()).toBe(false);
    });

    it("detects CI=true", () => {
      process.env.CI = "true";
      expect(isCI()).toBe(true);
    });

    it("detects GITHUB_ACTIONS", () => {
      process.env.GITHUB_ACTIONS = "true";
      expect(isCI()).toBe(true);
    });

    it("detects GITLAB_CI", () => {
      process.env.GITLAB_CI = "true";
      expect(isCI()).toBe(true);
    });

    it("detects BUILDKITE", () => {
      process.env.BUILDKITE = "true";
      expect(isCI()).toBe(true);
    });
  });

  describe("isNoColor", () => {
    it("returns false when NO_COLOR is not set", () => {
      delete process.env.NO_COLOR;
      const origTerm = process.env.TERM;
      process.env.TERM = "xterm-256color";
      expect(isNoColor()).toBe(false);
      process.env.TERM = origTerm;
    });

    it("returns true when NO_COLOR is set", () => {
      process.env.NO_COLOR = "1";
      expect(isNoColor()).toBe(true);
    });

    it("returns true when NO_COLOR is empty string", () => {
      process.env.NO_COLOR = "";
      expect(isNoColor()).toBe(true);
    });

    it("returns true when TERM is dumb", () => {
      delete process.env.NO_COLOR;
      process.env.TERM = "dumb";
      expect(isNoColor()).toBe(true);
    });
  });
});
