"use client";

import { useEffect, useRef } from "react";
import {
  Camera,
  FileText,
  Image as ImageIcon,
  MapPin,
  Video,
} from "lucide-react";

const MENU_ITEMS = [
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    iconClass: "text-[#bf59cf]",
    chipClass: "bg-[#bf59cf]/15",
  },
  {
    id: "video",
    label: "Video",
    icon: Video,
    iconClass: "text-[#3b82f6]",
    chipClass: "bg-[#3b82f6]/15",
  },
  {
    id: "document",
    label: "Document",
    icon: FileText,
    iconClass: "text-[#7f66ff]",
    chipClass: "bg-[#7f66ff]/15",
  },
  {
    id: "camera",
    label: "Camera",
    icon: Camera,
    iconClass: "text-[#f97316]",
    chipClass: "bg-[#f97316]/15",
  },
  {
    id: "location",
    label: "Location",
    icon: MapPin,
    iconClass: "text-[#22c55e]",
    chipClass: "bg-[#22c55e]/15",
  },
];

export default function MediaActionsMenu({
  isOpen,
  onClose,
  onSelect,
  isDark,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("touchstart", handleOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`absolute bottom-14 left-0 z-50 w-48 overflow-hidden rounded-xl border shadow-2xl transition-all duration-150 ${
        isDark ? "border-white/10 bg-[#233138]" : "border-black/10 bg-white"
      }`}
    >
      <div className="p-1.5">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                isDark ? "hover:bg-white/10" : "hover:bg-black/5"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${item.chipClass}`}
              >
                <Icon className={`h-4 w-4 ${item.iconClass}`} />
              </span>
              <span
                className={`text-sm font-medium ${
                  isDark ? "text-[#e9edef]" : "text-[#111b21]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
