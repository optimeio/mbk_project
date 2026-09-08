"use client";

const DEFAULT_STEPS = [
  "Scanning file",
  "Securing upload",
  "Updating profile",
];

export default function DocumentUploadLoadingState({
  title = "Uploading document",
  hint = "Please keep this page open for a few seconds.",
  steps = DEFAULT_STEPS,
  compact = false,
}) {
  const safeSteps =
    Array.isArray(steps) && steps.length > 0 ? steps.slice(0, 3) : DEFAULT_STEPS;

  return (
    <div className={`doc-upload-loader ${compact ? "compact" : ""}`}>
      <div className="doc-upload-head">
        <div className="doc-upload-orbit" aria-hidden="true">
          <span className="doc-upload-core">MBK</span>
          <span className="doc-upload-ring ring-one" />
          <span className="doc-upload-ring ring-two" />
        </div>

        <div className="doc-upload-copy">
          <p className="doc-upload-kicker">Secure Upload</p>
          <h4 className="doc-upload-title">{title}</h4>
          <p className="doc-upload-hint">{hint}</p>
        </div>
      </div>

      <div className="doc-upload-track" aria-hidden="true">
        <span />
      </div>

      <div className="doc-upload-steps">
        {safeSteps.map((step, index) => (
          <span key={`${step}-${index}`}>{step}</span>
        ))}
      </div>

      <style jsx>{`
        .doc-upload-loader {
          border: 1px solid rgba(96, 165, 250, 0.22);
          background:
            radial-gradient(circle at top right, rgba(59, 130, 246, 0.14), transparent 36%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.94));
          border-radius: 22px;
          padding: 16px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        }

        .compact {
          border-radius: 18px;
          padding: 13px 14px;
        }

        .doc-upload-head {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .doc-upload-orbit {
          position: relative;
          width: 58px;
          height: 58px;
          flex-shrink: 0;
        }

        .compact .doc-upload-orbit {
          width: 48px;
          height: 48px;
        }

        .doc-upload-core {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f766e, #2563eb);
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.22em;
          box-shadow: 0 14px 32px rgba(37, 99, 235, 0.24);
        }

        .compact .doc-upload-core {
          border-radius: 15px;
          font-size: 10px;
        }

        .doc-upload-ring {
          position: absolute;
          inset: 0;
          border-radius: 22px;
          border: 1px solid rgba(37, 99, 235, 0.24);
          animation: docUploadPulse 2.4s ease-out infinite;
        }

        .compact .doc-upload-ring {
          border-radius: 18px;
        }

        .ring-two {
          animation-delay: 1.2s;
        }

        .doc-upload-copy {
          min-width: 0;
        }

        .doc-upload-kicker {
          margin: 0 0 4px;
          color: #0f766e;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .doc-upload-title {
          margin: 0;
          color: #0f172a;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.2;
        }

        .compact .doc-upload-title {
          font-size: 14px;
        }

        .doc-upload-hint {
          margin: 6px 0 0;
          color: #475569;
          font-size: 12px;
          line-height: 1.45;
        }

        .compact .doc-upload-hint {
          font-size: 11px;
        }

        .doc-upload-track {
          margin-top: 14px;
          height: 8px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.18);
          overflow: hidden;
        }

        .compact .doc-upload-track {
          margin-top: 12px;
          height: 7px;
        }

        .doc-upload-track span {
          display: block;
          height: 100%;
          width: 42%;
          border-radius: inherit;
          background: linear-gradient(90deg, #0f766e, #38bdf8, #2563eb);
          animation: docUploadSlide 1.8s ease-in-out infinite;
          box-shadow: 0 0 18px rgba(59, 130, 246, 0.28);
        }

        .doc-upload-steps {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .doc-upload-steps span {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(191, 219, 254, 0.9);
          background: rgba(255, 255, 255, 0.86);
          color: #1e3a8a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .compact .doc-upload-steps span {
          padding: 5px 8px;
          font-size: 9px;
        }

        @keyframes docUploadPulse {
          0% {
            transform: scale(0.84);
            opacity: 0;
          }
          35% {
            opacity: 0.45;
          }
          100% {
            transform: scale(1.32);
            opacity: 0;
          }
        }

        @keyframes docUploadSlide {
          0% {
            transform: translateX(-120%);
          }
          55% {
            transform: translateX(92%);
          }
          100% {
            transform: translateX(180%);
          }
        }
      `}</style>
    </div>
  );
}
