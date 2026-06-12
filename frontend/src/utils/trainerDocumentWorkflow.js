export const REQUIRED_TRAINER_DOCUMENTS = [
  { key: "selfiePhoto", label: "Live Selfie" },
  { key: "passportPhoto", label: "Passport Photo" },
  { key: "aadharFront", label: "Aadhaar Front" },
  { key: "aadharBack", label: "Aadhaar Back" },
  { key: "pan", label: "PAN Card" },
  { key: "passbook", label: "Bank Proof" },
  { key: "degreePdf", label: "Degree Certificate" },
  { key: "resumePdf", label: "Resume" },
];

export const DOCUMENT_STATUS_META = {
  pending: {
    label: "Pending Docs",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  under_review: {
    label: "Review Docs",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export const getDocumentStatusMeta = (status) =>
  status === "uploaded"
    ? DOCUMENT_STATUS_META.under_review
    : DOCUMENT_STATUS_META[status] || DOCUMENT_STATUS_META.pending;
