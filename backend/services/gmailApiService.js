const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const trimEnv = (value = "") =>
  String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");

/** Single OAuth source: GOOGLE_DRIVE_* + GOOGLE_GMAIL_REFRESH_TOKEN only. */
const resolveDriveOAuthCredentials = () => {
  const clientId = trimEnv(process.env.GOOGLE_DRIVE_CLIENT_ID);
  const clientSecret = trimEnv(process.env.GOOGLE_DRIVE_CLIENT_SECRET);
  const refreshToken = String(
    process.env.GOOGLE_GMAIL_REFRESH_TOKEN ||
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
      "",
  ).trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret, refreshToken };
};

const collectGmailOAuthCandidates = () => {
  const creds = resolveDriveOAuthCredentials();
  if (!creds?.refreshToken) {
    return [];
  }

  return [{ ...creds, label: "drive" }];
};

let cachedWorkingConfig = null;

const resolveGmailOAuthConfig = () => {
  if (cachedWorkingConfig) {
    return cachedWorkingConfig;
  }

  const candidates = collectGmailOAuthCandidates();
  return candidates[0] || null;
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

const formatGmailAuthHint = (message = "") => {
  if (/invalid_client|deleted client|unauthorized_client/i.test(message)) {
    return [
      "Google OAuth client on Render does not match the refresh token.",
      "Use only GOOGLE_DRIVE_CLIENT_ID + GOOGLE_DRIVE_CLIENT_SECRET (delete old GOOGLE_OAUTH_* vars).",
      "Then reconnect: https://mbk-project-spf5.onrender.com/api/oauth/gmail/start?email=mbkdrive82@gmail.com",
    ].join(" ");
  }
  if (/invalid_grant|unauthorized|revoked/i.test(message)) {
    return "Refresh token is invalid or revoked. Reconnect Gmail at /api/oauth/gmail/start?email=mbkdrive82@gmail.com";
  }
  if (/insufficient|scope|403/i.test(message)) {
    return "OAuth token missing gmail.send scope. Reconnect Gmail at /api/oauth/gmail/start?email=mbkdrive82@gmail.com";
  }
  return null;
};

const getGmailOAuthDiagnostics = () => {
  const creds = resolveDriveOAuthCredentials();
  const backendUrl = String(
    process.env.BACKEND_URL || "https://mbk-project-spf5.onrender.com",
  )
    .trim()
    .replace(/\/+$/, "");

  const legacyOAuthId = trimEnv(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const legacyConflict =
    Boolean(legacyOAuthId) &&
    Boolean(creds?.clientId) &&
    legacyOAuthId !== creds.clientId;

  return {
    configured: Boolean(creds?.clientId && creds?.clientSecret && creds?.refreshToken),
    candidateCount: collectGmailOAuthCandidates().length,
    activePair: cachedWorkingConfig?.label || null,
    clientIdMasked: creds?.clientId
      ? `${creds.clientId.slice(0, 12)}...${creds.clientId.slice(-28)}`
      : null,
    hasClientId: Boolean(creds?.clientId),
    hasClientSecret: Boolean(creds?.clientSecret),
    clientSecretLength: creds?.clientSecret ? creds.clientSecret.length : 0,
    hasRefreshToken: Boolean(creds?.refreshToken),
    refreshTokenPrefix: creds?.refreshToken ? creds.refreshToken.slice(0, 8) : null,
    missingForGmailApi: [
      ...(creds?.clientId ? [] : ["GOOGLE_DRIVE_CLIENT_ID"]),
      ...(creds?.clientSecret ? [] : ["GOOGLE_DRIVE_CLIENT_SECRET"]),
      ...(creds?.refreshToken ? [] : ["GOOGLE_GMAIL_REFRESH_TOKEN"]),
    ],
    legacyOAuthConflict: legacyConflict,
    legacyOAuthHint: legacyConflict
      ? "Delete GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET on Render — they point to an old/deleted OAuth client."
      : null,
    emailUser: resolveGmailSenderEmail() || null,
    redirectUri: String(
      process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI ||
        `${backendUrl}/oauth2callback`,
    ).trim(),
    reconnectUrl: `${backendUrl}/api/oauth/gmail/start?email=mbkdrive82@gmail.com`,
    helpUrl: `${backendUrl}/api/oauth/gmail/help`,
  };
};

const canUseGmailApi = () => collectGmailOAuthCandidates().length > 0;

let gmailClientPromise = null;

const createOAuth2ClientForConfig = (config) => {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
  );
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });
  return oauth2Client;
};

