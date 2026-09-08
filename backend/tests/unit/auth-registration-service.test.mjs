import assert from "node:assert/strict";
import {
  normalizeRoleValue,
  roleMatchesExpected,
  resolveExpectedRole,
} from "../../services/auth/authRoles.js";
import { hashOtp, normalizeEmail } from "../../services/auth/authEmailOtpService.js";

const run = async () => {
  assert.equal(normalizeEmail("  Test@Example.COM "), "test@example.com");
  assert.equal(resolveExpectedRole("student"), "Student");
  assert.equal(resolveExpectedRole("company"), "CompanyAdmin");
  assert.equal(resolveExpectedRole("trainer"), "Trainer");
  assert.equal(roleMatchesExpected("Student", "student"), true);
  assert.equal(roleMatchesExpected("CompanyAdmin", "company"), true);
  assert.equal(roleMatchesExpected("Trainer", "student"), false);
  assert.equal(normalizeRoleValue("Company"), "CompanyAdmin");

  const raw = "123456";
  const hashed = hashOtp(raw);
  assert.equal(hashed, hashOtp("123456"));
  assert.notEqual(hashed, hashOtp("654321"));

  console.log("PASS auth registration service unit checks");
};

run().catch((error) => {
  console.error("FAIL auth registration service unit checks");
  console.error(error);
  process.exit(1);
});
