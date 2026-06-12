"use client";

import { useEffect } from 'react';
import ChatLayout from '../components/ChatLayout';

const trainerPageConfig = {
  badge: "Trainer chat",
  title: "Message your SPOC, follow trainer groups, and stay on top of announcements.",
  description:
    "Trainer chat keeps private SPOC conversations, trainer group coordination, and broadcast announcements in one clean workspace with read receipts, timestamps, files, and threads.",
  highlights: [
    "Private messaging",
    "Trainer groups",
    "Announcements",
    "Images, PDFs, documents",
  ],
  initialTab: "direct",
  tabOrder: ["direct", "group", "announcements"],
  announcementLabel: "Announcement lane",
  announcementDescription:
    "Super Admin can publish organization-wide updates here. Trainers can read and track broadcast announcements in real time.",
};

export default function TrainerDashboard() {
  useEffect(() => {
    document.title = 'Trainer · MBK Chat';
  }, []);

  return <ChatLayout pageConfig={trainerPageConfig} />;
}
