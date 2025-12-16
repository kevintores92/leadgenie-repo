import {
  Flame,
  Sun,
  Sprout,
  Droplets,
  Ban,
  XCircle,
  Slash,
  CircleDashed,
} from "lucide-react";

/** Status configuration with icons, gradient avatars, and colors */
export const STATUS_CONFIG = {
  hot: {
    label: "Hot",
    icon: Flame,
    iconColor: "text-red-600",
    avatarBg: "bg-gradient-to-br from-red-500 to-orange-500",
  },
  warm: {
    label: "Warm",
    icon: Sun,
    iconColor: "text-yellow-600",
    avatarBg: "bg-gradient-to-br from-yellow-400 to-amber-500",
    text: "text-gray-900",
  },
  nurture: {
    label: "Nurture",
    icon: Sprout,
    iconColor: "text-green-600",
    avatarBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
  },
  drip: {
    label: "Drip",
    icon: Droplets,
    iconColor: "text-blue-600",
    avatarBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
  },
  not_interested: {
    label: "Not interested",
    icon: Ban,
    iconColor: "muted-text",
    avatarBg: "bg-gradient-to-br from-gray-400 to-gray-500",
  },
  wrong_number: {
    label: "Wrong number",
    icon: XCircle,
    iconColor: "text-rose-600",
    avatarBg: "bg-gradient-to-br from-rose-500 to-red-500",
  },
  dnc: {
    label: "DNC",
    icon: Slash,
    iconColor: "text-red-700",
    avatarBg: "bg-gradient-to-br from-red-800 to-red-900",
  },
  no_status: {
    label: "No status",
    icon: CircleDashed,
    iconColor: "muted-text",
    avatarBg: "bg-gradient-to-br from-slate-400 to-slate-500",
  },
} as const;

/** Type for status keys */
export type StatusKey = keyof typeof STATUS_CONFIG;

/** Example function to update lead status (replace with your API call) */
export const updateLeadStatus = async (id: string, status: StatusKey) => {
  try {
    // First, update the status via API
    const res = await fetch(`/api/leads/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    const result = await res.json();

    // If selecting drip, try to load and inject the drip popups HTML
    if (status === 'drip') {
      try {
        const pop = await fetch('/api/drip/popups')
        if (pop.ok) {
          const html = await pop.text()
          // Dispatch event so a React host component can render the popup safely
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-drip-popups', { detail: { html, leadId: id } }))
          }
          return { ...result, injected: true }
        } else {
          console.warn(`Failed to load drip popups: ${pop.status} ${pop.statusText}`)
          return { ...result, injected: false }
        }
      } catch (e) {
        console.warn('Error loading drip popups:', e)
        // Still return success - drip status was updated even if popups failed
        return { ...result, injected: false }
      }
    }

    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
