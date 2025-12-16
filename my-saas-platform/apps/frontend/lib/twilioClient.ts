import { Device, Call } from "@twilio/voice-sdk";

let device: Device | null = null;
let activeCall: Call | null = null;

export async function initTwilio() {
  if (device) return device;

  const res = await fetch("/api/twilio/token");
  if (!res.ok) throw new Error("Failed to fetch Twilio token");

  const { token } = await res.json();

  device = new Device(
    token,
    // cast options to any to avoid SDK typing incompatibilities in this build
    ({
      codecPreferences: ["opus", "pcmu"] as any,
      enableRingingState: true,
    } as any)
  );

  device.on("error", console.error);

  await device.register();
  return device;
}

export function startCall(to: string, from?: string | undefined, onDisconnect?: () => void) {
  if (!device) throw new Error("Twilio not initialized");
  const params: Record<string, string> = { To: to };
  if (from) params.From = from;

  // device.connect may have differing return typings across SDK versions; cast to any
  activeCall = (device.connect({ params }) as any) as Call;

  activeCall.on("disconnect", () => {
    activeCall = null;
    if (onDisconnect) onDisconnect();
  });

  return activeCall;
}

export function hangupCall() {
  activeCall?.disconnect();
  activeCall = null;
}

export function toggleMute(muted: boolean) {
  if (!activeCall) return;
  activeCall.mute(muted);
}

export function hasActiveCall() {
  return !!activeCall;
}
