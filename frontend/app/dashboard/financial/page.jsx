import { redirect } from "next/navigation";

export default function FinancialReportsPage() {
  redirect("/dashboard/salary?view=financial");
}
