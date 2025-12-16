"use client";

import { PhoneOff, Mic, MicOff } from "lucide-react";
import { useState } from "react";
import { hangupCall, toggleMute } from "@/lib/twilioClient";
import { useCallTimer } from "../hooks/useCallTimer";


type Props = {
  open: boolean;
  phoneNumber: string;
  onClose: () => void;
};

export default function CallModal({ open, phoneNumber, onClose }: Props) {
  const [muted, setMuted] = useState(false);
  const timer = useCallTimer(open);

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 w-[260px] rounded-xl shadow-lg border border-border bg-surface p-4 z-50">
      <div className="text-sm font-semibold text-foreground">Calling</div>

      <div className="text-xs muted-text mt-1">{phoneNumber}</div>

      <div className="text-center text-lg font-mono mt-3">{timer}</div>

      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={() => {
            const next = !muted;
            setMuted(next);
            toggleMute(next);
          }}
          className="p-2 rounded-full border hover:bg-surface"
        >
          {muted ? (
            <MicOff className="w-4 h-4 muted-text" />
          ) : (
            <Mic className="w-4 h-4 muted-text" />
          )}
        </button>

        <button
          onClick={() => {
            hangupCall();
            onClose();
          }}
          className="p-2 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
