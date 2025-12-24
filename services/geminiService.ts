
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, RESPONSE_SCHEMA } from "../constants";
import { IncidentReport } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeFeed(
    frameBase64: string,
    audioContext?: string
  ): Promise<IncidentReport> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: frameBase64,
            },
          },
          {
            text: `CURRENT FEED DATA:
            ${audioContext ? `Audio Logs: ${audioContext}` : 'No audio data available.'}
            
            Analyze this frame and audio context. Provide the situational intelligence as JSON.`
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
    });

    try {
      const text = response.text || '{}';
      return JSON.parse(text) as IncidentReport;
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      throw new Error("Invalid intelligence report format received.");
    }
  }
}
