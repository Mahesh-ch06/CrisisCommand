
import { Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `You are CrisisCommand, an autonomous AI Incident Commander for first responders.
Analyze multimodal feeds (drone video frames, CCTV, audio logs).
Watch for hazards (fire, flood, structural collapse, smoke) and victims.
Infer severity (e.g., "White smoke suggests early fire, black smoke suggests toxic materials").
You MUST ONLY output valid JSON. No conversational text.`;

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    timestamp: { type: Type.STRING, description: "ISO-8601 string" },
    threat_level: { type: Type.STRING, description: "CRITICAL | HIGH | MEDIUM | LOW" },
    detected_hazards: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    },
    victim_count_estimate: { type: Type.INTEGER },
    incident_summary: { type: Type.STRING },
    recommended_actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, description: "DISPATCH_UNIT | EVACUATE_AREA | ALERT_HOSPITALS" },
          priority: { type: Type.STRING, description: "IMMEDIATE | WAIT" },
          details: { type: Type.STRING }
        },
        required: ["action", "priority", "details"]
      }
    },
    geo_inference: {
      type: Type.OBJECT,
      properties: {
        location_description: { type: Type.STRING },
        risk_radius_meters: { type: Type.INTEGER }
      },
      required: ["location_description", "risk_radius_meters"]
    }
  },
  required: [
    "timestamp", 
    "threat_level", 
    "detected_hazards", 
    "victim_count_estimate", 
    "incident_summary", 
    "recommended_actions", 
    "geo_inference"
  ]
};
