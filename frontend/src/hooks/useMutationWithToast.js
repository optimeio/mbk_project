"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import notify from "@/lib/toast";
import getErrorMessage from "@/lib/getErrorMessage";

const resolveToastMessage = (value, ...args) =>
  typeof value === "function" ? value(...args) : value;

const asQueryKeys = (queryKeys = []) =>
  Array.isArray(queryKeys) ? queryKeys.filter(Boolean) : [];

// Add timeout to promises - prevents indefinite hangs
const withTimeout = (promise, ms = 30000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error(`Operation timed out after ${ms}ms`)),
      ms
    );
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

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

    // ADDED: 30 second timeout to prevent infinite hangs
    return notify.promise(withTimeout(mutation.mutateAsync(variables), 30000), {
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

