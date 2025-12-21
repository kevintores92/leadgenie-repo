/**
 * Voice call webhooks and endpoints for Vapi integration
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Vapi webhook events
// https://docs.vapi.ai/webhooks

/**
 * Vapi webhook handler
 * Receives events: call.started, call.ended, function-call, etc.
 */
router.post('/vapi/webhook', async (req, res) => {
  const event = req.body;
  
  console.log('[Vapi Webhook]', event.type, event.call?.id);

  try {
    switch (event.type) {
      case 'call.started':
        await handleCallStarted(event);
        break;
      
      case 'call.ended':
        await handleCallEnded(event);
        break;
      
      case 'function-call':
        await handleFunctionCall(event);
        break;
      
      case 'transcript':
        await handleTranscript(event);
        break;
      
      default:
        console.log('[Vapi] Unhandled event type:', event.type);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Vapi] Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle call started event
 */
async function handleCallStarted(event) {
  const { call } = event;
  const { id: vapiCallId, customer, metadata } = call;

  // Extract contact info from metadata
  const contactId = metadata?.contactId;
  const organizationId = metadata?.organizationId;

  if (!contactId || !organizationId) {
    console.warn('[Vapi] Call started without contactId/organizationId:', vapiCallId);
    return;
  }

  // Create call record in database
  await prisma.callRecord.create({
    data: {
      vapiCallId,
      contactId,
      organizationId,
      direction: 'OUTBOUND',
      status: 'IN_PROGRESS',
      toNumber: customer.number,
      startedAt: new Date(),
    }
  });

  console.log('[Vapi] Call started:', vapiCallId, '→', customer.number);
}

/**
 * Handle call ended event
 */
async function handleCallEnded(event) {
  const { call } = event;
  const { id: vapiCallId, transcript, recordingUrl, summary, duration, cost, endedReason } = call;

  // Update call record
  const callRecord = await prisma.callRecord.findFirst({
    where: { vapiCallId },
    include: { contact: true }
  });

  if (!callRecord) {
    console.warn('[Vapi] Call ended but no record found:', vapiCallId);
    return;
  }

  await prisma.callRecord.update({
    where: { id: callRecord.id },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
      duration,
      transcript,
      recordingUrl,
      summary,
      cost,
      endedReason,
    }
  });

  // Update contact's last call time
  await prisma.contact.update({
    where: { id: callRecord.contactId },
    data: {
      lastCallAt: new Date(),
      callCount: { increment: 1 }
    }
  });

  // Log usage for billing
  if (cost) {
    await prisma.usage.create({
      data: {
        organizationId: callRecord.organizationId,
        type: 'AI_VOICE_CALL',
        cost: cost,
      }
    });

    // Deduct from wallet
    await prisma.organization.update({
      where: { id: callRecord.organizationId },
      data: {
        walletBalance: { decrement: cost }
      }
    });
  }

  console.log('[Vapi] Call ended:', vapiCallId, 'Duration:', duration, 'Cost:', cost);
}

/**
 * Handle function call from AI assistant
 * This is when the AI calls updateContactStatus or scheduleAppointment
 */
async function handleFunctionCall(event) {
  const { call, functionCall } = event;
  const { vapiCallId } = call;
  const { name, parameters } = functionCall;

  console.log('[Vapi] Function called:', name, parameters);

  // Find the call record
  const callRecord = await prisma.callRecord.findFirst({
    where: { vapiCallId },
    include: { contact: true }
  });

  if (!callRecord) {
    console.warn('[Vapi] Function call but no record found:', vapiCallId);
    return { success: false, message: 'Call record not found' };
  }

  try {
    if (name === 'updateContactStatus') {
      const { status, notes, callbackTime } = parameters;

      await prisma.contact.update({
        where: { id: callRecord.contactId },
        data: {
          status: status || callRecord.contact.status,
          notes: notes ? `${callRecord.contact.notes || ''}\n[AI Call ${new Date().toISOString()}]: ${notes}`.trim() : callRecord.contact.notes,
          callbackTime: callbackTime || callRecord.contact.callbackTime,
        }
      });

      console.log('[Vapi] Updated contact status:', callRecord.contactId, '→', status);
      
      return { 
        success: true, 
        message: `Contact status updated to ${status}` 
      };
    }

    if (name === 'scheduleAppointment') {
      const { appointmentType, preferredDate, notes } = parameters;

      // Create activity/appointment record
      await prisma.activity.create({
        data: {
          organizationId: callRecord.organizationId,
          contactId: callRecord.contactId,
          type: 'APPOINTMENT_SCHEDULED',
          description: `${appointmentType} scheduled for ${preferredDate}`,
          notes: notes || '',
          scheduledFor: new Date(preferredDate),
        }
      });

      // Update contact status to HOT
      await prisma.contact.update({
        where: { id: callRecord.contactId },
        data: { status: 'HOT' }
      });

      console.log('[Vapi] Appointment scheduled:', appointmentType, preferredDate);
      
      return { 
        success: true, 
        message: `Appointment scheduled for ${preferredDate}` 
      };
    }

    return { success: false, message: 'Unknown function' };
  } catch (error) {
    console.error('[Vapi] Function call error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Handle real-time transcript updates
 */
async function handleTranscript(event) {
  const { call, transcript } = event;
  const { vapiCallId } = call;

  // Update call record with latest transcript
  await prisma.callRecord.updateMany({
    where: { vapiCallId },
    data: {
      transcript: transcript.text,
      updatedAt: new Date(),
    }
  });
}

module.exports = router;
