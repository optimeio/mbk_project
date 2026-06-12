import TrainerScheduleClient from "./TrainerScheduleClient";

export default async function TrainerSchedulePage({ searchParams }) {
  const resolvedParams = await searchParams;
  const requestedDate =
    typeof resolvedParams?.date === "string" ? resolvedParams.date : null;
  const initialSelectedMonth = requestedDate
    ? requestedDate.slice(0, 7)
    : new Date().toISOString().slice(0, 7);

  return <TrainerScheduleClient initialSelectedMonth={initialSelectedMonth} />;
}
