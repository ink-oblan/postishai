import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password", () => {
  it("hashes a password and verifies it", async () => {
    const hash = await hashPassword("mypassword1");
    expect(hash).not.toBe("mypassword1");
    expect(await verifyPassword("mypassword1", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("mypassword1");
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("produces different hashes for the same password (salt)", async () => {
    const hash1 = await hashPassword("mypassword1");
    const hash2 = await hashPassword("mypassword1");
    expect(hash1).not.toBe(hash2);
  });
});
