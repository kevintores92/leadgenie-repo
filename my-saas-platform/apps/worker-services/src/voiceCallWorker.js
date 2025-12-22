/**
 * Voice Call Worker
 * Processes outbound AI voice calls via Vapi
 */

require('dotenv').config();

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient({ errorFormat: 'pretty' });

function parseRedisConnection() {
  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      const isTLS = u.protocol === 'rediss:';
      return {
        host: u.hostname,
        port: Number(u.port) || (isTLS ? 6380 : 6379),
        password: u.password || process.env.REDIS_PASSWORD || undefined,
        tls: isTLS ? {} : undefined,
      };
    } catch (e) {
      console.warn('Invalid REDIS_URL, falling back to parts', e && e.message);
    }
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  };
}

const redisConnection = parseRedisConnection();
const connection = new IORedis(redisConnection);

const voiceCallQueue = new Queue('voice-calls', { connection });

/**
 * Get Vapi API client
 */
function getVapiClient() {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error('Missing VAPI_API_KEY');

  return axios.create({
    baseURL: 'https://api.vapi.ai',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

/**
 * Build assistant configuration for real estate cold calling
 */
function buildAssistant(contact, callType = 'cold') {
  const { firstName, propertyAddress, status } = contact;

  if (callType === 'warm') {
    return {
      name: 'Real Estate Warm Caller',
      model: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are following up with ${firstName || 'a property owner'} who previously showed interest. Your goal is to move them toward scheduling a property viewing or receiving an offer. Be warm, build rapport, and focus on next steps.`
          }
        ]
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: 'pNInz6obpgDQGcFmaJgB' // Professional male voice
      },
      firstMessage: `Hi ${firstName}, this is calling from [Your Company] following up about${propertyAddress ? ` your property at ${propertyAddress}` : ' your property'}. Do you have a moment?`,
      recordingEnabled: true,
      functions: [
        {
          name: 'updateContactStatus',
          description: 'Update lead status based on conversation',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['HOT', 'WARM', 'NURTURE', 'NOT_INTERESTED', 'WRONG_NUMBER', 'DNC']
              },
              notes: { type: 'string' }
            },
            required: ['status']
          }
        }
      ]
    };
  }

  // Cold calling assistant
  return {
    name: 'Real Estate Cold Caller',
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are a professional real estate investor calling ${firstName || 'a property owner'}${propertyAddress ? ` about their property at ${propertyAddress}` : ''}. 

Your goal: Build rapport, confirm ownership, gauge interest in selling, and qualify the lead as HOT, WARM, or COLD.

Guidelines:
- Be conversational and respectful, never pushy
- Listen for motivation signals (financial stress, relocation, inheritance)
- If not interested, politely thank them and end
- If interested, note key details and motivation level
- Keep calls under 3 minutes unless they're very engaged

Use updateContactStatus to record their interest level.`
        }
      ]
    },
    voice: {
      provider: 'elevenlabs',
      voiceId: 'pNInz6obpgDQGcFmaJgB'
    },
    firstMessage: `Hi ${firstName || 'there'}, this is calling about${propertyAddress ? ` the property at ${propertyAddress}` : ' your property'}. Do you have a quick minute?`,
    recordingEnabled: true,
    functions: [
      {
        name: 'updateContactStatus',
        description: 'Update lead status',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['HOT', 'WARM', 'NURTURE', 'NOT_INTERESTED', 'WRONG_NUMBER', 'DNC']
            },
            notes: { type: 'string' },
            callbackTime: { type: 'string' }
          },
          required: ['status']
        }
      }
    ]
  };
}

/**
 * Voice call worker
 */
const worker = new Worker(
  'voice-calls',
  async (job) => {
    const { contactId, organizationId, callType = 'cold' } = job.data || {};

    if (!contactId || !organizationId) {
      console.warn('[Voice] Missing contactId or organizationId');
      return;
    }

    // Check if organization has AI calls enabled
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || !org.aiCallsEnabled) {
      console.log('[Voice] AI calls not enabled for org:', organizationId);
      return { skipped: true, reason: 'ai_calls_disabled' };
    }

    // Check wallet balance (estimate ~$0.15/minute × 3 minutes = $0.45)
    const estimatedCost = 0.45;
    if (org.walletBalance < estimatedCost) {
      console.log('[Voice] Insufficient balance for org:', organizationId);
      return { skipped: true, reason: 'insufficient_balance' };
    }

    // Get contact details
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { brand: true }
    });

    if (!contact || !contact.phone) {
      console.warn('[Voice] Contact not found or no phone:', contactId);
      return { skipped: true, reason: 'no_phone' };
    }

    // Check if contact opted out
    if (contact.status === 'DNC' || contact.status === 'WRONG_NUMBER') {
      console.log('[Voice] Contact opted out:', contactId);
      return { skipped: true, reason: 'opted_out' };
    }

    // LANDLINE-ONLY ENFORCEMENT: Voice campaigns only call landlines
    // Mobile numbers should go through SMS campaigns after 10DLC approval
    if (contact.phoneType && contact.phoneType !== 'landline') {
      console.log(`[Voice] Skipping ${contact.phoneType} number for cold calling:`, contactId);
      return { skipped: true, reason: 'not_landline' };
    }

    try {
      const vapi = getVapiClient();
      const assistant = buildAssistant(contact, callType);

      // Get Vapi phone number ID from environment
      const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

      // Initiate call
      const callRequest = {
        phoneNumberId, // Optional: your Vapi phone number
        customer: {
          number: contact.phone, // Must be E.164 format
          name: contact.firstName || 'Property Owner'
        },
        assistant,
        metadata: {
          contactId: contact.id,
          organizationId: org.id,
          brandId: contact.brandId,
          callType
        }
      };

      const response = await vapi.post('/call', callRequest);
      const vapiCall = response.data;

      console.log('[Voice] Call initiated:', vapiCall.id, '→', contact.phone);

      // Create initial call record (webhook will update it)
      await prisma.callRecord.create({
        data: {
          vapiCallId: vapiCall.id,
          contactId: contact.id,
          organizationId: org.id,
          direction: 'OUTBOUND',
          status: 'QUEUED',
          toNumber: contact.phone,
          callType: callType.toUpperCase(),
        }
      });

      return { 
        success: true, 
        vapiCallId: vapiCall.id,
        status: vapiCall.status 
      };

    } catch (error) {
      console.error('[Voice] Call failed:', error.response?.data || error.message);
      
      // Log failed call
      await prisma.callRecord.create({
        data: {
          contactId: contact.id,
          organizationId: org.id,
          direction: 'OUTBOUND',
          status: 'FAILED',
          toNumber: contact.phone,
          failureReason: error.message,
        }
      });

      throw error;
    }
  },
  { connection, concurrency: 2 } // Limit concurrent calls
);

worker.on('failed', (job, err) => {
  console.warn('[Voice] Job failed:', job && job.id, err && err.message);
});

worker.on('completed', (job, result) => {
  console.log('[Voice] Job completed:', job.id, result);
});

console.log('Voice call worker running (queue: voice-calls)');

module.exports = { voiceCallQueue };
