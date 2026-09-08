export const canGenerateTrainerIdCard = (trainer = {}) => {
  if (!trainer) {
    return false;
  }

  if (trainer.canGenerateIdCard === true) {
    return true;
  }

  const status = String(trainer.status || "").trim().toUpperCase();
  const verificationStatus = String(trainer.verificationStatus || "")
    .trim()
    .toUpperCase();
  const registrationStatus = String(trainer.registrationStatus || "")
    .trim()
    .toLowerCase();

  return (
    status === "APPROVED" ||
    verificationStatus === "VERIFIED" ||
    verificationStatus === "APPROVED" ||
    registrationStatus === "approved"
  );
};
