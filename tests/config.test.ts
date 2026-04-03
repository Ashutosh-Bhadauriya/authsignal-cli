import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We test the config logic by importing the raw functions
// but we need to mock the config path. Instead, test the logic directly.
import {
  REGIONS,
  getBaseUrl,
} from "../src/config.js";

describe("config", () => {
  describe("REGIONS", () => {
    it("has all four regions", () => {
      expect(Object.keys(REGIONS)).toEqual(["us", "au", "eu", "ca"]);
    });

    it("US region points to api.authsignal.com", () => {
      expect(REGIONS.us).toBe("https://api.authsignal.com");
    });

    it("AU region points to au.api.authsignal.com", () => {
      expect(REGIONS.au).toBe("https://au.api.authsignal.com");
    });

    it("EU region points to eu.api.authsignal.com", () => {
      expect(REGIONS.eu).toBe("https://eu.api.authsignal.com");
    });

    it("CA region points to ca.api.authsignal.com", () => {
      expect(REGIONS.ca).toBe("https://ca.api.authsignal.com");
    });
  });

  describe("getBaseUrl", () => {
    it("returns correct URL for valid region", () => {
      expect(getBaseUrl("us")).toBe("https://api.authsignal.com");
      expect(getBaseUrl("au")).toBe("https://au.api.authsignal.com");
    });

    it("throws for unknown region", () => {
      expect(() => getBaseUrl("invalid")).toThrow('Unknown region "invalid"');
    });

    it("error message includes valid regions", () => {
      expect(() => getBaseUrl("xx")).toThrow("us, au, eu, ca");
    });
  });
});
