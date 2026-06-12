"use client";
import { memo, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    ChatBubbleLeftRightIcon,
    ClockIcon,
    HomeIcon,
} from "@heroicons/react/24/outline";

const MobileTrainerLayout = ({ children }) => {
    const router = useRouter();
    const pathname = usePathname();

    const navItems = useMemo(
        () => [
            { name: "Home", href: "/trainer/dashboard", icon: HomeIcon },
            { name: "Schedule", href: "/trainer/schedule", icon: ClockIcon },
            { name: "Chat", href: "/chat", icon: ChatBubbleLeftRightIcon },
        ],
        [],
    );

    const isNavItemActive = (itemHref) => {
        if (!pathname) return false;
        if (itemHref === "/trainer/dashboard") {
            return pathname === "/trainer/dashboard" || pathname === "/trainer";
        }
        return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Main Content */}
            <div className="px-2 sm:px-4 py-4">
                {children}
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white safe-area-bottom md:hidden">
                <div
                    className="grid gap-0"
                    style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
                >
                    {navItems.map((item) => {
                        const isActive = isNavItemActive(item.href);
                        return (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => router.push(item.href)}
                                className={`flex flex-col items-center justify-center px-1 py-3 transition-colors ${
                                    isActive ? "text-indigo-600" : "text-gray-600 active:bg-gray-100"
                                }`}
                            >
                                <item.icon className="mb-1 h-6 w-6" />
                                <span className="text-xs font-medium">{item.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default memo(MobileTrainerLayout);
