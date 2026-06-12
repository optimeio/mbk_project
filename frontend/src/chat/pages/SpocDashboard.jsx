"use client";

import { useEffect } from 'react';
import ChatLayout from '../components/ChatLayout';

const spocPageConfig = {
  badge: "SPOC collaboration",
  title: "Coordinate trainers, respond in private, and manage updates from one communication hub.",
  description:
    "SPOC Admin chat is optimized for trainer group messaging, direct support conversations, announcements, file sharing, and fast operational follow-up across the portal.",
  highlights: [
    "SPOC to trainer chat",
    "Trainer groups",
    "Announcements",
    "Drag and drop uploads",
  ],
  initialTab: "group",
  tabOrder: ["group", "direct", "announcements"],
  announcementLabel: "Broadcast lane",
  announcementDescription:
    "Super Admin announcements land here for all trainers and SPOC Admins. Use group and direct channels alongside it for day-to-day coordination.",
};

export default function SpocDashboard() {
  useEffect(() => {
    document.title = 'SPOC Admin · MBK Chat';
  }, []);

  return <ChatLayout pageConfig={spocPageConfig} />;
}
