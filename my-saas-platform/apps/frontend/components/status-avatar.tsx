"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { STATUS_CONFIG, StatusKey } from "@/lib/status";
import { cn } from "@/lib/utils";

type StatusAvatarProps = {
  name: string;
  status?: StatusKey;
  imageUrl?: string;
  onStatusChange?: (status: StatusKey) => void;
};

export function StatusAvatar({
  name,
  status = "no_status",
  imageUrl,
  onStatusChange,
}: StatusAvatarProps) {
  const [open, setOpen] = React.useState(false);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const current = (STATUS_CONFIG as Record<string, any>)[status] ?? STATUS_CONFIG.no_status;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Avatar */}
      <AvatarPrimitive.Root className="h-10 w-10 rounded-full overflow-hidden cursor-pointer">
        {imageUrl && (
          <AvatarPrimitive.Image
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        )}

        <AvatarPrimitive.Fallback
          className={cn(
            "flex h-full w-full items-center justify-center font-medium",
            // prefer explicit text color from config, otherwise white
            current.text ?? "text-white",
            current.avatarBg
          )}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {/* Status picker */}
      <div
        className={cn(
          "absolute left-full top-1/2 ml-2 -translate-y-1/2",
          "bg-surface border border-border rounded-lg shadow-lg",
          "flex items-center gap-1 px-2 py-1",
          "transition-all duration-150 ease-out",
          open
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-2 pointer-events-none"
        )}
      >
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;

          return (
            <button
              key={key}
              onClick={() =>
                onStatusChange?.(key as StatusKey)
              }
              title={cfg.label}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface"
            >
              <Icon
                className={`w-4 h-4 ${cfg.iconColor}`}
                strokeWidth={2.5}
              />
              <span className="text-xs muted-text whitespace-nowrap">
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
