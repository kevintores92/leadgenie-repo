/**
 * Twilio Subaccount Suspension/Reactivation Helpers
 * Prevents Twilio charges when subscriptions are inactive
 */

import twilio from "twilio";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Suspend Twilio subaccount
 * Prevents all messaging and calling
 */
export async function suspendTwilioSubaccount(
  organizationId: string
): Promise<void> {
  try {
    const sub = await prisma.brand.findFirst({
      where: {
        organization: { id: organizationId },
        twilioSubaccountSid: { not: null },
      },
    });

    if (!sub || !sub.twilioSubaccountSid) {
      console.log(
        `[Twilio] No subaccount found for org: ${organizationId}`
      );
      return;
    }

    // Check if already suspended
    const account = await twilioClient
      .api.accounts(sub.twilioSubaccountSid)
      .fetch();

    if (account.status === "suspended") {
      console.log(
        `[Twilio] Subaccount already suspended: ${sub.twilioSubaccountSid}`
      );
      return;
    }

    // Suspend via API
    await twilioClient
      .api.accounts(sub.twilioSubaccountSid)
      .update({ status: "suspended" });

    console.log(
      `[Twilio] ✓ Suspended subaccount: ${sub.twilioSubaccountSid} for org ${organizationId}`
    );
  } catch (error) {
    console.error(
      `[Twilio] Error suspending subaccount for org ${organizationId}:`,
      error
    );
    throw error;
  }
}

/**
 * Reactivate Twilio subaccount
 * Re-enables messaging and calling
 */
export async function reactivateTwilioSubaccount(
  organizationId: string
): Promise<void> {
  try {
    const sub = await prisma.brand.findFirst({
      where: {
        organization: { id: organizationId },
        twilioSubaccountSid: { not: null },
      },
    });

    if (!sub || !sub.twilioSubaccountSid) {
      console.log(
        `[Twilio] No subaccount found for org: ${organizationId}`
      );
      return;
    }

    // Check if already active
    const account = await twilioClient
      .api.accounts(sub.twilioSubaccountSid)
      .fetch();

    if (account.status === "active") {
      console.log(
        `[Twilio] Subaccount already active: ${sub.twilioSubaccountSid}`
      );
      return;
    }

    // Reactivate via API
    await twilioClient
      .api.accounts(sub.twilioSubaccountSid)
      .update({ status: "active" });

    console.log(
      `[Twilio] ✓ Reactivated subaccount: ${sub.twilioSubaccountSid} for org ${organizationId}`
    );
  } catch (error) {
    console.error(
      `[Twilio] Error reactivating subaccount for org ${organizationId}:`,
      error
    );
    throw error;
  }
}

/**
 * Check if organization can send (Twilio and wallet both valid)
 */
export async function canOrganizationSend(organizationId: string): Promise<boolean> {
  try {
    const wallet = await prisma.organizationWallet.findUnique({
      where: { organizationId },
    });

    const sub = await prisma.organizationSubscription.findUnique({
      where: { organizationId },
    });

    if (!wallet || !sub) return false;
    if (sub.status !== "ACTIVE") return false;
    if (wallet.isFrozen || wallet.balanceCents <= 0) return false;

    return true;
  } catch (error) {
    console.error(
      `[Twilio] Error checking send eligibility for org ${organizationId}:`,
      error
    );
    return false;
  }
}