const createGmailClientForConfig = (config) => {
  const auth = createOAuth2ClientForConfig(config);
  return google.gmail({ version: "v1", auth });
};

const resolveWorkingGmailClient = async () => {
  if (gmailClientPromise) {
    return gmailClientPromise;
  }

  const candidates = collectGmailOAuthCandidates();
  if (!candidates.length) {
    return null;
  }

  gmailClientPromise = (async () => {
    const candidate = candidates[0];
    try {
      const auth = createOAuth2ClientForConfig(candidate);
      const oauth2 = google.oauth2({ version: "v2", auth });
      await oauth2.userinfo.get();
      cachedWorkingConfig = candidate;
      console.log("[GMAIL-API] Authenticated with GOOGLE_DRIVE OAuth client.");
      return google.gmail({ version: "v1", auth });
    } catch (error) {
      console.error("[GMAIL-API] Authentication check failed:", {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        data: JSON.stringify(error?.response?.data || {}),
        errors: error?.errors,
      });
      gmailClientPromise = null;
      throw error;
    }
  })().catch((error) => {
    gmailClientPromise = null;
    throw error;
  });

  return gmailClientPromise;
};

const getGmailClient = async () => resolveWorkingGmailClient();

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
    gmailClientPromise = null;
    cachedWorkingConfig = null;
    const message = error?.message || String(error);
    const hint = formatGmailAuthHint(message);

    return {
      success: false,
      error: message,
      profile: "gmail-api",
      ...(hint ? { hint } : {}),
    };
  }
};

const validateGmailApiConfiguration = async () => {
  const diagnostics = getGmailOAuthDiagnostics();

  if (diagnostics.legacyOAuthConflict) {
    return {
      ok: false,
      issues: [diagnostics.legacyOAuthHint],
      diagnostics,
    };
  }

  if (!canUseGmailApi()) {
    return {
      ok: false,
      issues: [
        diagnostics.missingForGmailApi.length
          ? `Missing on Render: ${diagnostics.missingForGmailApi.join(", ")}`
          : "Missing Google OAuth credentials for Gmail API.",
      ],
      hint: "Complete OAuth connect: https://mbk-project-spf5.onrender.com/api/oauth/gmail/help",
      diagnostics,
    };
  }

  try {
    const candidate = collectGmailOAuthCandidates()[0];
    const auth = createOAuth2ClientForConfig(candidate);
    const oauth2 = google.oauth2({ version: "v2", auth });
    const userInfo = await oauth2.userinfo.get();
    const accountEmail = String(userInfo.data.email || "").toLowerCase();
    const configuredSender = resolveGmailSenderEmail();

    if (configuredSender && accountEmail && configuredSender !== accountEmail) {
      return {
        ok: true,
        deliveryMode: "gmail-api",
        accountEmail,
        configuredSender,
        activePair: cachedWorkingConfig?.label || null,
        warning:
          "EMAIL_USER does not match the authorized Gmail account. Emails send from the OAuth account.",
        from: process.env.EMAIL_FROM || `"MBK Carrierz" <${accountEmail}>`,
      };
    }

    return {
      ok: true,
      deliveryMode: "gmail-api",
      accountEmail,
      activePair: cachedWorkingConfig?.label || null,
      from:
        process.env.EMAIL_FROM ||
        (accountEmail ? `"MBK Carrierz" <${accountEmail}>` : null),
    };
  } catch (error) {
    gmailClientPromise = null;
    cachedWorkingConfig = null;
    const message = error?.message || "Gmail API validation failed.";
    return {
      ok: false,
      issues: [message],
      hint: formatGmailAuthHint(message),
      diagnostics,
      debug: {
        errorCode: error?.code,
        httpStatus: error?.response?.status,
        responseData: error?.response?.data || null,
        errorErrors: error?.errors || null,
      },
    };
  }
};

module.exports = {
  GMAIL_SEND_SCOPE,
  canUseGmailApi,
  sendEmailViaGmailApi,
  validateGmailApiConfiguration,
  resolveGmailSenderEmail,
  getGmailOAuthDiagnostics,
  formatGmailAuthHint,
};
