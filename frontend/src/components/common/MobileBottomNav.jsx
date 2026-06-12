"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Home, Users, Calendar, Clock, MoreHorizontal,
  CreditCard, Building2, MessageSquareMore, Receipt,
  HandCoins, BarChart3, BadgeCheck,
} from "lucide-react";

// Max 5 items per role for mobile UX
const NAV_MAP = {
  SuperAdmin: [
    { name: "Home",      href: "/dashboard",                 icon: Home },
    { name: "Trainers",  href: "/dashboard/trainers",        icon: Users },
    { name: "Chat",      href: "/chat",                      icon: MessageSquareMore },
    { name: "Salary",    href: "/dashboard/salary",          icon: HandCoins },
    { name: "More",      href: "/dashboard/accounts",        icon: MoreHorizontal },
  ],
  SPOCAdmin: [
    { name: "Home",      href: "/spoc/dashboard",            icon: Home },
    { name: "Schedule",  href: "/spoc/schedule",             icon: Calendar },
    { name: "Check-In",  href: "/spoc/attendance",           icon: BadgeCheck },
    { name: "Chat",      href: "/chat",                      icon: MessageSquareMore },
    { name: "More",      href: "/spoc/trainers",             icon: MoreHorizontal },
  ],
  CollegeAdmin: [
    { name: "Home",      href: "/spoc/dashboard",            icon: Home },
    { name: "Schedule",  href: "/spoc/schedule",             icon: Calendar },
    { name: "Check-In",  href: "/spoc/attendance",           icon: BadgeCheck },
    { name: "Chat",      href: "/chat",                      icon: MessageSquareMore },
    { name: "More",      href: "/spoc/trainers",             icon: MoreHorizontal },
  ],
  Accountant: [
    { name: "Home",      href: "/accountant/dashboard",      icon: Home },
    { name: "Salary",    href: "/accountant/salary",         icon: HandCoins },
    { name: "Payslips",  href: "/accountant/payslips",       icon: Receipt },
    { name: "Reports",   href: "/accountant/reports",        icon: BarChart3 },
    { name: "More",      href: "/accountant/settings",       icon: MoreHorizontal },
  ],
  Trainer: [
    { name: "Home",      href: "/trainer/dashboard",         icon: Home },
    { name: "Schedule",  href: "/trainer/schedule",          icon: Calendar },
    { name: "Payslips",  href: "/trainer/payslips",          icon: Receipt },
    { name: "Chat",      href: "/chat",                      icon: MessageSquareMore },
  ],
  Student: [
    { name: "Home",      href: "/student/dashboard",         icon: Home },
    { name: "Courses",   href: "/student/courses",           icon: Calendar },
    { name: "Chat",      href: "/chat",                      icon: MessageSquareMore },
    { name: "More",      href: "/student/profile",           icon: MoreHorizontal },
  ],
  Company: [
    { name: "Home",      href: "/company/dashboard",         icon: Home },
    { name: "Trainers",  href: "/company/hiring",            icon: Users },
    { name: "Sessions",  href: "/company/sessions",          icon: Calendar },
    { name: "Chat",      href: "/chat",                      icon: MessageSquareMore },
    { name: "More",      href: "/company/profile",           icon: MoreHorizontal },
  ],
};

const normalizeMobileRole = (role = "") => {
  const token = String(role || "").trim().toLowerCase();
  if (token === "superadmin" || token === "admin") return "SuperAdmin";
  if (token === "spocadmin" || token === "spoc") return "SPOCAdmin";
  if (token === "collegeadmin") return "CollegeAdmin";
  if (token === "trainer") return "Trainer";
  if (token === "accountant") return "Accountant";
  if (token === "company" || token === "companyadmin") return "Company";
  if (token === "student") return "Student";
  return "Student";
};

export default function MobileBottomNav() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const role = normalizeMobileRole(currentUser?.role);

  const links = NAV_MAP[role] || NAV_MAP.Student;

  return (
    <div
      className="wa-global-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <nav className="flex justify-around items-center h-16 px-2 relative">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/trainer/dashboard" && pathname.startsWith(link.href) && link.href !== "/");

          return (
            <Link
              key={link.name}
              href={link.href}
              className="relative flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-bubble"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <link.icon
                className={`w-5 h-5 z-10 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium z-10 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
