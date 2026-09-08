const express = require("express");
const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithToken,
} = require("../services/auth/authPasswordResetService");

const router = express.Router();

const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Request failed",
  });
};

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const result = await requestPasswordResetOtp({
      email,
      ipAddress: req.ip,
    });
    return res.json(result);
  } catch (error) {
    console.error("[AUTH] forgot-password error:", error);
    return handleServiceError(res, error);
  }
});

router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const result = await verifyPasswordResetOtp({ email, otp });
    return res.json(result);
  } catch (error) {
    console.error("[AUTH] verify-reset-otp error:", error);
    return handleServiceError(res, error);
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { tempToken, password } = req.body || {};
    const result = await resetPasswordWithToken({ tempToken, password });
    return res.json(result);
  } catch (error) {
    console.error("[AUTH] reset-password error:", error);
    return handleServiceError(res, error);
  }
});

module.exports = router;
