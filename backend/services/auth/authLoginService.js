const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const { normalizeEmail } = require("./authEmailOtpService");
const { issueAuthSession } = require("./authTokenService");
const { roleMatchesExpected, normalizeRoleValue } = require("./authRoles");

const loginWithPassword = async ({
  email,
  password,
  expectedRole,
  ipAddress,
  res,
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    const err = new Error("Email and password are required");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 400;
    throw err;
  }

  if (user.isActive === false) {
    const err = new Error(
      "Your account has been deactivated. Please contact the administrator.",
    );
    err.statusCode = 403;
    err.accountDeactivated = true;
    throw err;
  }

  if (!user.password) {
    const err = new Error("Invalid credentials");
    err.statusCode = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(String(password), user.password);
  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.statusCode = 400;
    throw err;
  }

  if (expectedRole && !roleMatchesExpected(user.role, expectedRole)) {
    const err = new Error(
      "This email is not registered for the selected account type",
    );
    err.statusCode = 403;
    err.roleMismatch = true;
    throw err;
  }

  const normalizedRole = normalizeRoleValue(user.role).toLowerCase();

  if (normalizedRole === "trainer") {
    /* 
    const emailVerified = Boolean(user.emailVerified || user.isEmailVerified);
    if (!emailVerified) {
      const err = new Error(
        "Please verify your email with OTP before signing in.",
      );
      err.statusCode = 403;
      err.requiresEmailVerification = true;
      throw err;
    }
    */

    /*
    if (user.accountStatus !== "active") {
      const err = new Error(
        "Your trainer account is waiting for admin approval.",
      );
      err.statusCode = 403;
      err.pendingApproval = true;
      throw err;
    }
    */
  }

  if (user.twoFactorEnabled) {
    return {
      success: true,
      requires2FA: true,
      userId: user.id || user._id,
      message: "2FA Verification Required",
    };
  }

  const session = await issueAuthSession({ user, res, ipAddress });

  return {
    success: true,
    message: "Login successful",
    ...session,
  };
};

module.exports = {
  loginWithPassword,
};
