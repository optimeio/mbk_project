"use client";

import {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { API_BASE_URL } from "@/services/api";

let sharedInitialCaptchaPromise = null;

const fetchCaptchaData = async () => {
  let url = "/api/captcha";
  if (typeof window !== "undefined" && typeof API_BASE_URL !== "undefined") {
    const isAbsolute = /^https?:\/\//i.test(API_BASE_URL);
    if (isAbsolute) {
      const currentHost = window.location.hostname;
      try {
        const apiHost = new URL(API_BASE_URL).hostname;
        // If accessed via local network IP (mobile) but API is configured with 'localhost',
        // force a relative path to let Next.js proxy route it to the host machine.
        if (currentHost !== "localhost" && currentHost !== "127.0.0.1" && (apiHost === "localhost" || apiHost === "127.0.0.1")) {
          url = "/api/captcha";
        } else {
          url = `${API_BASE_URL}/captcha`;
        }
      } catch {
        url = `${API_BASE_URL}/captcha`;
      }
    } else {
      url = `${API_BASE_URL}/captcha`;
    }
  }

  const response = await fetch(`${url}?${Date.now()}`, {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 429) {
    let retryAfterSeconds = 60;
    try {
      const payload = await response.json();
      if (Number.isFinite(payload?.retryAfterSeconds)) {
        retryAfterSeconds = payload.retryAfterSeconds;
      }
    } catch {
      // ignore non-JSON 429 bodies
    }
    const err = new Error("Captcha temporarily unavailable. Please wait and try again.");
    err.status = 429;
    err.retryAfterSeconds = retryAfterSeconds;
    throw err;
  }

  if (!response.ok) {
    throw new Error("Failed to load captcha");
  }

  const token = response.headers.get("X-Captcha-Token") || "";
  const svg = await response.text();
  return { svg, token };
};

const getSharedInitialCaptcha = () => {
  if (!sharedInitialCaptchaPromise) {
    sharedInitialCaptchaPromise = fetchCaptchaData().catch((err) => {
      console.error("Shared initial captcha fetch failed:", err);
      throw err;
    }).finally(() => {
      sharedInitialCaptchaPromise = null;
    });
  }

  return sharedInitialCaptchaPromise;
};

/**
 * CaptchaBox now calls onChange with both the user input and the signed token:
 *   onChange({ value: "1234", token: "<issuedAt>.<sig>" })
 *
 * The parent should send BOTH to the backend on login.
 */
const CaptchaBox = forwardRef(({ onChange }, ref) => {
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [loadError, setLoadError] = useState("");
  const initialized = useRef(false);
  const isMounted = useRef(false);
  const latestRequestId = useRef(0);
  const retryTimerRef = useRef(null);

  const loadCaptcha = async ({ reuseInitialRequest = false } = {}) => {
    const requestId = ++latestRequestId.current;

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    try {
      const { svg, token } = reuseInitialRequest
        ? await getSharedInitialCaptcha()
        : await fetchCaptchaData();

      if (!isMounted.current || requestId !== latestRequestId.current) {
        return;
      }

      setCaptchaSvg(svg);
      setCaptchaToken(token);
      setCaptchaInput("");
      setLoadError("");
      onChange({ value: "", token });
    } catch (error) {
      if (!isMounted.current || requestId !== latestRequestId.current) {
        return;
      }

      console.error("Error loading captcha:", error);
      const message =
        error?.status === 429
          ? "Too many captcha requests. Retrying shortly..."
          : "Unable to load captcha. Click refresh to try again.";
      setLoadError(message);

      if (error?.status === 429) {
        const retryMs = Math.max(3, Number(error.retryAfterSeconds) || 10) * 1000;
        retryTimerRef.current = setTimeout(() => {
          if (isMounted.current) {
            loadCaptcha();
          }
        }, retryMs);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: loadCaptcha,
  }));

  useEffect(() => {
    isMounted.current = true;

    if (!initialized.current) {
      initialized.current = true;
      loadCaptcha({ reuseInitialRequest: true });
    }

    return () => {
      isMounted.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setCaptchaInput(value);
    onChange({ value, token: captchaToken });
  };

  return (
    <div className="captcha-box mb-4">
      {loadError ? (
        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {loadError}
        </p>
      ) : null}
      <div className="captcha-box-row mb-2 flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <div
          className="captcha-box-image flex h-14 min-w-[140px] flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-yellow-400 bg-gray-50"
          dangerouslySetInnerHTML={{ __html: captchaSvg }}
          style={{ padding: "4px" }}
        />

        <button
          type="button"
          onClick={loadCaptcha}
          className="captcha-box-refresh flex h-11 min-w-[48px] items-center justify-center rounded-lg bg-gray-200 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-300"
          title="Refresh Captcha"
          aria-label="Refresh captcha"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        placeholder="Enter 4-digit code"
        value={captchaInput}
        className="captcha-box-input w-full rounded-lg border-2 border-blue-400 px-3 py-2.5 text-center text-base font-bold tracking-[0.25em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-lg sm:tracking-widest"
        onChange={handleInputChange}
      />
    </div>
  );
});

export default CaptchaBox;
