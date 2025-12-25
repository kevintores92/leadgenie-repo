/**
 * Vapi AI Voice Service
 * Handles AI voice calls for lead qualification
 */

import axios, { AxiosInstance } from 'axios';

interface VapiConfig {
  apiKey: string;
  baseUrl?: string;
}

interface VapiCallRequest {
  phoneNumberId?: string; // Your Vapi phone number ID
  customer: {
    number: string; // E.164 format
    name?: string;
  };
  assistantId?: string; // Pre-configured assistant
  assistant?: VapiAssistant; // Or define inline
  metadata?: Record<string, any>;
}

interface VapiAssistant {
  name: string;
  model: {
    provider: 'openai';
    model: 'gpt-4' | 'gpt-3.5-turbo';
    temperature?: number;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
  };
  voice: {
    provider: 'elevenlabs' | 'playht' | 'deepgram';
    voiceId: string;
  };
  firstMessage?: string;
  recordingEnabled?: boolean;
  endCallFunctionEnabled?: boolean;
  functions?: VapiFunction[];
}

interface VapiFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

interface VapiCall {
  id: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  phoneNumberId?: string;
  customer: {
    number: string;
  };
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  duration?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

export class VapiService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: VapiConfig) {
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.vapi.ai',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Initiate an outbound call
   */
  async createCall(request: VapiCallRequest): Promise<VapiCall> {
    try {
      const response = await this.client.post('/call', request);
      return response.data;
    } catch (error: any) {
      console.error('[Vapi] Failed to create call:', error.response?.data || error.message);
      throw new Error(`Vapi call creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get call details
   */
  async getCall(callId: string): Promise<VapiCall> {
    try {
      const response = await this.client.get(`/call/${callId}`);
      return response.data;
    } catch (error: any) {
      console.error('[Vapi] Failed to get call:', error.response?.data || error.message);
      throw new Error(`Vapi get call failed: ${error.message}`);
    }
  }

  /**
   * End an ongoing call
   */
  async endCall(callId: string): Promise<void> {
    try {
      await this.client.post(`/call/${callId}/end`);
    } catch (error: any) {
      console.error('[Vapi] Failed to end call:', error.response?.data || error.message);
      throw new Error(`Vapi end call failed: ${error.message}`);
    }
  }

  /**
   * List all calls with optional filters
   */
  async listCalls(filters?: { 
    limit?: number;
    assistantId?: string;
    createdAtGt?: string;
    createdAtLt?: string;
  }): Promise<VapiCall[]> {
    try {
      const response = await this.client.get('/call', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('[Vapi] Failed to list calls:', error.response?.data || error.message);
      throw new Error(`Vapi list calls failed: ${error.message}`);
    }
  }

  /**
   * Create a real estate cold calling assistant
   */
  buildRealEstateAssistant(contactData: {
    firstName?: string;
    address?: string;
    leadType?: string;
  }): VapiAssistant {
    const { firstName, address, leadType } = contactData;

    return {
      name: 'Real Estate Cold Caller',
      model: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a professional real estate investor calling ${firstName || 'a property owner'} about their property${address ? ` at ${address}` : ''}.

Your goal is to:
1. Build rapport quickly and professionally
2. Confirm they own the property
3. Ask if they've considered selling
4. Gauge interest level (hot, warm, cold)
5. If interested, offer a fair cash offer or schedule a callback

Guidelines:
- Be respectful and conversational, not pushy
- Listen for motivation indicators (financial stress, inheritance, relocation, etc.)
- If they say "not interested," politely thank them and end the call
- If they're interested, collect: best callback time, email, and motivation level
- Use natural language, avoid sounding robotic
- Keep the call under 3 minutes unless they're very interested

Lead Type: ${leadType || 'cold lead'}

Use the updateContactStatus function to update their status during the call.`
          }
        ]
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: 'pNInz6obpgDQGcFmaJgB' // Default professional male voice (Adam)
      },
      firstMessage: `Hi ${firstName || 'there'}, this is calling from [Your Company Name] about${address ? ` the property at ${address}` : ' your property'}. Do you have a quick minute?`,
      recordingEnabled: true,
      endCallFunctionEnabled: true,
      functions: [
        {
          name: 'updateContactStatus',
          description: 'Update the lead status based on the conversation',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['HOT', 'WARM', 'NURTURE', 'NOT_INTERESTED', 'WRONG_NUMBER', 'DNC'],
                description: 'The contact status based on interest level'
              },
              notes: {
                type: 'string',
                description: 'Key notes from the conversation'
              },
              callbackTime: {
                type: 'string',
                description: 'Preferred callback time if they want to be contacted again'
              }
            },
            required: ['status']
          }
        }
      ]
    };
  }

  /**
   * Create a warm calling assistant (for interested leads)
   */
  buildWarmCallerAssistant(contactData: {
    firstName?: string;
    address?: string;
    previousInteraction?: string;
  }): VapiAssistant {
    const { firstName, address, previousInteraction } = contactData;

    return {
      name: 'Real Estate Warm Caller',
      model: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are following up with ${firstName || 'a property owner'} who previously showed interest in selling${address ? ` their property at ${address}` : ''}.

${previousInteraction ? `Previous interaction: ${previousInteraction}` : ''}

Your goal is to:
1. Reference the previous conversation warmly
2. Move the conversation toward getting an offer or scheduling an appointment
3. Address any concerns or questions
4. Close for next steps (site visit, offer, etc.)

Guidelines:
- Be warm and build on existing rapport
- Focus on moving them to action
- If they're ready, schedule a property viewing or offer presentation
- Use the scheduleAppointment function when they agree to next steps
- Keep momentum - don't let them go cold again`
          }
        ]
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: 'pNInz6obpgDQGcFmaJgB'
      },
      firstMessage: `Hi ${firstName}, it's [Your Name] following up about${address ? ` your property at ${address}` : ' your property'}. You'd mentioned you were interested in learning more. Is now still a good time?`,
      recordingEnabled: true,
      endCallFunctionEnabled: true,
      functions: [
        {
          name: 'scheduleAppointment',
          description: 'Schedule a property viewing or offer presentation',
          parameters: {
            type: 'object',
            properties: {
              appointmentType: {
                type: 'string',
                enum: ['property_viewing', 'offer_presentation', 'callback'],
                description: 'Type of appointment to schedule'
              },
              preferredDate: {
                type: 'string',
                description: 'Preferred date and time'
              },
              notes: {
                type: 'string',
                description: 'Additional notes about the appointment'
              }
            },
            required: ['appointmentType', 'preferredDate']
          }
        },
        {
          name: 'updateContactStatus',
          description: 'Update lead status',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['HOT', 'WARM', 'NURTURE', 'NOT_INTERESTED'],
              },
              notes: { type: 'string' }
            },
            required: ['status']
          }
        }
      ]
    };
  }
}

// Singleton instance
let vapiService: VapiService | null = null;

export function getVapiService(): VapiService {
  if (!vapiService) {
    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) {
      throw new Error('VAPI_API_KEY environment variable is not set');
    }
    vapiService = new VapiService({ apiKey });
  }
  return vapiService;
}
