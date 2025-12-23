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

/**
 * Generate Twilio Voice SDK access token for click-to-call
 */
router.post('/token', async (req, res) => {
  const orgId = req.auth.organizationId;
  const { identity } = req.body; // User identity

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { brands: true }
    });

    if (!org || !org.brands || org.brands.length === 0) {
      return res.status(404).json({ error: 'No brand found' });
    }

    const brand = org.brands[0]; // Use first brand

    if (!brand.twilioSubaccountSid || !brand.twilioTwiMLAppSid) {
      return res.status(400).json({ error: 'Twilio subaccount not configured' });
    }

    const AccessToken = require('twilio').jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: brand.twilioTwiMLAppSid,
      incomingAllow: true,
    });

    const token = new AccessToken(
      brand.twilioSubaccountSid,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: identity || `user-${orgId}` }
    );

    token.addGrant(voiceGrant);

    res.json({ token: token.toJwt() });
  } catch (error) {
    console.error('Voice token error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * TwiML webhook for voice calls
 */
router.post('/twilio/voice', async (req, res) => {
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const { To, From } = req.body;

  // Dial the destination number
  twiml.dial({
    record: 'record-from-answer',
    callerId: From
  }, To);

  res.type('text/xml');
  res.send(twiml.toString());
});

/**
 * Twilio status callback for voice calls
 */
router.post('/twilio/status', async (req, res) => {
  const { CallSid, CallStatus, RecordingUrl, Duration, Direction, From } = req.body;

  console.log('Call status:', CallSid, CallStatus, 'Direction:', Direction, 'From:', From);

  // Update call record if exists
  try {
    await prisma.callRecord.updateMany({
      where: { twilioCallSid: CallSid },
      data: {
        status: CallStatus,
        recordingUrl: RecordingUrl,
        duration: Duration ? parseInt(Duration) : undefined,
        endedAt: CallStatus === 'completed' ? new Date() : undefined
      }
    });

    // For manual outgoing calls, deduct $0.02 per minute
    // Direction should be 'outbound-api' for calls made via REST API (Twilio Client)
    // Note: This is different from SMS where outbound-api is for campaigns
    if (CallStatus === 'completed' && Direction === 'outbound-api' && Duration) {
      const durationMinutes = Math.ceil(parseInt(Duration) / 60);
      const cost = durationMinutes * 0.02;

      // Find org from From number
      const phoneNumber = await prisma.phoneNumber.findFirst({
        where: { phoneNumber: From },
        include: { organization: true }
      });

      if (phoneNumber) {
        await prisma.organization.update({
          where: { id: phoneNumber.organizationId },
          data: { walletBalance: { decrement: cost } }
        });

        await prisma.usage.create({
          data: {
            organizationId: phoneNumber.organizationId,
            type: 'MANUAL_VOICE_CALL',
            cost: cost
          }
        });

        console.log(`Deducted $${cost.toFixed(2)} for manual call (${durationMinutes} min, Direction: ${Direction})`);
      } else {
        console.log('Could not find phone number for billing:', From);
      }
    }
  } catch (error) {
    console.error('Status callback error:', error);
  }

  res.json({ success: true });
});
