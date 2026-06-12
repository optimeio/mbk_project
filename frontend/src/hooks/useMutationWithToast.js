"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import notify from "@/lib/toast";
import getErrorMessage from "@/lib/getErrorMessage";

const resolveToastMessage = (value, ...args) =>
  typeof value === "function" ? value(...args) : value;

const asQueryKeys = (queryKeys = []) =>
  Array.isArray(queryKeys) ? queryKeys.filter(Boolean) : [];

export default function useMutationWithToast({
  mutationFn,
  queryKeys = [],
  toast = {},
  onMutate,
  onSuccess,
  onError,
  ...mutationOptions
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn,
    ...mutationOptions,
    onMutate: async (variables) => {
      if (typeof onMutate === "function") {
        return onMutate(variables);
      }

      return undefined;
    },
    onSuccess: async (data, variables, context) => {
      const keys = asQueryKeys(queryKeys);
      if (keys.length > 0) {
        await Promise.all(
          keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      }

      if (typeof onSuccess === "function") {
        await onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      if (typeof onError === "function") {
        onError(error, variables, context);
      }
    },
  });

  const mutateWithToast = async (variables, toastOverrides = {}) => {
    const toastConfig = { ...toast, ...toastOverrides };

    return notify.promise(mutation.mutateAsync(variables), {
      loading:
        resolveToastMessage(toastConfig.loading, variables) || "Processing...",
      success: (data) =>
        resolveToastMessage(toastConfig.success, data, variables) ||
        "Completed successfully",
      error: (error) =>
        resolveToastMessage(toastConfig.error, error, variables) ||
        getErrorMessage(error),
    });
  };

  return {
    ...mutation,
    mutateWithToast,
  };
}

