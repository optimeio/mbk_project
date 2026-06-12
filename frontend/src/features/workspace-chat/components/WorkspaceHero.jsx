import {
  Megaphone,
  MessageSquareMore,
  Paperclip,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const featurePills = [
  { icon: MessageSquareMore, label: "Private messaging" },
  { icon: Users, label: "Trainer groups" },
  { icon: Megaphone, label: "Announcements" },
  { icon: Paperclip, label: "Files, emoji, drag & drop" },
];

const WorkspaceHero = ({ activeRole }) => (
  <section className="overflow-hidden rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_30%),linear-gradient(135deg,#12374A_0%,#1D5B77_55%,#D97706_145%)] p-6 text-white shadow-[0_28px_70px_rgba(21,62,83,0.24)]">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-4xl">
        <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
          Internal messaging system
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          WhatsApp-speed conversations with Slack-style structure for trainers, SPOC Admins, and Super Admins.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/80">
          Private chats, trainer groups, announcement broadcasts, read receipts, attachment previews, typing indicators, and threaded conversations now live in one role-aware workspace.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {featurePills.map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm"
            >
              <pill.icon className="h-3.5 w-3.5" />
              {pill.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            <ShieldCheck className="h-3.5 w-3.5" />
            Active role
          </p>
          <p className="mt-2 text-lg font-bold">{activeRole}</p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  </section>
);

export default WorkspaceHero;
