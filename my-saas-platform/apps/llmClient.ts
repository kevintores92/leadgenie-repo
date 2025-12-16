import OpenAI from "openai";

export type Classification = {
  intent: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  categories: string[];
  confidence: number;
};

export type GuardrailFlags = {
  piiDetected: boolean;
  escalationSuggested: boolean;
  policyViolations: string[];
};

export class OpenAiLlmClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async classifyMessage(text: string): Promise<{
    classification: Classification;
    flags: GuardrailFlags;
    model: string;
  }> {
    const prompt = `Classify the SMS below. 
Return JSON with keys: intent, urgency (LOW/MEDIUM/HIGH), categories[], confidence (0-1), 
and flags: { piiDetected, escalationSuggested, policyViolations[] }.

Message: "${text}"`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini", // or another model you prefer
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json" },
    });

    const data = JSON.parse(response.choices[0].message.content!);

    return {
      classification: {
        intent: data.intent,
        urgency: data.urgency,
        categories: data.categories,
        confidence: data.confidence,
      },
      flags: {
        piiDetected: !!data.flags?.piiDetected,
        escalationSuggested: !!data.flags?.escalationSuggested,
        policyViolations: data.flags?.policyViolations || [],
      },
      model: response.model,
    };
  }

  async generateReply(
    text: string,
    contact: { firstName?: string | null; propertyAddress?: string | null },
    tone: "NEUTRAL" | "FRIENDLY" | "PROFESSIONAL" = "PROFESSIONAL"
  ): Promise<{ reply: string; flags: GuardrailFlags; model: string }> {
    const prompt = `Draft a concise, compliant SMS reply.
Constraints:
- No medical, legal, or financial advice.
- No promises or guarantees.
- Respect opt-out instructions.
- Keep under 320 chars.
Tone: ${tone}
Contact: firstName=${contact.firstName ?? ""}, address=${contact.propertyAddress ?? ""}
User message: "${text}"

Return JSON: { reply, flags: { piiDetected, escalationSuggested, policyViolations[] } }`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json" },
    });

    const data = JSON.parse(response.choices[0].message.content!);

    return {
      reply: data.reply,
      flags: {
        piiDetected: !!data.flags?.piiDetected,
        escalationSuggested: !!data.flags?.escalationSuggested,
        policyViolations: data.flags?.policyViolations || [],
      },
      model: response.model,
    };
  }
}