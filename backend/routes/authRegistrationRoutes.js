const express = require("express");
const {
  initTrainerRegistration,
  resendTrainerRegistrationOtp,
  verifyTrainerRegistrationOtp,
  registerStudent,
  registerCompany,
} = require("../services/auth/authRegistrationService");

const router = express.Router();

const buildTrainerRegistrationState = async (trainer) => {
  const step = Number(trainer?.registrationStep) || 1;
  return {
    currentStep: step,
    registrationStatus: trainer?.registrationStatus || "pending",
    workflow: { documentStatus: trainer?.documentStatus || null },
  };
};

const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Request failed",
  });
};

router.post("/student", async (req, res) => {
  try {
    const { name, fullName, email, password, phone, college, course } = req.body;
    const result = await registerStudent({
      name: fullName || name,
      email,
      password,
      phone,
      college,
      course,
      res,
      ipAddress: req.ip,
    });
    return res.status(201).json(result);
  } catch (error) {
    console.error("[AUTH] student register error:", error);
    return handleServiceError(res, error);
  }
});

router.post("/company", async (req, res) => {
  try {
    const {
      companyName,
      name,
      email,
      password,
      phone,
      address,
      website,
    } = req.body;
    const result = await registerCompany({
      name: companyName || name,
      companyName: companyName || name,
      email,
      password,
      phone,
      address,
      website,
      res,
      ipAddress: req.ip,
    });
    return res.status(201).json(result);
  } catch (error) {
    console.error("[AUTH] company register error:", error);
    return handleServiceError(res, error);
  }
});

router.post("/trainer", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await initTrainerRegistration({
      email,
      password,
      ipAddress: req.ip,
      buildTrainerRegistrationState,
    });
    return res.json(result);
  } catch (error) {
    console.error("[AUTH] trainer registration init error:", error);
    return handleServiceError(res, error);
  }
});

router.post("/trainer/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const result = await resendTrainerRegistrationOtp({
      email,
      ipAddress: req.ip,
    });
    return res.json(result);
  } catch (error) {
    console.error("[AUTH] trainer OTP resend error:", error);
    return handleServiceError(res, error);
  }
});

router.post("/trainer/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyTrainerRegistrationOtp({
      email,
      otp,
      buildTrainerRegistrationState,
    });
    return res.json(result);
  } catch (error) {
    console.error("[AUTH] trainer OTP verify error:", error);
    return handleServiceError(res, error);
  }
});

module.exports = router;
