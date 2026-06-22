"use client";

import { useState, useEffect } from "react";

import {
  Card,
  Row,
  Col,
  Input,
  Typography,
  Tag,
  Empty,
  Button,
  Avatar,
  Modal,
  Form,
  Upload,
  message,
  Select,
} from "antd";
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  IdcardOutlined,
  FileTextOutlined,
  BankOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  InboxOutlined,
  UserOutlined,
  EditOutlined,
  CameraOutlined,
  PhoneOutlined,
  VerifiedOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import { api } from "@/services/api";
import { getCities } from "@/services/cityService";
import {
  getDocumentImagePreviewCandidates,
  getDocumentImagePreviewUrl,
  getDocumentEmbedUrl,
  getDocumentViewUrl,
  getProfilePictureUrl,
} from "@/utils/imageUtils";
import {
  REQUIRED_TRAINER_DOCUMENTS,
  getDocumentStatusMeta,
} from "@/utils/trainerDocumentWorkflow";

const { Title, Text } = Typography;

const DOCUMENT_PROGRESS_ALIASES = {
  aadharFront: ["aadharFront", "aadhaarFront", "aadhar_front", "aadhaar_front"],
  aadharBack: ["aadharBack", "aadhaarBack", "aadhar_back", "aadhaar_back"],
  aadhaarFront: ["aadharFront", "aadhaarFront", "aadhar_front", "aadhaar_front"],
  aadhaarBack: ["aadharBack", "aadhaarBack", "aadhar_back", "aadhaar_back"],
  degree: ["degreePdf", "degree", "degree_certificate", "degreeCertificate"],
  resume: ["resumePdf", "resume"],
  bank: ["passbook", "bank", "bank_document", "bank_passbook"],
  selfie: ["selfiePhoto", "profilePhoto"],
  passport: ["passportPhoto", "photo"],
  ndaAgreement: ["ndaAgreement", "ntaAgreement", "NDAAgreement"],
};

const normalizeProgressStatus = (status = "") => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "approved") return "APPROVED";
  if (normalized === "rejected") return "REJECTED";
  if (normalized === "pending") return "PENDING";
  return "NOT_SUBMITTED";
};

const resolveTrainerProgressStatus = (trainer, aliases = []) => {
  const progress = trainer?.documentProgress || {};
  const statuses = aliases
    .map((key) => progress?.[key]?.status || null)
    .filter(Boolean);

  if (statuses.length === 0) {
    return "NOT_SUBMITTED";
  }

  if (statuses.every((status) => status === "approved")) {
    return "APPROVED";
  }

  if (statuses.some((status) => status === "rejected")) {
    return "REJECTED";
  }

  if (
    statuses.some((status) => status === "pending") ||
    statuses.some((status) => status === "approved")
  ) {
    return "PENDING";
  }

  return "NOT_SUBMITTED";
};

const buildTrainerDisplayName = (trainer = {}) => {
  const firstName = String(
    trainer?.firstName || trainer?.userId?.firstName || "",
  ).trim();
  const lastName = String(
    trainer?.lastName || trainer?.userId?.lastName || "",
  ).trim();

  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(" ").trim();
  }

  return (
    trainer?.name ||
    trainer?.userId?.name ||
    trainer?.email ||
    trainer?.userId?.email ||
    "Unknown"
  );
};

const buildTrainerEditValues = (trainer = {}, cities = []) => {
  const trainerName = buildTrainerDisplayName(trainer);
  const nameParts = trainerName.split(/\s+/).filter(Boolean);
  const normalizedCityId = trainer?.cityId?._id || trainer?.cityId || "";
  const normalizedCityName = String(
    trainer?.city || trainer?.userId?.city || "",
  ).trim();

  let matchedCityId = normalizedCityId;
  if (!matchedCityId && normalizedCityName && Array.isArray(cities)) {
    const matchedCity = cities.find(
      (city) =>
        String(city?.name || "").trim().toLowerCase() ===
        normalizedCityName.toLowerCase(),
    );
    matchedCityId = matchedCity?._id || matchedCity?.id || "";
  }

  return {
    trainerCode: trainer?.trainerId || trainer?.trainerCode || "",
    email: trainer?.email || trainer?.userId?.email || "",
    firstName:
      String(trainer?.firstName || trainer?.userId?.firstName || "").trim() ||
      nameParts[0] ||
      "",
    lastName:
      String(trainer?.lastName || trainer?.userId?.lastName || "").trim() ||
      (nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""),
    phone:
      trainer?.mobile || trainer?.phone || trainer?.userId?.phoneNumber || "",
    cityId: matchedCityId,
    qualification: trainer?.qualification || "",
    specialization:
      trainer?.specialization || trainer?.userId?.specialization || "",
    experience:
      trainer?.experience === null || trainer?.experience === undefined
        ? trainer?.userId?.experience === null ||
          trainer?.userId?.experience === undefined
          ? ""
          : String(trainer.userId.experience)
        : String(trainer.experience),
    address: trainer?.address || "",
    status: String(
      trainer?.status || trainer?.verificationStatus || "PENDING",
    ).toUpperCase(),
  };
};

const hasTrainerDocumentWorkspaceAccess = (trainer = {}) => {
  const uploadedCount = Number(trainer?.documentSummary?.uploadedCount || 0);
  const documentStatus = String(trainer?.documentStatus || "")
    .trim()
    .toLowerCase();
  const verificationStatus = String(
    trainer?.verificationStatus || trainer?.status || "",
  )
    .trim()
    .toUpperCase();
  const documentProgress = trainer?.documentProgress || {};
  const hasProgressEntries = Object.keys(documentProgress).length > 0;
  const hasDocumentPaths = Object.values(trainer?.documents || {}).some(Boolean);
  const hasAgreementFile = Boolean(
    trainer?.ndaAgreementPdf || trainer?.ntaAgreementPdf || trainer?.NDAAgreementPdf,
  );

  return (
    uploadedCount > 0 ||
    hasProgressEntries ||
    hasDocumentPaths ||
    hasAgreementFile ||
    ["under_review", "approved", "rejected"].includes(documentStatus) ||
    ["APPROVED", "VERIFIED", "REJECTED"].includes(verificationStatus)
  );
};

