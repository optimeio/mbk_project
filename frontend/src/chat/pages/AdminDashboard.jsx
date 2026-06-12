"use client";

import { useEffect } from 'react';
import ChatLayout from '../components/ChatLayout';

const adminPageConfig = {
  badge: "Admin announcement center",
  title: "Broadcast announcements, monitor group lanes, and keep every trainer and SPOC aligned.",
  description:
    "Super Admin messaging leads with the announcement channel while keeping direct and group conversations visible in the same professional internal communication workspace.",
  highlights: [
    "Announcement channel",
    "Role-aware permissions",
    "Read receipts",
    "Attachment sharing",
  ],
  initialTab: "announcements",
  tabOrder: ["announcements", "group", "direct"],
  announcementLabel: "Global announcement lane",
  announcementDescription:
    "Use this lane to broadcast updates to every trainer and SPOC Admin with Stream-powered history, timestamps, drag-and-drop uploads, and attachment previews.",
};

export default function AdminDashboard() {
  useEffect(() => {
    document.title = 'Super Admin · MBK Chat';
  }, []);

  return <ChatLayout pageConfig={adminPageConfig} />;
}
