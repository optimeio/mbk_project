const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const trimEnv = (value = "") =>
  String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");

const collectGmailOAuthCandidates = () => {
  const clientIds = [
    process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ]
    .map(trimEnv)
    .filter(Boolean);

  const clientSecrets = [
    process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_CLIENT_SECRET,
  ]
    .map(trimEnv)
    .filter(Boolean);

  const refreshTokens = [
    process.env.GOOGLE_GMAIL_REFRESH_TOKEN,
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    process.env.GOOGLE_REFRESH_TOKEN,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const uniqueIds = [...new Set(clientIds)];
  const uniqueSecrets = [...new Set(clientSecrets)];
  const uniqueTokens = [...new Set(refreshTokens)];

  if (!uniqueIds.length || !uniqueSecrets.length || !uniqueTokens.length) {
    return [];
  }

  const candidates = [];
  const seen = new Set();

  const addCandidate = (clientId, clientSecret, refreshToken, label) => {
    if (!clientId || !clientSecret || !refreshToken) {
      return;
    }
    const key = `${clientId}|${clientSecret}|${refreshToken.slice(0, 16)}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push({ clientId, clientSecret, refreshToken, label });
  };

  // Prefer explicit env pairs before brute-force combinations.
  addCandidate(
    trimEnv(process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID),
    trimEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET),
    String(process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "").trim(),
    "oauth-pair",
  );
  addCandidate(
    trimEnv(process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID),
    trimEnv(process.env.GOOGLE_DRIVE_CLIENT_SECRET),
    String(process.env.GOOGLE_GMAIL_REFRESH_TOKEN || "").trim(),
    "drive+gmail-token",
  );
  addCandidate(
    trimEnv(process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID),
    trimEnv(process.env.GOOGLE_DRIVE_CLIENT_SECRET),
    String(process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "").trim(),
    "drive+oauth-token",
  );
  addCandidate(
    trimEnv(process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID),
    trimEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET),
    String(process.env.GOOGLE_GMAIL_REFRESH_TOKEN || "").trim(),
    "oauth-secret+gmail-token",
  );

  for (const clientId of uniqueIds) {
    for (const clientSecret of uniqueSecrets) {
      for (const refreshToken of uniqueTokens) {
        addCandidate(clientId, clientSecret, refreshToken, "combo");
      }
    }
  }

  return candidates;
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
  if (/invalid_client/i.test(message)) {
    return [
      "Google OAuth client ID, client secret, and refresh token must all belong to the same OAuth Web client.",
      "Remove duplicate GOOGLE_OAUTH_* vars or regenerate the refresh token:",
      "https://mbk-project-spf5.onrender.com/api/oauth/gmail/start?email=mbkdrive82@gmail.com",
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
  const candidates = collectGmailOAuthCandidates();
  const config = resolveGmailOAuthConfig();
  const backendUrl = String(
    process.env.BACKEND_URL || "https://mbk-project-spf5.onrender.com",
  )
    .trim()
    .replace(/\/+$/, "");

  return {
    configured: candidates.length > 0,
    candidateCount: candidates.length,
    activePair: cachedWorkingConfig?.label || config?.label || null,
    clientIdMasked: config?.clientId
      ? `${config.clientId.slice(0, 12)}...${config.clientId.slice(-28)}`
      : null,
    hasClientSecret: Boolean(config?.clientSecret),
    clientSecretLength: config?.clientSecret ? config.clientSecret.length : 0,
    hasRefreshToken: Boolean(config?.refreshToken),
    refreshTokenPrefix: config?.refreshToken ? config.refreshToken.slice(0, 8) : null,
    emailUser: resolveGmailSenderEmail() || null,
    redirectUri: String(
      process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI ||
        process.env.GOOGLE_OAUTH_REDIRECT_URL ||
        `${backendUrl}/oauth2callback`,
    ).trim(),
    reconnectUrl: `${backendUrl}/api/oauth/gmail/start?email=mbkdrive82@gmail.com`,
  };
};

const canUseGmailApi = () => collectGmailOAuthCandidates().length > 0;

let gmailClientPromise = null;

const createGmailClientForConfig = (config) => {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
  );
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
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
    let lastError = null;

    for (const candidate of candidates) {
      try {
        const gmail = createGmailClientForConfig(candidate);
        await gmail.users.getProfile({ userId: "me" });
        cachedWorkingConfig = candidate;
        console.log(
          `[GMAIL-API] Using OAuth credential pair: ${candidate.label}`,
        );
        return gmail;
      } catch (error) {
        lastError = error;
        console.warn(
          `[GMAIL-API] OAuth pair "${candidate.label}" failed:`,
          error?.message || error,
        );
      }
    }

    gmailClientPromise = null;
    throw lastError || new Error("Gmail API authentication failed.");
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
      diagnostics: getGmailOAuthDiagnostics(),
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
