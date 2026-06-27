const express = require("express");
const { google } = require("googleapis");
const { GMAIL_SEND_SCOPE } = require("../services/gmailApiService");

const router = express.Router();

const resolveOAuthConfig = () => {
  const clientId = String(
    process.env.GOOGLE_DRIVE_CLIENT_ID ||
      process.env.GOOGLE_OAUTH_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      "",
  ).trim();
  const clientSecret = String(
    process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      "",
  ).trim();
  const backendUrl = String(
    process.env.BACKEND_URL || "https://mbk-project-spf5.onrender.com",
  )
    .trim()
    .replace(/\/+$/, "");
  const redirectUri = String(
    process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI ||
      process.env.GOOGLE_OAUTH_REDIRECT_URL ||
      `${backendUrl}/oauth2callback`,
  ).trim();

  return { clientId, clientSecret, redirectUri, backendUrl };
};

const createOAuthClient = () => {
  const config = resolveOAuthConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    return { client: null, config, error: "Missing Google OAuth client ID, secret, or redirect URI on the server." };
  }

  return {
    client: new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
    ),
    config,
    error: null,
  };
};

const buildAuthUrl = (loginHint = "") => {
  const { client, config, error } = createOAuthClient();
  if (error) {
    return { error, config };
  }

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [
      GMAIL_SEND_SCOPE,
      "https://www.googleapis.com/auth/drive",
    ],
    ...(loginHint ? { login_hint: loginHint } : {}),
  });

  return { url, config, error: null };
};

