import { Megaphone, MessagesSquare, Users } from "lucide-react";

export const TABS = [
  {
    id: "direct",
    label: "Private chats",
    description: "Trainer to SPOC conversations",
    icon: MessagesSquare,
  },
  {
    id: "group",
    label: "Trainer groups",
    description: "SPOC-led group messaging",
    icon: Users,
  },
  {
    id: "announcements",
    label: "Announcements",
    description: "Super Admin broadcast channel",
    icon: Megaphone,
  },
];

export const SORT = [{ last_message_at: -1 }, { updated_at: -1 }];

export const QUERY_OPTIONS = {
  limit: 30,
  presence: true,
  state: true,
  watch: true,
};
