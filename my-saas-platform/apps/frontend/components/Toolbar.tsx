"use client";

import { useEffect, useState } from "react";
import { Phone, Star, Mail, Trash2, Filter } from "lucide-react";
import CallModal from "./CallModal";
import { initTwilio, startCall } from "@/lib/twilioClient";
import { useConversation } from '@/features/messenger/ConversationProvider';
export default function Toolbar() {
  const [callOpen, setCallOpen] = useState(false);
  const { activeConversation } = useConversation();
  const phoneNumber = activeConversation?.contact?.phone || "+15559876543";
  const fromNumber = activeConversation?.lastFrom || undefined;

  useEffect(() => {
    initTwilio().catch(console.error);
  }, []);

  const handleCall = () => {
    startCall(phoneNumber, fromNumber, () => {
      setCallOpen(false);
    });
    setCallOpen(true);
  };

  return (
    <>
      <div className="h-[60px] px-5 border-b border-border flex items-center bg-surface">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded hover:bg-surface muted-text">
            <Star className="w-4 h-4" />
          </button>

          <button className="p-2 rounded hover:bg-surface muted-text">
            <Mail className="w-4 h-4" />
          </button>

          <button className="p-2 rounded hover:bg-surface muted-text">
            <Trash2 className="w-4 h-4" />
          </button>

          <button className="p-2 rounded hover:bg-surface muted-text">
            <Filter className="w-4 h-4" />
          </button>

          <button
            onClick={handleCall}
            className="p-2 rounded hover:bg-primary/10 text-primary"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <CallModal
        open={callOpen}
        phoneNumber={phoneNumber}
        onClose={() => setCallOpen(false)}
      />
    </>
  );
}
