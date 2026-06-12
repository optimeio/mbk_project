import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const FIREBASE_ENV_KEYS = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
  tenantId: "NEXT_PUBLIC_FIREBASE_TENANT_ID",
};

const REQUIRED_FIREBASE_FIELDS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const maskConfigValue = (field, value) => {
  if (!value) return value;
  if (field === "apiKey") {
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  }
  return value;
};

const readFirebaseConfigFromEnv = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (process.env.NEXT_PUBLIC_FIREBASE_TENANT_ID) {
    config.tenantId = process.env.NEXT_PUBLIC_FIREBASE_TENANT_ID;
  }

  return config;
};

const getMissingFirebaseFields = (config) =>
  REQUIRED_FIREBASE_FIELDS.filter((field) => {
    const value = config[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

export const isFirebaseConfigured = () =>
  getMissingFirebaseFields(readFirebaseConfigFromEnv()).length === 0;

export const logFirebaseConfigDiagnostics = () => {
  const config = readFirebaseConfigFromEnv();
  const missingFields = getMissingFirebaseFields(config);

  console.group("[Firebase] Config diagnostics");
  Object.entries(FIREBASE_ENV_KEYS).forEach(([field, envKey]) => {
    const rawValue = process.env[envKey];
    let status = "UNDEFINED";
    if (rawValue !== undefined) {
      status = String(rawValue).trim() === "" ? "EMPTY" : "SET";
    }

    console.log(
      `${field} (${envKey}):`,
      status,
      status === "SET" ? maskConfigValue(field, rawValue) : rawValue,
    );
  });

  if (missingFields.length > 0) {
    console.warn(
      "[Firebase] Missing or empty required fields:",
      missingFields.join(", "),
    );
  } else {
    console.info("[Firebase] All required config fields are set.");
  }

  console.groupEnd();

  return {
    config,
    missingFields,
    isConfigured: missingFields.length === 0,
  };
};

let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;

const getFirebaseAuth = () => {
  const diagnostics = logFirebaseConfigDiagnostics();

  if (!diagnostics.isConfigured) {
    const envNames = diagnostics.missingFields
      .map((field) => FIREBASE_ENV_KEYS[field])
      .join(", ");

    throw new Error(
      `Firebase is not configured. Set these environment variables in frontend/.env.local: ${envNames}`,
    );
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(diagnostics.config);
    firebaseAuth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();
  }

  return { auth: firebaseAuth, googleProvider };
};

export const signInWithGoogle = async () => {
  try {
    const { auth, googleProvider: provider } = getFirebaseAuth();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Firebase Google Sign-In Error:", error);
    throw error;
  }
};

if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  logFirebaseConfigDiagnostics();
}
