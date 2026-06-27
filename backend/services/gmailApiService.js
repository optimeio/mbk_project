const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const resolveGmailOAuthConfig = () => {
  const clientId = String(
    process.env.GOOGLE_GMAIL_CLIENT_ID ||
      process.env.GOOGLE_DRIVE_CLIENT_ID ||
      process.env.GOOGLE_OAUTH_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      "",
  ).trim();
  const clientSecret = String(
    process.env.GOOGLE_GMAIL_CLIENT_SECRET ||
      process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      "",
  ).trim();
  const refreshToken = String(
    process.env.GOOGLE_GMAIL_REFRESH_TOKEN ||
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN ||
      process.env.GOOGLE_REFRESH_TOKEN ||
      "",
  ).trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return { clientId, clientSecret, refreshToken };
};

const resolveGmailSenderEmail = () =>
  String(
    process.env.EMAIL_USER ||
      process.env.GMAIL_USER ||
      process.env.SMTP_USER ||
      "",
  )
    .trim()
    .toLowerCase();

const canUseGmailApi = () => Boolean(resolveGmailOAuthConfig());

let gmailClientPromise = null;

const getGmailClient = async () => {
  if (!canUseGmailApi()) {
    return null;
  }

  if (!gmailClientPromise) {
    gmailClientPromise = (async () => {
      const config = resolveGmailOAuthConfig();
      const oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
      );
      oauth2Client.setCredentials({ refresh_token: config.refreshToken });
      return google.gmail({ version: "v1", auth: oauth2Client });
    })().catch((error) => {
      gmailClientPromise = null;
      throw error;
    });
  }

  return gmailClientPromise;
};

const buildRawMessage = async (mailOptions) => {
  const mail = new MailComposer(mailOptions);
  const message = await mail.compile().build();
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const sendEmailViaGmailApi = async ({ to, subject, html, text, from }) => {
  if (!canUseGmailApi()) {
    return null;
  }

  const senderEmail = resolveGmailSenderEmail();
  const fromHeader =
    from ||
    process.env.EMAIL_FROM ||
    (senderEmail ? `"MBK Carrierz" <${senderEmail}>` : null);

  if (!fromHeader || !to) {
    return {
      success: false,
      error: "Gmail API requires EMAIL_USER and a recipient address.",
      profile: "gmail-api",
    };
  }

  try {
    const gmail = await getGmailClient();
    const raw = await buildRawMessage({
      from: fromHeader,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return {
      success: true,
      messageId: response.data.id || null,
      profile: "gmail-api",
    };
  } catch (error) {
    const message = error?.message || String(error);
    const hint = /insufficient|scope|403/i.test(message)
      ? "Re-run backend/scripts/getGmailRefreshToken.js and add GOOGLE_GMAIL_REFRESH_TOKEN to Render with gmail.send scope."
      : null;

    return {
      success: false,
      error: message,
      profile: "gmail-api",
      ...(hint ? { hint } : {}),
    };
  }
};

const validateGmailApiConfiguration = async () => {
  if (!canUseGmailApi()) {
    return {
      ok: false,
      issues: [
        "Missing Google OAuth credentials for Gmail API. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_GMAIL_REFRESH_TOKEN (or GOOGLE_DRIVE_REFRESH_TOKEN with gmail.send scope).",
      ],
    };
  }

  try {
    const gmail = await getGmailClient();
    const profile = await gmail.users.getProfile({ userId: "me" });
    const accountEmail = String(profile.data.emailAddress || "").toLowerCase();
    const configuredSender = resolveGmailSenderEmail();

    if (configuredSender && accountEmail && configuredSender !== accountEmail) {
      return {
        ok: true,
        deliveryMode: "gmail-api",
        accountEmail,
        configuredSender,
        warning:
          "EMAIL_USER does not match the authorized Gmail account. Emails send from the OAuth account.",
        from: process.env.EMAIL_FROM || `"MBK Carrierz" <${accountEmail}>`,
      };
    }

    return {
      ok: true,
      deliveryMode: "gmail-api",
      accountEmail,
      from:
        process.env.EMAIL_FROM ||
        (accountEmail ? `"MBK Carrierz" <${accountEmail}>` : null),
    };
  } catch (error) {
    return {
      ok: false,
      issues: [error?.message || "Gmail API validation failed."],
      hint:
        "Enable Gmail API in Google Cloud, add gmail.send scope, then run backend/scripts/getGmailRefreshToken.js.",
    };
  }
};

module.exports = {
  GMAIL_SEND_SCOPE,
  canUseGmailApi,
  sendEmailViaGmailApi,
  validateGmailApiConfiguration,
  resolveGmailSenderEmail,
};
