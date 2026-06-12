"use client";

export const formatGeoValidationSourceLabel = (value) => {
    const normalized = String(value || "").trim().toLowerCase();

    if (normalized === "exif") return "EXIF";
    if (normalized === "ocr") return "OCR Stamp";
    if (normalized === "hybrid") return "EXIF + OCR";
    return "Unknown Source";
};

const formatCoordinateValue = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(6) : "N/A";
};

const formatDistanceValue = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)} km` : "N/A";
};

const formatEvidenceDateTime = (value) => {
    if (!value) return "N/A";

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";

    return parsed.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const formatMatchLabel = (value) => {
    if (value === true) return "YES";
    if (value === false) return "NO";
    return "N/A";
};

const MetricItem = ({ label, value }) => (
    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-1 break-words text-[11px] font-semibold text-slate-700">{value}</p>
    </div>
);

const GeoVerificationReportCard = ({
    report,
    source,
    title = "Verification Report",
    className = "",
    showOcrText = true,
}) => {
    if (!report || typeof report !== "object") {
        return null;
    }

    const resolvedSource = source || report.source || "unknown";
    const comparisons = report.comparisons || {};
    const ocrText = typeof report?.ocr?.text === "string" ? report.ocr.text.trim() : "";

    return (
        <div className={`rounded-2xl border border-slate-200 bg-slate-50/90 p-3 ${className}`.trim()}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                    {formatGeoValidationSourceLabel(resolvedSource)}
                </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <MetricItem
                    label="EXIF Location"
                    value={`${formatCoordinateValue(report?.exif?.latitude)}, ${formatCoordinateValue(report?.exif?.longitude)}`}
                />
                <MetricItem
                    label="OCR Location"
                    value={`${formatCoordinateValue(report?.ocr?.latitude)}, ${formatCoordinateValue(report?.ocr?.longitude)}`}
                />
                <MetricItem
                    label="EXIF Time"
                    value={formatEvidenceDateTime(report?.exif?.capturedAt || report?.exif?.timestamp)}
                />
                <MetricItem
                    label="OCR Time"
                    value={formatEvidenceDateTime(report?.ocr?.capturedAt || report?.ocr?.timestamp)}
                />
                <MetricItem label="Geo Match" value={formatMatchLabel(comparisons.geoMatch)} />
                <MetricItem label="Time Match" value={formatMatchLabel(comparisons.timeMatch)} />
                <MetricItem label="Distance" value={formatDistanceValue(comparisons.distanceKm)} />
                <MetricItem
                    label="College Location"
                    value={`${formatCoordinateValue(comparisons.collegeLatitude)}, ${formatCoordinateValue(comparisons.collegeLongitude)}`}
                />
                <MetricItem label="Assigned Date" value={comparisons.assignedDate || "N/A"} />
                <MetricItem label="Detected Date" value={comparisons.detectedDate || "N/A"} />
            </div>

            {showOcrText && ocrText ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">OCR Read</p>
                    <p className="mt-1 break-words text-[11px] leading-5 text-slate-600">{ocrText}</p>
                </div>
            ) : null}
        </div>
    );
};

export default GeoVerificationReportCard;
