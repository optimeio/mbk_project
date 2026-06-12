const jwt = require("jsonwebtoken");
const Student = require("../../models/Student");
const Otp = require("../../models/Otp");
const { normalizeEmail, hashOtp, verifyEmailOtp } = require("./authEmailOtpService");
const { sendPasswordResetEmail } = require("../../utils/emailService");

const STUDENT_PASSWORD_RESET_PURPOSE = "student_password_reset";
const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESET_TOKEN_EXPIRES = "15m";

const getJwtSecret = () =>
  process.env.JWT_SECRET || "your_super_secret_jwt_key_change_in_production";

const generateRawOtp = () =>
  Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)).toString();

const requestStudentPasswordResetOtp = async ({ email, ipAddress }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const err = new Error("Email is required");
    err.statusCode = 400;
    throw err;
  }

  const student = await Student.findOne({ email: normalizedEmail });
  if (!student) {
    return {
      success: true,
      message: "If an account exists for this email, a reset code has been sent.",
    };
  }

  const rawOtp = generateRawOtp();
  const hashedOtp = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await Otp.findOneAndUpdate(
    { email: normalizedEmail, purpose: STUDENT_PASSWORD_RESET_PURPOSE },
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
      student.fullName || student.name || "Student",
      rawOtp,
    );
  } catch (emailError) {
    if (process.env.NODE_ENV === "production") {
      const err = new Error(emailError.message || "Failed to send password reset email");
      err.statusCode = 502;
      throw err;
    }
    console.warn(
      `[AUTH] Student password reset email failed in dev for ${normalizedEmail}. OTP: ${rawOtp}`,
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

const verifyStudentPasswordResetOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);
  await verifyEmailOtp({
    email: normalizedEmail,
    otp,
    purpose: STUDENT_PASSWORD_RESET_PURPOSE,
  });

  const student = await Student.findOne({ email: normalizedEmail });
  if (!student) {
    const err = new Error("Invalid or expired OTP");
    err.statusCode = 400;
    throw err;
  }

  const tempToken = jwt.sign(
    {
      studentId: student._id,
      email: normalizedEmail,
      purpose: STUDENT_PASSWORD_RESET_PURPOSE,
      role: "student",
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

const resetStudentPasswordWithToken = async ({ tempToken, password }) => {
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

  if (payload.purpose !== STUDENT_PASSWORD_RESET_PURPOSE || !payload.studentId) {
    const err = new Error("Invalid reset token");
    err.statusCode = 400;
    throw err;
  }

  const student = await Student.findById(payload.studentId);
  if (!student) {
    const err = new Error("Student account not found");
    err.statusCode = 404;
    throw err;
  }

  student.password = password;
  await student.save();

  return {
    success: true,
    message: "Password reset successfully",
  };
};

module.exports = {
  STUDENT_PASSWORD_RESET_PURPOSE,
  requestStudentPasswordResetOtp,
  verifyStudentPasswordResetOtp,
  resetStudentPasswordWithToken,
};
