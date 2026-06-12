const isObjectLike = (value) => value !== null && typeof value === "object";

export const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;

  if (!isObjectLike(error)) return fallback;

  return (
    error.message ||
    error.response?.message ||
    error.response?.error ||
    error.data?.message ||
    error.error ||
    fallback
  );
};

export default getErrorMessage;

