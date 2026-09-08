import { redirect } from "next/navigation";

export default function ActivityLogsPage() {
  redirect("/dashboard/accounts?view=activity");
}
