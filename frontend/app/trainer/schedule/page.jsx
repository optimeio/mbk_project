"use client";

import { useEffect, useState } from "react";
import TrainerScheduleClient from "./TrainerScheduleClient";

export default function TrainerSchedulePage() {
  const [initialMonth, setInitialMonth] = useState("");

  useEffect(() => {
    let initialSelectedMonth = new Date().toISOString().slice(0, 7);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const requestedDate = urlParams.get("date");
      if (typeof requestedDate === "string") {
        initialSelectedMonth = requestedDate.slice(0, 7);
      }
    } catch (e) {}
    setInitialMonth(initialSelectedMonth);
  }, []);

  if (!initialMonth) return null; // Wait for client side mounting

  return <TrainerScheduleClient initialSelectedMonth={initialMonth} />;
}

