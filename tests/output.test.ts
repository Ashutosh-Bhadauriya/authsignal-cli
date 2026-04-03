import { describe, it, expect, vi, beforeEach } from "vitest";
import { printDryRun } from "../src/output.js";
import { ApiError } from "../src/client.js";

describe("output", () => {
  describe("printDryRun", () => {
    it("outputs dry-run message to stderr", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      printDryRun("delete user", { userId: "user123" });
      const output = spy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("[dry-run]");
      expect(output).toContain("delete user");
      expect(output).toContain("userId");
      expect(output).toContain("user123");
      expect(output).toContain("No changes made");
      spy.mockRestore();
    });
  });
});