const renderSetupPage = ({ title, bodyHtml, config }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; color: #0f172a; line-height: 1.5; }
    code, pre { background: #f1f5f9; border-radius: 8px; padding: 12px; display: block; overflow-x: auto; word-break: break-all; }
    .ok { color: #166534; font-weight: 700; }
    .err { color: #b91c1c; font-weight: 700; }
    a.btn { display: inline-block; background: #174264; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; margin-top: 12px; }
    ol li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${bodyHtml}
  <hr />
  <p><strong>Redirect URI configured on server:</strong><br /><code>${config?.redirectUri || "not set"}</code></p>
  <p>Add this exact URI in Google Cloud Console → APIs & Services → Credentials → OAuth client → Authorized redirect URIs.</p>
</body>
</html>`;

const assertSetupAccess = (req, res) => {
  const setupSecret = String(process.env.GOOGLE_OAUTH_SETUP_SECRET || "").trim();
  if (!setupSecret) {
    return true;
  }
  if (String(req.query.key || "") === setupSecret) {
    return true;
  }
  res
    .status(403)
    .send(
      renderSetupPage({
        title: "OAuth setup locked",
        config: resolveOAuthConfig(),
        bodyHtml:
          '<p class="err">Missing or invalid setup key.</p><p>Open this URL with <code>?key=YOUR_GOOGLE_OAUTH_SETUP_SECRET</code>.</p>',
      }),
    );
  return false;
};

router.get("/api/oauth/gmail/status", async (_req, res) => {
  const { validateGmailApiConfiguration, getGmailOAuthDiagnostics } = require("../services/gmailApiService");
  const diagnostics = getGmailOAuthDiagnostics();
  const validation = await validateGmailApiConfiguration();

  return res.status(validation.ok ? 200 : 503).json({
    ...validation,
    diagnostics,
  });
});

router.get("/api/oauth/gmail/help", (_req, res) => {
  const config = resolveOAuthConfig();
  const startUrl = `${config.backendUrl}/api/oauth/gmail/start?email=mbkdrive82@gmail.com`;

  res.send(
    renderSetupPage({
      title: "Gmail OAuth Setup",
      config,
      bodyHtml: `
        <p>Use this for <strong>mbkdrive82@gmail.com</strong> OTP email on Render free tier.</p>
        <ol>
          <li>Google Cloud Console → enable <strong>Gmail API</strong>.</li>
          <li>OAuth consent screen → add test user <strong>mbkdrive82@gmail.com</strong>.</li>
          <li>OAuth client → add redirect URI shown below.</li>
          <li>Set on Render: <code>GOOGLE_DRIVE_CLIENT_ID</code>, <code>GOOGLE_DRIVE_CLIENT_SECRET</code>, <code>GOOGLE_DRIVE_OAUTH_REDIRECT_URI</code>, <code>EMAIL_USER=mbkdrive82@gmail.com</code>.</li>
          <li>Click start and sign in with mbkdrive82@gmail.com.</li>
        </ol>
        <a class="btn" href="${startUrl}">Connect mbkdrive82@gmail.com</a>
      `,
    }),
  );
});

router.get("/api/oauth/gmail/start", (req, res) => {
  if (!assertSetupAccess(req, res)) {
    return;
  }

  const loginHint = String(req.query.email || "mbkdrive82@gmail.com").trim();
  const auth = buildAuthUrl(loginHint);

  if (auth.error) {
    return res.status(503).send(
      renderSetupPage({
        title: "OAuth not configured",
        config: auth.config,
        bodyHtml: `<p class="err">${auth.error}</p>`,
      }),
    );
  }

  return res.redirect(auth.url);
});

router.get("/oauth2callback", async (req, res) => {
  const config = resolveOAuthConfig();
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(
      renderSetupPage({
        title: "Google OAuth failed",
        config,
        bodyHtml: `<p class="err">Google returned: ${String(error)}</p>`,
      }),
    );
  }

  if (!code) {
    return res.status(400).send(
      renderSetupPage({
        title: "Missing OAuth code",
        config,
        bodyHtml:
          '<p class="err">No authorization code was returned.</p><p><a class="btn" href="/api/oauth/gmail/start?email=mbkdrive82@gmail.com">Try again</a></p>',
      }),
    );
  }

  const { client, error: clientError } = createOAuthClient();
  if (clientError || !client) {
    return res.status(503).send(
      renderSetupPage({
        title: "OAuth not configured",
        config,
        bodyHtml: `<p class="err">${clientError}</p>`,
      }),
    );
  }

  try {
    const { tokens } = await client.getToken(String(code));
    const refreshToken = tokens.refresh_token || "";
    const emailUser =
      String(process.env.EMAIL_USER || "mbkdrive82@gmail.com").trim() ||
      "mbkdrive82@gmail.com";

    if (!refreshToken) {
      return res.send(
        renderSetupPage({
          title: "No refresh token returned",
          config,
          bodyHtml: `
            <p class="err">Google did not return a refresh token.</p>
            <ol>
              <li>Open <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Google Account permissions</a>.</li>
              <li>Remove access for your MBK OAuth app.</li>
              <li><a class="btn" href="/api/oauth/gmail/start?email=mbkdrive82@gmail.com">Connect again</a></li>
            </ol>
          `,
        }),
      );
    }

    return res.send(
      renderSetupPage({
        title: "Gmail connected",
        config,
        bodyHtml: `
          <p class="ok">Success. Copy these into Render Environment:</p>
          <pre>GOOGLE_GMAIL_REFRESH_TOKEN=${refreshToken}
EMAIL_USER=${emailUser}
EMAIL_FROM="MBK Carrierz" &lt;${emailUser}&gt;
GOOGLE_DRIVE_OAUTH_REDIRECT_URI=${config.redirectUri}</pre>
          <p>Save Render env → wait 2 minutes → test:</p>
          <pre>${config.backendUrl}/api/health/email</pre>
          <p>Then try trainer signup OTP again.</p>
        `,
      }),
    );
  } catch (exchangeError) {
    return res.status(400).send(
      renderSetupPage({
        title: "Token exchange failed",
        config,
        bodyHtml: `
          <p class="err">${exchangeError.message || "Could not exchange OAuth code."}</p>
          <p>If the code expired, start again within a few minutes:</p>
          <a class="btn" href="/api/oauth/gmail/start?email=mbkdrive82@gmail.com">Try again</a>
        `,
      }),
    );
  }
});

module.exports = router;
