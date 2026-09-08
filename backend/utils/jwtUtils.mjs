import jwt from 'jsonwebtoken';

// Fallback must match simpleAuth.js / middleware/auth.js / socketManager.mjs so
// tokens are verifiable across modules when JWT_SECRET is not set (dev only).
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-change-in-production';
const REFRESH_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || '30d';

export const generateTokens = (userId, email, role) => {
  const accessToken = jwt.sign(
    // Both `id` and `userId`: legacy routes read req.user.id, new ones req.user.userId
    { id: userId, userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  const refreshToken = jwt.sign(
    { userId, email },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRE }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};
