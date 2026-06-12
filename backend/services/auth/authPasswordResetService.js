const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const Otp = require("../../models/Otp");
const { normalizeEmail, hashOtp, verifyEmailOtp } = require("./authEmailOtpService");
const { sendPasswordResetEmail } = require("../../utils/emailService");

const PASSWORD_RESET_PURPOSE = "password_reset";
const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESET_TOKEN_EXPIRES = "15m";

const getJwtSecret = () =>
  process.env.JWT_SECRET || "your_super_secret_jwt_key_change_in_production";

const generateRawOtp = () =>
  Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)).toString();

const requestPasswordResetOtp = async ({ email, ipAddress }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const err = new Error("Email is required");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return {
      success: true,
      message: "If an account exists for this email, a reset code has been sent.",
    };
  }

  const rawOtp = generateRawOtp();
  const hashedOtp = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await Otp.findOneAndUpdate(
    { email: normalizedEmail, purpose: PASSWORD_RESET_PURPOSE },
    {
      hashedOtp,
      expiresAt,
      verified: false,
      used: false,
      attempts: 0,
      ipAddress: ipAddress || "unknown",
      requestCount: 1,
      hourWindowStart: new Date(),
    },
    { upsert: true, new: true },
  );

  try {
    await sendPasswordResetEmail(
      normalizedEmail,
      user.name || user.profile?.fullName || "User",
      rawOtp,
    );
  } catch (emailError) {
    if (process.env.NODE_ENV === "production") {
      const err = new Error(emailError.message || "Failed to send password reset email");
      err.statusCode = 502;
      throw err;
    }
    console.warn(
      `[AUTH] Password reset email failed in dev for ${normalizedEmail}. OTP: ${rawOtp}`,
    );
  }

  return {
    success: true,
    message: "If an account exists for this email, a reset code has been sent.",
    ...(process.env.NODE_ENV !== "production" && process.env.ALLOW_OTP_DEBUG === "1"
      ? { debugOtp: rawOtp }
      : {}),
  };
};

const verifyPasswordResetOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);
  await verifyEmailOtp({
    email: normalizedEmail,
    otp,
    purpose: PASSWORD_RESET_PURPOSE,
  });

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const err = new Error("Invalid or expired OTP");
    err.statusCode = 400;
    throw err;
  }

  const tempToken = jwt.sign(
    {
      userId: user._id,
      email: normalizedEmail,
      purpose: PASSWORD_RESET_PURPOSE,
    },
    getJwtSecret(),
    { expiresIn: RESET_TOKEN_EXPIRES },
  );

  return {
    success: true,
    message: "OTP verified. Set your new password.",
    tempToken,
  };
};

const resetPasswordWithToken = async ({ tempToken, password }) => {
  if (!tempToken || !password) {
    const err = new Error("Reset token and new password are required");
    err.statusCode = 400;
    throw err;
  }

  if (String(password).length < 6) {
    const err = new Error("Password must be at least 6 characters");
    err.statusCode = 400;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(tempToken, getJwtSecret());
  } catch {
    const err = new Error("Invalid or expired reset token");
    err.statusCode = 400;
    throw err;
  }

  if (payload.purpose !== PASSWORD_RESET_PURPOSE || !payload.userId) {
    const err = new Error("Invalid reset token");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(payload.userId).select("+password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  return {
    success: true,
    message: "Password reset successfully",
  };
};

module.exports = {
  PASSWORD_RESET_PURPOSE,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithToken,
};
