import fetch from "node-fetch";

export class VapiClient {
  apiKey: string;
  baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey || "";
    this.baseUrl = baseUrl || "https://api.vapi.ai";
  }

  async createCall(phoneNumber: string, opts: any = {}): Promise<any> {
    // Minimal placeholder: POST to /calls (adjust to your Vapi API)
    try {
      const url = `${this.baseUrl.replace(/\/$/, "")}/calls`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ to: phoneNumber, ...opts }),
      });
      const body = await res.text();
      try {
        return JSON.parse(body);
      } catch (_e) {
        return { status: res.status, body };
      }
    } catch (err) {
      return { error: String(err) };
    }
  }
}
