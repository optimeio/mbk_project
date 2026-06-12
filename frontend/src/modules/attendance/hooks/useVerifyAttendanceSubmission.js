import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  ATTENDANCE_VERIFICATION_QUERY_KEY,
  verifyAttendanceSubmission,
} from "@/modules/attendance/api/attendanceApi";

export default function useVerifyAttendanceSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyAttendanceSubmission,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ATTENDANCE_VERIFICATION_QUERY_KEY,
      });
    },
  });
}

