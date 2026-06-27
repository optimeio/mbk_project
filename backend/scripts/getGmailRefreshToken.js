require("dotenv").config();

const { google } = require("googleapis");
const readline = require("readline");
const { GMAIL_SEND_SCOPE } = require("../services/gmailApiService");

const CLIENT_ID =
  process.env.GOOGLE_DRIVE_CLIENT_ID ||
  process.env.GOOGLE_OAUTH_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET =
  process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
  process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI ||
  process.env.GOOGLE_OAUTH_REDIRECT_URL ||
  "http://localhost:5001/oauth2callback";

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error(
    "Missing Google OAuth config. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and redirect URI env vars.",
  );
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    GMAIL_SEND_SCOPE,
    "https://www.googleapis.com/auth/drive",
  ],
});

console.log("Authorize Gmail + Drive for OTP email sending:");
console.log(authUrl);
console.log("");
console.log(
  "After approving, paste the `code` from the redirect URL below.",
);
console.log(
  "Add the refresh token to Render as GOOGLE_GMAIL_REFRESH_TOKEN (or GOOGLE_DRIVE_REFRESH_TOKEN).",
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const normalizeAuthorizationCode = (input = "") => {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";

  const sanitized = trimmed.replace(/^[\s"'\\]+/, "");

  if (sanitized.includes("code=")) {
    try {
      const parsedUrl = new URL(sanitized);
      const codeFromQuery = parsedUrl.searchParams.get("code");
      if (codeFromQuery) return codeFromQuery.trim();
    } catch (_error) {
      const codeMatch = sanitized.match(/[?&]code=([^&]+)/);
      if (codeMatch?.[1]) {
        return decodeURIComponent(codeMatch[1]).trim();
      }
    }
  }

  return sanitized;
};

rl.question("Enter the code here: ", async (code) => {
  try {
    const normalizedCode = normalizeAuthorizationCode(code);
    const { tokens } = await oAuth2Client.getToken(normalizedCode);
    console.log("");
    console.log("REFRESH TOKEN:", tokens.refresh_token || "(not returned)");
    console.log("");
    console.log("Render env:");
    console.log(`GOOGLE_GMAIL_REFRESH_TOKEN=${tokens.refresh_token || ""}`);
    console.log(`EMAIL_USER=${process.env.EMAIL_USER || "mbktechnologies8@gmail.com"}`);
    console.log(
      `EMAIL_FROM="MBK Carrierz" <${process.env.EMAIL_USER || "mbktechnologies8@gmail.com"}>`,
    );

    if (!tokens.refresh_token) {
      console.log(
        "Google did not return a refresh token. Revoke prior app access and retry with prompt=consent.",
      );
    }
  } catch (error) {
    console.error("Failed to get refresh token:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
});