const hasCompletedNdaAgreementStep = (trainer = {}) => {
  const hasAcceptedAgreement =
    (trainer?.agreementAccepted ?? trainer?.agreementAccepted) !== false;
  const hasSignedAgreement = Boolean(trainer?.signature);
  const hasAgreementFile = Boolean(
    trainer?.ndaAgreementPdf ||
      trainer?.ntaAgreementPdf ||
      trainer?.NDAAgreementPdf ||
      trainer?.documents?.ndaAgreement ||
      trainer?.documents?.ntaAgreement ||
      trainer?.documents?.NDAAgreement,
  );

  return hasAgreementFile || (hasAcceptedAgreement && hasSignedAgreement);
};

const getTrainerPreviewImageCandidates = (trainer = {}, documents = []) => {
  const selfieDocument = documents.find((document) =>
    ["selfiePhoto", "profilePhoto"].includes(document?.documentType),
  );
  const passportDocument = documents.find((document) =>
    ["passportPhoto", "photo"].includes(document?.documentType),
  );

  return Array.from(
    new Set(
      [
        ...getDocumentImagePreviewCandidates(selfieDocument),
        ...getDocumentImagePreviewCandidates(passportDocument),
        ...getDocumentImagePreviewCandidates(trainer?.documentProgress?.selfiePhoto),
        ...getDocumentImagePreviewCandidates(trainer?.documentProgress?.passportPhoto),
        getProfilePictureUrl(
      trainer?.documents?.selfiePhoto ||
        trainer?.documents?.passportPhoto ||
        trainer?.profilePicture ||
        trainer?.userId?.profilePicture ||
        null,
        ),
      ].filter(Boolean),
    ),
  );
};
const getStatusTag = (status) => {
    const s = status?.toUpperCase();
    switch (s) {
      case "APPROVED":
      case "VERIFIED":
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            className="m-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
          >
            Approved
          </Tag>
        );
      case "REJECTED":
        return (
          <Tag
            icon={<CloseCircleOutlined />}
            className="m-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700"
          >
            Rejected
          </Tag>
        );
      case "PENDING":
        return (
          <Tag
            icon={<ClockCircleOutlined />}
            className="m-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"
          >
            Pending
          </Tag>
        );
      default:
        return (
          <Tag
            className="m-0 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
          >
            Not Submitted
          </Tag>
        );
    }
  };

  const getWorkflowTag = (status) => {
    const meta = getDocumentStatusMeta(status);
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const badgeClass =
      normalizedStatus === "under_review"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : normalizedStatus === "approved"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : normalizedStatus === "rejected"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-slate-200 bg-slate-100 text-slate-600";

    return (
      <Tag
        className={`m-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}
      >
        {meta.label}
      </Tag>
    );
  };

  const DocumentCard = ({ title, icon: Icon, children, status }) => (
    <Card
      className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
      title={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Icon className="text-lg" />
            </div>
            <Title level={5} className="mb-0! text-slate-900">
              {title}
            </Title>
          </div>
          {getStatusTag(status)}
        </div>
      }
      variant="borderless"
      styles={{
        header: {
          borderBottom: "1px solid #f1f5f9",
          padding: "14px 18px",
          background: "#ffffff",
        },
        body: { padding: "16px" },
      }}
    >
      {children}
    </Card>
  );

  const DocPreview = ({ doc, label, type, handleDocumentUpload, handleVerifyDoc, setPreviewState }) => {
    const previewCandidates = getDocumentImagePreviewCandidates(doc);
    const documentViewUrl = getDocumentViewUrl(doc);
    const normalizedMimeType = String(doc?.mimeType || "").toLowerCase();
    const isImageDocument = ["image/jpeg", "image/png", "image/jpg"].includes(
      normalizedMimeType,
    );
    const [previewIndex, setPreviewIndex] = useState(0);

    useEffect(() => {
      setPreviewIndex(0);
    }, [
      doc?._id,
      doc?.filePath,
      doc?.driveViewLink,
      doc?.driveDownloadLink,
      doc?.url,
    ]);

    const activePreviewUrl = previewCandidates[previewIndex] || null;
    const showImagePreview = isImageDocument && Boolean(activePreviewUrl);

    const handleOpenDocument = () => {
      if (!doc) {
        return;
      }

      const imageSrc = activePreviewUrl || getDocumentImagePreviewUrl(doc) || documentViewUrl;
      const embedUrl = getDocumentEmbedUrl(doc) || documentViewUrl || "";
      
      if (!documentViewUrl && !imageSrc && !embedUrl) {
        return;
      }

      setPreviewState({
        open: true,
        title: label || doc?.fileName || "Document Preview",
        imageSrc: imageSrc || "",
        embedUrl,
        viewUrl: documentViewUrl || "",
        isImage: isImageDocument,
      });
    };

    const handlePreviewError = () => {
      setPreviewIndex((current) =>
        current + 1 < previewCandidates.length ? current + 1 : previewCandidates.length,
      );
    };

    return (
      <div className="flex min-h-[248px] flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex w-full items-center justify-between gap-3">
          <Text
            strong
            className="block text-xs font-semibold text-slate-500"
          >
            {label}
          </Text>
          <Upload
            showUploadList={false}
            beforeUpload={(file) => handleDocumentUpload(type, file)}
            accept={
              type === "resumePdf"
                ? ".pdf"
                : type === "ndaAgreement"
                  ? ".pdf,.doc,.docx"
                : type === "selfiePhoto" || type === "passportPhoto"
                  ? ".jpg,.jpeg,.png"
                  : ".jpg,.jpeg,.png,.pdf"
            }
          >
            <Button
              size="small"
              icon={<CloudUploadOutlined />}
              className="h-8 rounded-lg border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700"
            >
              {doc ? "Replace" : "Upload"}
            </Button>
          </Upload>
        </div>

        {doc ? (
          <div className="flex w-full flex-1 flex-col">
            {showImagePreview ? (
              <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <img loading="lazy"
                  src={activePreviewUrl}
                  alt="Doc"
                  className="h-full max-h-[180px] w-full cursor-pointer object-contain p-3"
                  onClick={handleOpenDocument}
                  onError={handlePreviewError}
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-6">
                <FileTextOutlined className="mb-2 text-5xl text-slate-400" />
                <Text className="text-[11px] font-medium text-slate-500">
                  {isImageDocument ? "Preview Unavailable" : "Document File"}
                </Text>
              </div>
            )}

            <div className="mt-3 text-center">
              <Text className="block truncate text-sm font-medium text-slate-700">
                {doc.fileName}
              </Text>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  disabled={!documentViewUrl}
                  className="h-8 rounded-lg border-slate-200 px-3 text-[11px] font-medium"
                  onClick={handleOpenDocument}
                >
                  View
                </Button>
                {!!doc?._id && doc.verificationStatus !== "APPROVED" && (
                  <Button
                    size="small"
                    type="primary"
                    className="h-8 rounded-lg border-0 bg-emerald-600 px-3 text-[11px] font-medium shadow-none"
                    onClick={() => handleVerifyDoc(doc._id, "APPROVED")}
                  >
                    Verify
                  </Button>
                )}
                {!!doc?._id && doc.verificationStatus !== "REJECTED" && (
                  <Button
                    size="small"
                    danger
                    className="h-8 rounded-lg px-3 text-[11px] font-medium"
                    onClick={() => handleVerifyDoc(doc._id, "REJECTED")}
                  >
                    Reject
                  </Button>
                )}
              </div>
              {doc.verificationComment && (
                <Text className="mt-3 block text-xs text-rose-500">
                  Reason: {doc.verificationComment}
                </Text>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center">
            <InboxOutlined className="mb-3 text-4xl text-slate-300" />
            <Text className="block text-sm font-medium text-slate-500">
              No document found
            </Text>
            <Text className="mt-1 block text-xs text-slate-400">
              Admin can upload on behalf of trainer
            </Text>
          </div>
        )}
      </div>
    );
  };

const normalizeTrainer = (trainer) => {
  const user = trainer?.userId || {};
  const docs = trainer?.documents || {};
  const hasAnyDoc = [
    docs.selfiePhoto,
    docs.passportPhoto,
    docs.aadharFront,
    docs.aadharBack,
    docs.pan,
    docs.passbook,
    docs.degreePdf,
    docs.resumePdf,
    docs.ndaAgreement,
    docs.ntaAgreement,
    docs.NDAAgreement,
    trainer?.ndaAgreementPdf,
    trainer?.ntaAgreementPdf,
    trainer?.NDAAgreementPdf,
  ].some(Boolean);

  let verificationStatus = trainer?.verificationStatus || trainer?.status;
  if (!verificationStatus) verificationStatus = "NOT_SUBMITTED";
  if (verificationStatus === "PENDING" && !hasAnyDoc) {
    verificationStatus = "NOT_SUBMITTED";
  }

  return {
    ...trainer,
    id: trainer?._id || trainer?.id,
    name: buildTrainerDisplayName(trainer),
    firstName: trainer?.firstName || user?.firstName || "",
    lastName: trainer?.lastName || user?.lastName || "",
    email: user?.email || trainer?.email || "",
    phone: trainer?.mobile || trainer?.phone || user?.phoneNumber || "",
    city: trainer?.city || user?.city || "",
    cityId: trainer?.cityId?._id || trainer?.cityId || "",
    qualification: trainer?.qualification || "",
    specialization:
      trainer?.specialization || user?.specialization || trainer?.qualification || "",
    experience:
      trainer?.experience === null || trainer?.experience === undefined
        ? user?.experience ?? null
        : trainer.experience,
    address: trainer?.address || "",
    trainerId: trainer?.trainerId || trainer?.trainerCode || "N/A",
    verificationStatus,
    documentStatus: trainer?.documentStatus || "pending",
    documentSummary: trainer?.documentSummary || {
      uploadedCount: 0,
      requiredCount: 0,
    },
    documentProgress: trainer?.documentProgress || {},
    missingDocuments: trainer?.missingDocuments || [],
    profilePicture:
      trainer?.documents?.selfiePhoto ||
      trainer?.documents?.passportPhoto ||
      trainer?.profilePicture ||
      user?.profilePicture ||
      "",
  };
};

const synthesizeDocumentsFromTrainer = (trainer) => {
  const docs = trainer?.documents || {};
  const progress = trainer?.documentProgress || {};
  const guessed = [];
  const addDoc = (documentType, filePath) => {
    if (!filePath) return;
    const normalizedStatus = normalizeProgressStatus(
      progress?.[documentType]?.status,
    );
    guessed.push({
      _id: `synthetic-${documentType}`,
      trainerId: trainer?.id,
      documentType,
      fileName: `${documentType}`,
      filePath,
      mimeType: filePath.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "image/jpeg",
      verificationStatus:
        normalizedStatus === "NOT_SUBMITTED" ? "PENDING" : normalizedStatus,
      verificationComment: progress?.[documentType]?.rejectionReason || null,
      synthetic: true,
    });
  };

  addDoc("selfiePhoto", docs.selfiePhoto);
  addDoc("passportPhoto", docs.passportPhoto);
  addDoc("aadharFront", docs.aadharFront);
  addDoc("aadharBack", docs.aadharBack);
  addDoc("pan", docs.pan);
  addDoc("degreePdf", docs.degreePdf);
  addDoc("passbook", docs.passbook);
  addDoc("resumePdf", docs.resumePdf);
  addDoc(
    "ndaAgreement",
    docs.ndaAgreement ||
    docs.ntaAgreement ||
    docs.NDAAgreement ||
    trainer?.ndaAgreementPdf ||
    trainer?.ntaAgreementPdf ||
    trainer?.NDAAgreementPdf,
  );

  return guessed;
};

const TrainerDocuments = () => {
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestedTrainerId, setRequestedTrainerId] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [cities, setCities] = useState([]);
  const [profileImageIndex, setProfileImageIndex] = useState(0);
  const [previewState, setPreviewState] = useState({
    open: false,
    title: "",
    imageSrc: "",
    embedUrl: "",
    viewUrl: "",
    isImage: false,
  });

  const documentWorkspaceTrainers = trainers.filter((trainer) =>
    hasTrainerDocumentWorkspaceAccess(trainer),
  );
  const filteredTrainers = documentWorkspaceTrainers.filter(
    (trainer) =>
      trainer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainer.phone?.includes(searchQuery),
  );

  const fetchTrainerDocuments = async (trainer) => {
    const trainerId = trainer?.id || trainer?._id;
    if (!trainerId) {
      setDocuments(synthesizeDocumentsFromTrainer(trainer || {}));
      return;
    }

    try {
      const data = await api.get(`/trainer-documents/trainer/${trainerId}`);
      const apiDocs = data?.success ? data.data || [] : [];
      const syntheticDocs = synthesizeDocumentsFromTrainer(trainer);
      const existingTypes = new Set(apiDocs.map((d) => d.documentType));
      const merged = [...apiDocs];

      syntheticDocs.forEach((doc) => {
        if (!existingTypes.has(doc.documentType)) {
          merged.push(doc);
        }
      });

      if (data.success) {
        setDocuments(merged);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments(synthesizeDocumentsFromTrainer(trainer));
    }
  };

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const data = await api.get("/trainers");
      const normalized = Array.isArray(data)
        ? data.map(normalizeTrainer)
        : (data.data || []).map(normalizeTrainer);
      const documentWorkspace = normalized.filter((trainer) =>
        hasTrainerDocumentWorkspaceAccess(trainer),
      );

      const selectedTrainerId =
        requestedTrainerId ||
        sessionStorage.getItem("trainerVerificationSelection");

      setTrainers(normalized);
      if (selectedTrainerId) {
        const matchedTrainer = documentWorkspace.find(
          (trainer) => trainer.id === selectedTrainerId,
        );
        if (matchedTrainer) {
          setSelectedTrainer(matchedTrainer);
          fetchTrainerDocuments(matchedTrainer);
        } else if (documentWorkspace.length > 0) {
          setSelectedTrainer(documentWorkspace[0]);
          fetchTrainerDocuments(documentWorkspace[0]);
        } else {
          setSelectedTrainer(null);
          setDocuments([]);
        }
        sessionStorage.removeItem("trainerVerificationSelection");
      } else if (documentWorkspace.length > 0) {
        const stillSelected = documentWorkspace.find(
          (trainer) => trainer.id === (selectedTrainer?.id || selectedTrainer?._id),
        );
        const nextSelection = stillSelected || documentWorkspace[0];
        setSelectedTrainer(nextSelection);
        fetchTrainerDocuments(nextSelection);
      } else {
        setSelectedTrainer(null);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error fetching trainers:", error);
      message.error("Failed to load trainers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncRequestedTrainerId = () => {
      const nextTrainerId =
        new URLSearchParams(window.location.search).get("trainerId") || "";
      setRequestedTrainerId(nextTrainerId);
    };

    syncRequestedTrainerId();
    window.addEventListener("popstate", syncRequestedTrainerId);

    return () => {
      window.removeEventListener("popstate", syncRequestedTrainerId);
    };
  }, []);

  useEffect(() => {
    fetchTrainers();
  }, [requestedTrainerId]);

  useEffect(() => {
    let isMounted = true;

    const fetchCities = async () => {
      try {
        const cityOptions = await getCities();
        if (isMounted) {
          setCities(Array.isArray(cityOptions) ? cityOptions : []);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
    };

    fetchCities();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditModalOpen || !selectedTrainer) {
      return;
    }

    editForm.setFieldsValue(buildTrainerEditValues(selectedTrainer, cities));
  }, [cities, editForm, isEditModalOpen, selectedTrainer]);

  useEffect(() => {
    setProfileImageIndex(0);
  }, [documents, selectedTrainer]);



  const handleTrainerSelect = (trainer) => {
    const trainerId = trainer?.id || trainer?._id;
    if (!trainerId) {
      message.error("Trainer ID missing. Please refresh.");
      return;
    }
    setSelectedTrainer(trainer);
    fetchTrainerDocuments(trainer);
    const nextSearchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    nextSearchParams.set("trainerId", trainerId);
    if (typeof window !== "undefined") {
      const nextQuery = nextSearchParams.toString();
      const nextUrl = nextQuery
        ? `${window.location.pathname}?${nextQuery}`
        : window.location.pathname;
      window.history.replaceState(window.history.state, "", nextUrl);
    }
    setRequestedTrainerId(trainerId);
  };

  const handleVerifyDoc = async (docId, status) => {
    let comment = "";
    if (status === "REJECTED") {
      Modal.confirm({
        title: "Confirm Rejection",
        content: (
          <div className="mt-4">
            <Text className="block mb-2 font-semibold">
              Enter rejection reason:
            </Text>
            <Input.TextArea
              id="rejectionComment"
              placeholder="e.g. Information mismatch or blurry image"
              autoFocus
            />
          </div>
        ),
        onOk: async () => {
          const commentVal = document.getElementById("rejectionComment").value;
          if (!commentVal) {
            message.warning("Please provide a reason for rejection");
            return Promise.reject();
          }
          await executeDocVerification(docId, status, commentVal);
        },
      });
    } else {
      await executeDocVerification(docId, status, "");
    }
  };

  const executeDocVerification = async (docId, status, comment) => {
    if (!docId || String(docId).startsWith("synthetic-")) {
      message.warning("This document cannot be directly verified from records.");
      return;
    }

    try {
      const data = await api.put(`/trainer-documents/${docId}/verify`, {
        verificationStatus: status,
        verificationComment: comment,
      });

      if (data.success) {
        message.success(
          data.message ||
            (status === "REJECTED"
              ? "Document rejected successfully"
              : "Document verified successfully"),
        );
        await fetchTrainers();
      }
    } catch (error) {
      console.error("Error verifying document:", error);
      message.error("Failed to verify document");
    }
  };

  const handleProfileStatus = async (status) => {
    if (status === "REJECTED") {
      Modal.confirm({
        title: "Confirm Profile Rejection",
        content: (
          <div className="mt-4">
            <Text className="block mb-2 font-semibold">
              Enter rejection reason:
            </Text>
            <Input.TextArea
              id="profileRejectionReason"
              placeholder="e.g. Multiple documents are invalid or blurry..."
              autoFocus
              rows={3}
            />
            <Text className="block mt-2 text-xs text-rose-500 font-medium">
              This will notify the trainer to re-upload ALL documents.
            </Text>
          </div>
        ),
        onOk: async () => {
          const reason = document.getElementById(
            "profileRejectionReason",
          ).value;
          if (!reason) {
            message.warning("Please provide a reason for rejection");
            return Promise.reject();
          }
          await executeProfileStatusUpdate(status, reason);
        },
      });
    } else {
      Modal.confirm({
        title: `Confirm ${status === "APPROVED" ? "Approval" : "Status Change"}`,
        content: `Are you sure you want to mark this trainer profile as ${status}?`,
        onOk: () => executeProfileStatusUpdate(status),
      });
    }
  };

  const executeProfileStatusUpdate = async (status, reason = null) => {
    const trainerId = selectedTrainer?.id || selectedTrainer?._id;
    if (!trainerId) {
      message.error("Trainer ID missing. Please refresh and select trainer again.");
      return;
    }

    try {
      const response = await api.put(
        `/trainer-documents/trainer/${trainerId}/status`,
        { status, reason },
      );
      if (response.success) {
        message.success(`Trainer profile ${status} successfully`);
        await fetchTrainers();
      }
    } catch (error) {
      console.error("Error updating profile status:", error);
      message.error("Failed to update profile status");
    }
  };

  const handleEditSave = async (values) => {
    const trainerId = selectedTrainer?.id || selectedTrainer?._id;
    if (!trainerId) {
      message.error("Trainer ID missing. Please refresh and try again.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.put(`/trainers/${trainerId}`, {
        trainerCode: values.trainerCode,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        cityId: values.cityId,
        qualification: values.qualification,
        specialization: values.specialization,
        experience: values.experience,
        address: values.address,
        status: values.status,
      });
      if (response.success || response.message?.includes("successfully")) {
        message.success("Profile updated successfully");
        setIsEditModalOpen(false);
        const updatedTrainer = normalizeTrainer(
          response.data || { ...selectedTrainer, ...values },
        );
        setSelectedTrainer(updatedTrainer);
        setTrainers((prev) =>
          prev.map((t) =>
            (t.id || t._id) === trainerId ? updatedTrainer : t,
          ),
        );
      } else {
        message.error(response.message || "Update failed");
      }
    } catch (error) {
      console.error("Update error:", error);
      message.error("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (documentType, file) => {
    const trainerId = selectedTrainer?.id || selectedTrainer?._id;
    if (!selectedTrainer || !trainerId) {
      message.error("No trainer selected");
      return false;
    }

    const formData = new FormData();
    formData.append("document", file); // Backend expects 'document', not 'file'
    formData.append("documentType", documentType);
    formData.append("targetTrainerId", trainerId); // Backend expects 'targetTrainerId' for SuperAdmin

    try {
      message.loading({ content: "Uploading document...", key: "upload" });
      const response = await api.post("/trainer-documents/upload", formData);

      if (response.success) {
        message.success({
          content: "Document uploaded successfully",
          key: "upload",
        });
        // Refresh documents list
        await fetchTrainerDocuments(selectedTrainer);
      } else {
        message.error({
          content: response.message || "Upload failed",
          key: "upload",
        });
      }
    } catch (error) {
      console.error("Document upload error:", error);
      message.error({
        content: error.message || "Error uploading document",
        key: "upload",
      });
    }

    return false; // Prevent default upload behavior
  };

  // Helper to find doc in list
  const getDoc = (type) => {
    const aliases = DOCUMENT_PROGRESS_ALIASES[type] || [type];
    return documents.find((d) => aliases.includes(d.documentType));
  };



  const requiredDocs = REQUIRED_TRAINER_DOCUMENTS.map(({ key }) => key);
  const allVerified = requiredDocs.every(
    (type) => getDoc(type)?.verificationStatus === "APPROVED",
  );
  const uploadedDocsCount = requiredDocs.filter((type) =>
    Boolean(
      getDoc(type)?._id ||
        getDoc(type)?.filePath ||
        getDoc(type)?.url ||
        getDoc(type)?.driveViewLink ||
        getDoc(type)?.driveDownloadLink,
    ),
  ).length;
  const approvedDocsCount = requiredDocs.filter((type) =>
    ["APPROVED", "VERIFIED"].includes(getDoc(type)?.verificationStatus),
  ).length;
  const rejectedDocsCount = requiredDocs.filter(
    (type) => getDoc(type)?.verificationStatus === "REJECTED",
  ).length;
  const pendingDocsCount = Math.max(
    requiredDocs.length - approvedDocsCount - rejectedDocsCount,
    0,
  );
  const hasCompletedNdaAgreement = hasCompletedNdaAgreementStep(selectedTrainer);
  const canApproveProfile = allVerified && hasCompletedNdaAgreement;
  const selectedPreviewImageCandidates = selectedTrainer
    ? getTrainerPreviewImageCandidates(selectedTrainer, documents)
    : [];
  const selectedPreviewImage =
    selectedPreviewImageCandidates[profileImageIndex] || null;
  const selectedTrainerName = selectedTrainer
    ? buildTrainerDisplayName(selectedTrainer)
    : "";

  return (
    <div className="box-border min-h-screen w-full bg-slate-100 lg:h-[calc(100dvh-64px)] lg:overflow-hidden">
      <Row gutter={[24, 24]} className="h-full min-h-0 items-stretch p-4 lg:flex-nowrap lg:overflow-hidden lg:p-6">
        <Col xs={24} lg={6} className="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden">
          <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <div className="shrink-0">
              <Title level={2} className="mb-1! text-slate-900">
                Review Documents
              </Title>
              <Text className="text-slate-500">
                {documentWorkspaceTrainers.length} trainer
                {documentWorkspaceTrainers.length === 1 ? "" : "s"} available in
                document review.
              </Text>
            </div>

              <Card
                className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
                styles={{
                  body: { padding: 0, display: "flex", flexDirection: "column", minHeight: 0 },
                }}
              >
              <div className="border-b border-slate-100 px-5 py-4">
                <Title level={4} className="mb-3! text-slate-900">
                  Trainer List
                </Title>
                <Input
                  placeholder="Search trainers..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl border-slate-200"
                  allowClear
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                    <Text className="mt-4 block text-sm text-slate-500">
                      Loading trainers...
                    </Text>
                  </div>
                ) : filteredTrainers.length > 0 ? (
                  filteredTrainers.map((trainer) => {
                    const trainerKey = trainer.id || trainer._id || trainer.email;
                    const isSelected =
                      (selectedTrainer?.id || selectedTrainer?._id) ===
                      (trainer.id || trainer._id);
                    const trainerName = buildTrainerDisplayName(trainer);
                    const uploadedCount = trainer?.documentSummary?.uploadedCount || 0;
                    const requiredCount =
                      trainer?.documentSummary?.requiredCount || requiredDocs.length;

                    return (
                      <button
                        key={trainerKey}
                        type="button"
                        onClick={() => handleTrainerSelect(trainer)}
                        className={`w-full border-b border-slate-100 px-4 py-4 text-left transition-colors last:border-b-0 ${
                          isSelected
                            ? "border-l-4 border-l-indigo-600 bg-indigo-50"
                            : "border-l-4 border-l-transparent bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Text strong className="block truncate text-sm text-slate-900">
                              {trainerName}
                            </Text>
                            <Text className="block truncate text-xs text-slate-500">
                              {trainer.email}
                            </Text>
                          </div>
                          <div className="shrink-0">{getWorkflowTag(trainer.documentStatus)}</div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span>{trainer.city || "No city"}</span>
                          <span>
                            {uploadedCount}/{requiredCount} uploaded
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <Empty description="No trainer documents available" className="mt-10" />
                )}
              </div>
            </Card>
          </div>
        </Col>

        <Col xs={24} lg={18} className="lg:flex lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-col">
          {selectedTrainer ? (
            <div className="grid h-full min-h-0 gap-3 lg:grid-rows-[auto,minmax(0,1fr)]">
              <Card
                className="rounded-2xl border border-slate-200 shadow-sm"
                styles={{ body: { padding: 12 } }}
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                  <div className="flex justify-center lg:justify-start">
                    <Avatar
                      size={56}
                      src={selectedPreviewImage}
                      icon={<UserOutlined />}
                      className="border border-slate-200 bg-slate-100"
                      onError={() => {
                        if (profileImageIndex < selectedPreviewImageCandidates.length - 1) {
                          setProfileImageIndex((current) => current + 1);
                        } else {
                          setProfileImageIndex(selectedPreviewImageCandidates.length);
                        }
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <Title level={4} className="mb-0! text-slate-900">
                            {selectedTrainerName}
                          </Title>
                          {getWorkflowTag(selectedTrainer.documentStatus)}
                        </div>
                      </div>

                      <div className="flex w-full flex-wrap gap-2 sm:max-w-none xl:w-auto xl:shrink-0 xl:justify-end">
                        <Button
                          icon={<EditOutlined />}
                          className="h-8 rounded-xl px-3"
                          onClick={() => {
                            editForm.setFieldsValue(buildTrainerEditValues(selectedTrainer, cities));
                            setIsEditModalOpen(true);
                          }}
                        >
                          Edit Details
                        </Button>

                        {selectedTrainer.verificationStatus === "PENDING" ||
                        selectedTrainer.verificationStatus === "NOT_SUBMITTED" ||
                        selectedTrainer.verificationStatus === "REJECTED" ? (
                          <>
                            <Button
                              type="primary"
                              disabled={!canApproveProfile}
                              className="h-8 rounded-xl px-3"
                              onClick={() => handleProfileStatus("APPROVED")}
                              icon={<SafetyCertificateOutlined />}
                            >
                              Approve Profile
                            </Button>
                            <Button
                              danger
                              className="h-8 rounded-xl px-3"
                              onClick={() => handleProfileStatus("REJECTED")}
                              icon={<CloseCircleOutlined />}
                            >
                              Reject Profile
                            </Button>
                          </>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
                            <Text strong className="text-sm text-slate-700">
                              {selectedTrainer.verificationStatus === "APPROVED" ||
                              selectedTrainer.verificationStatus === "VERIFIED"
                                ? "Profile Approved"
                                : "Profile Rejected"}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>

                    {!hasCompletedNdaAgreement && (
                      <Text className="mt-2 block text-xs text-amber-600">
                        Complete the trainer NDA agreement step to enable profile approval.
                      </Text>
                    )}

                    <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:col-span-2 xl:col-span-2">
                        <Text className="text-xs font-medium text-slate-400">Email</Text>
                        <div className="mt-1 break-all text-sm font-medium text-slate-700">
                          {selectedTrainer.email}
                        </div>
                      </div>
                      <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <Text className="text-xs font-medium text-slate-400">Trainer ID</Text>
                        <div className="mt-1 text-sm font-semibold tracking-wide text-slate-700">
                          {selectedTrainer.trainerId}
                        </div>
                      </div>
                      <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <Text className="text-xs font-medium text-slate-400">Phone</Text>
                        <div className="mt-1 text-sm font-medium text-slate-700">
                          {selectedTrainer.phone || "N/A"}
                        </div>
                      </div>
                      <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <Text className="text-xs font-medium text-slate-400">City</Text>
                        <div className="mt-1 text-sm font-medium text-slate-700">
                          {selectedTrainer.city || "Not assigned"}
                        </div>
                      </div>
                      <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <Text className="text-xs font-medium text-slate-400">Qualification</Text>
                        <div className="mt-1 text-sm font-medium text-slate-700">
                          {selectedTrainer.qualification || "N/A"}
                        </div>
                      </div>
                      <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:col-span-2 xl:col-span-2">
                        <Text className="text-xs font-medium text-slate-400">Specialization</Text>
                        <div className="mt-1 text-sm font-medium text-slate-700">
                          {selectedTrainer.specialization || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
                styles={{
                  body: { padding: 0, display: "flex", flexDirection: "column", minHeight: 0 },
                }}
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Title level={4} className="mb-1! text-slate-900">
                        Document Viewer
                      </Title>
                      <Text className="text-sm text-slate-500">
                        Review uploaded files and verify from one place.
                      </Text>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Tag className="m-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        Uploaded {uploadedDocsCount}/{requiredDocs.length}
                      </Tag>
                      <Tag className="m-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        Approved {approvedDocsCount}
                      </Tag>
                      <Tag className="m-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        Pending {pendingDocsCount}
                      </Tag>
                      {rejectedDocsCount > 0 && (
                        <Tag className="m-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                          Rejected {rejectedDocsCount}
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto p-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div>
                      <DocumentCard
                        title="Live Selfie"
                        icon={CameraOutlined}
                        status={
                          getDoc("selfiePhoto")?.verificationStatus ||
                          getDoc("profilePhoto")?.verificationStatus
                        }
                      >
                        <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                          doc={getDoc("selfiePhoto") || getDoc("profilePhoto")}
                          label="Captured Selfie"
                          type="selfiePhoto"
                        />
                      </DocumentCard>
                    </div>

                    <div>
                      <DocumentCard
                        title="Passport Size Photo"
                        icon={UserOutlined}
                        status={
                          getDoc("passportPhoto")?.verificationStatus ||
                          getDoc("passport")?.verificationStatus
                        }
                      >
                        <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                          doc={getDoc("passportPhoto") || getDoc("passport")}
                          label="Uploaded Photo"
                          type="passportPhoto"
                        />
                      </DocumentCard>
                    </div>

                    <div className="xl:col-span-2">
                      <DocumentCard
                        title="Aadhaar Card"
                        icon={IdcardOutlined}
                        status={
                          getDoc("aadhaarFront")?.verificationStatus ===
                            "APPROVED" &&
                          getDoc("aadhaarBack")?.verificationStatus === "APPROVED"
                            ? "APPROVED"
                            : !getDoc("aadhaarFront") && !getDoc("aadhaarBack")
                              ? "NOT_SUBMITTED"
                            : getDoc("aadhaarFront")?.verificationStatus ===
                                  "REJECTED" ||
                                getDoc("aadhaarBack")?.verificationStatus ===
                                  "REJECTED"
                              ? "REJECTED"
                            : "PENDING"
                        }
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                              doc={getDoc("aadhaarFront")}
                              label="Front Side"
                              type="aadhaarFront"
                            />
                          </div>
                          <div>
                            <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                              doc={getDoc("aadhaarBack")}
                              label="Back Side"
                              type="aadhaarBack"
                            />
                          </div>
                        </div>
                      </DocumentCard>
                    </div>

                    <div>
                      <DocumentCard
                        title="PAN Card"
                        icon={FileTextOutlined}
                        status={getDoc("pan")?.verificationStatus}
                      >
                        <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                          doc={getDoc("pan")}
                          label="PAN Document"
                          type="pan"
                        />
                      </DocumentCard>
                    </div>

                    <div>
                      <DocumentCard
                        title="Degree Certificate"
                        icon={ReadOutlined}
                        status={getDoc("degree")?.verificationStatus}
                      >
                        <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                          doc={getDoc("degree")}
                          label="Certificate File"
                          type="degreePdf"
                        />
                      </DocumentCard>
                    </div>

                    <div>
                      <DocumentCard
                        title="Resume / CV"
                        icon={FileTextOutlined}
                        status={getDoc("resume")?.verificationStatus}
                      >
                        <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                          doc={getDoc("resume")}
                          label="Resume File"
                          type="resumePdf"
                        />
                      </DocumentCard>
                    </div>

                    <div>
                      <DocumentCard
                        title="Bank Document"
                        icon={BankOutlined}
                        status={
                          getDoc("bank")?.verificationStatus ||
                          getDoc("passbook")?.verificationStatus
                        }
                      >
                        <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                          doc={getDoc("bank") || getDoc("passbook")}
                          label="Passbook / Cheque"
                          type="passbook"
                        />
                      </DocumentCard>
                    </div>

                    <div className="xl:col-span-2">
                      <DocumentCard
                        title="Official NDA Agreement"
                        icon={VerifiedOutlined}
                        status={
                          selectedTrainer.ndaAgreementPdf ||
                          selectedTrainer.ntaAgreementPdf ||
                          selectedTrainer.NDAAgreementPdf ||
                          getDoc("ndaAgreement")?.verificationStatus
                            ? "APPROVED"
                            : "PENDING"
                        }
                      >
                        <DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}
                          doc={
                            selectedTrainer.ndaAgreementPdf ||
                            selectedTrainer.ntaAgreementPdf ||
                            selectedTrainer.NDAAgreementPdf
                              ? {
                                  filePath:
                                    selectedTrainer.ndaAgreementPdf ||
                                    selectedTrainer.ntaAgreementPdf ||
                                    selectedTrainer.NDAAgreementPdf,
                                  fileName: "NDA_agreement.pdf",
                                  mimeType: "application/pdf",
                                }
                              : getDoc("ndaAgreement")
                          }
                          label="Signed Agreement PDF"
                          type="ndaAgreement"
                        />
                        {(
                          selectedTrainer.ndaAgreementPdf ||
                          selectedTrainer.ntaAgreementPdf ||
                          selectedTrainer.NDAAgreementPdf
                        ) && (
                          <div className="mt-4 flex justify-center">
                            <a
                              href={getProfilePictureUrl(
                                selectedTrainer.ndaAgreementPdf ||
                                  selectedTrainer.ntaAgreementPdf ||
                                  selectedTrainer.NDAAgreementPdf,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-indigo-700"
                            >
                              View NDA Agreement
                            </a>
                          </div>
                        )}
                      </DocumentCard>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="flex h-full min-h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white shadow-sm">
              <Empty
                image={
                  <IdcardOutlined style={{ fontSize: 72, color: "#cbd5e1" }} />
                }
                description={
                  <div className="mt-4">
                    <Text strong className="block text-lg text-slate-700">
                      Select a trainer to view documents
                    </Text>
                    <Text className="mt-2 block text-sm text-slate-500">
                      Choose a trainer from the list to open the saved documents.
                    </Text>
                  </div>
                }
              />
            </Card>
          )}

          <Modal
            open={previewState.open}
            title={previewState.title}
            footer={[
              <Button
                key="close"
                onClick={() => setPreviewState((current) => ({ ...current, open: false }))}
              >
                Close
              </Button>,
              <Button
                key="new-tab"
                type="primary"
                disabled={!previewState.viewUrl}
                onClick={() => {
                  if (previewState.viewUrl) {
                    window.open(previewState.viewUrl, "_blank");
                  }
                }}
              >
                Open in New Tab
              </Button>,
            ]}
            onCancel={() => setPreviewState((current) => ({ ...current, open: false }))}
            centered
            width={960}
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              {previewState.embedUrl?.includes("drive.google.com") ? (
                <iframe
                  src={previewState.embedUrl}
                  title={previewState.title}
                  className="h-[70vh] w-full rounded-lg border-0 bg-white"
                />
              ) : previewState.isImage && previewState.imageSrc ? (
                <img loading="lazy"
                  src={previewState.imageSrc}
                  alt={previewState.title}
                  className="max-h-[70vh] w-full rounded-lg object-contain bg-white"
                />
              ) : previewState.embedUrl || previewState.viewUrl ? (
                <iframe
                  src={previewState.embedUrl || previewState.viewUrl}
                  title={previewState.title}
                  className="h-[70vh] w-full rounded-lg border-0 bg-white"
                />
              ) : (
                <Empty description="Preview unavailable" />
              )}
            </div>
          </Modal>

          <Modal
            title={
              <Title level={4} className="mb-0">
                Edit Trainer Registration Details
              </Title>
            }
            open={isEditModalOpen}
            onCancel={() => setIsEditModalOpen(false)}
            onOk={() => editForm.submit()}
            confirmLoading={loading}
            okText="Save Changes"
            cancelText="Cancel"
            centered
            width={760}
          >
            <Form
              form={editForm}
              layout="vertical"
              onFinish={handleEditSave}
              className="mt-6"
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="trainerCode"
                    label="Trainer ID"
                    rules={[{ required: true, message: "Please input trainer ID" }]}
                  >
                    <Input size="large" placeholder="e.g. MBK001" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: "Please input email" },
                      { type: "email", message: "Please enter a valid email" },
                    ]}
                  >
                    <Input size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[{ required: true, message: "Please input first name" }]}
                  >
                    <Input size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                    rules={[{ required: true, message: "Please input last name" }]}
                  >
                    <Input size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="phone"
                    label="Phone"
                    rules={[
                      { required: true, message: "Please input phone number" },
                      {
                        pattern: /^\d{10}$/,
                        message: "Phone number must be 10 digits",
                      },
                    ]}
                  >
                    <Input size="large" placeholder="10-digit number" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="cityId"
                    label="City"
                    rules={[{ required: true, message: "Please select city" }]}
                  >
                    <Select
                      size="large"
                      placeholder="Select City"
                      options={cities.map((city) => ({
                        value: city._id || city.id || "",
                        label: city.name,
                      }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="qualification" label="Qualification">
                    <Input size="large" placeholder="e.g. B.E CSE" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="specialization" label="Specialization">
                    <Input size="large" placeholder="e.g. IoT, Python" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="experience" label="Years of Experience">
                    <Input size="large" type="number" min={0} placeholder="e.g. 5" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item name="address" label="Full Address">
                    <Input.TextArea
                      rows={3}
                      placeholder="House no, Street, Area"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="status" label="Status">
                <Select
                  size="large"
                  options={[
                    { value: "PENDING", label: "Pending" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "REJECTED", label: "Rejected" },
                  ]}
                />
              </Form.Item>
            </Form>
          </Modal>
        </Col>
      </Row>
    </div>
  );
};

export default TrainerDocuments;
