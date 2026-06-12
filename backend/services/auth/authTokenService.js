const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RefreshToken = require("../../models/RefreshToken");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("JWT_SECRET is required in production");
  }
  return secret || "your_super_secret_jwt_key_change_in_production";
};

const setRefreshTokenCookie = (res, token) => {
  const refreshTokenDays = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);
  const shouldPersistAcrossBrowserRestart =
    Number.isFinite(refreshTokenDays) && refreshTokenDays > 0;

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };

  if (shouldPersistAcrossBrowserRestart) {
    cookieOptions.expires = new Date(
      Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000,
    );
  }

  res.cookie("refreshToken", token, cookieOptions);
};

const createAccessToken = (user) =>
  jwt.sign(
    { id: user.id || user._id, role: user.role },
    getJwtSecret(),
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "24h" },
  );

const createRegistrationStepToken = (user, step = 2) =>
  jwt.sign(
    { id: user.id || user._id, role: user.role, step },
    getJwtSecret(),
    { expiresIn: "1h" },
  );

const issueAuthSession = async ({ user, res, ipAddress }) => {
  const accessToken = createAccessToken(user);
  const refreshToken = crypto.randomBytes(40).toString("hex");

  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
  });

  setRefreshTokenCookie(res, refreshToken);

  return {
    accessToken,
    user: {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      emailVerified: Boolean(user.emailVerified || user.isEmailVerified),
    },
  };
};

const toPublicUser = (user) => ({
  id: user.id || user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  accountStatus: user.accountStatus,
  emailVerified: Boolean(user.emailVerified || user.isEmailVerified),
});

module.exports = {
  createAccessToken,
  createRegistrationStepToken,
  issueAuthSession,
  setRefreshTokenCookie,
  toPublicUser,
};
