"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { getDocumentImagePreviewCandidates } from "@/utils/imageUtils";
import { canGenerateTrainerIdCard } from "@/utils/trainerIdCard";
import "./TrainerIDCard.css";

const buildTrainerName = (trainer = {}) => {
  if (trainer?.name) {
    return String(trainer.name).trim();
  }

  const parts = [trainer?.firstName, trainer?.lastName]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.join(" ") || "TRAINER";
};

const buildTrainerId = (trainer = {}) =>
  trainer?.trainerId ||
  trainer?.trainerCode ||
  trainer?.trainerProfile?.trainerId ||
  trainer?.userId?.trainerId ||
  "N/A";

const buildPhone = (trainer = {}) =>
  trainer?.phone ||
  trainer?.mobile ||
  trainer?.phoneNumber ||
  trainer?.userId?.phone ||
  "N/A";

const formatPhone = (value) => {
  const rawValue = String(value || "").trim();
  const digits = rawValue.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91 ${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }

  return rawValue || "N/A";
};

const buildSpecialization = (trainer = {}) =>
  trainer?.specialization ||
  trainer?.skill ||
  trainer?.qualification ||
  "TRAINER";

const VerifiedBadge = () => (
  <div className="trainer-id-card__verified" aria-label="Verified trainer">
    <svg
      className="trainer-id-card__verified-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 12.5 10 17l8.5-9" />
    </svg>
  </div>
);

const TrainerIDCard = forwardRef(({ trainer = {} }, ref) => {
  const [imageIndex, setImageIndex] = useState(0);

  const trainerName = buildTrainerName(trainer).toUpperCase();
  const trainerId = buildTrainerId(trainer);
  const trainerPhone = formatPhone(buildPhone(trainer));
  const trainerSpecialization = String(buildSpecialization(trainer)).trim() || "Trainer";
  const isVerified = canGenerateTrainerIdCard(trainer);

  const photoSources = useMemo(() => {
    const sources = [
      trainer?.photo,
      trainer?.documentProgress?.selfiePhoto,
      trainer?.documents?.selfiePhoto,
      trainer?.profilePicture,
      trainer?.documentProgress?.passportPhoto,
      trainer?.documents?.passportPhoto,
      trainer?.userId?.profilePicture,
      trainer?.avatar,
    ];

    return Array.from(
      new Set(
        sources.flatMap((source) => getDocumentImagePreviewCandidates(source)),
      ),
    );
  }, [
    trainer?.photo,
    trainer?.documentProgress?.selfiePhoto,
    trainer?.documents?.selfiePhoto,
    trainer?.profilePicture,
    trainer?.documentProgress?.passportPhoto,
    trainer?.documents?.passportPhoto,
    trainer?.userId?.profilePicture,
    trainer?.avatar,
  ]);

  useEffect(() => {
    setImageIndex(0);
  }, [photoSources]);

  const currentPhoto = photoSources[imageIndex] || "";

  const handleImageError = () => {
    setImageIndex((current) =>
      current < photoSources.length - 1 ? current + 1 : photoSources.length,
    );
  };

  return (
    <div className="trainer-id-card-shell">
      <div ref={ref} id="trainerCard" className="trainer-id-card">
        <div className="trainer-id-card__grain" aria-hidden="true" />
        <div className="trainer-id-card__inner-border" aria-hidden="true" />
        <div className="trainer-id-card__slot" aria-hidden="true" />
        <div className="trainer-id-card__top-wash" aria-hidden="true" />
        <div className="trainer-id-card__footer-band" aria-hidden="true" />

        <div className="trainer-id-card__header">
          <div className="trainer-id-card__logo-shell">
            <img
              src="/n3.webp"
              alt="Naan Mudhalvan"
              className="trainer-id-card__logo"
            />
          </div>
          <div className="trainer-id-card__logo-shell">
            <img
              src="/logos/tamil.png"
              alt="Government of Tamil Nadu"
              className="trainer-id-card__logo"
            />
          </div>
        </div>

        <div className="trainer-id-card__title-block">
          <p className="trainer-id-card__eyebrow">AUTHORIZED TRAINER</p>
          <h2 className="trainer-id-card__title">TRAINER ID</h2>
        </div>

        <div className="trainer-id-card__photo-stage">
          <div className="trainer-id-card__photo-band" aria-hidden="true" />
          <div className="trainer-id-card__photo-frame">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={trainerName}
                className="trainer-id-card__photo"
                onError={handleImageError}
              />
            ) : (
              <div className="trainer-id-card__photo trainer-id-card__photo--fallback">
                {trainerName.charAt(0)}
              </div>
            )}
            {isVerified ? <VerifiedBadge /> : null}
          </div>
        </div>

        <div className="trainer-id-card__identity">
          <h3 className="trainer-id-card__name">{trainerName}</h3>
          <p className="trainer-id-card__skill">{trainerSpecialization}</p>
        </div>

        <div className="trainer-id-card__details">
          <p className="trainer-id-card__detail-line">
            <span className="trainer-id-card__detail-label">Trainer ID:</span>
            <span className="trainer-id-card__detail-value">{trainerId}</span>
          </p>
          <p className="trainer-id-card__detail-line">
            <span className="trainer-id-card__detail-label">Phone:</span>
            <span className="trainer-id-card__detail-value">{trainerPhone}</span>
          </p>
        </div>

        <div className="trainer-id-card__brand">
          <p className="trainer-id-card__brand-name">MBK TECHNOLOGIES</p>
          <p className="trainer-id-card__brand-site">www.mbktechnologies.info</p>
        </div>
      </div>
    </div>
  );
});

TrainerIDCard.displayName = "TrainerIDCard";

export default TrainerIDCard;
