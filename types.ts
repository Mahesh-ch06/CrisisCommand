
export enum ThreatLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum ActionType {
  DISPATCH_UNIT = 'DISPATCH_UNIT',
  EVACUATE_AREA = 'EVACUATE_AREA',
  ALERT_HOSPITALS = 'ALERT_HOSPITALS'
}

export enum ActionPriority {
  IMMEDIATE = 'IMMEDIATE',
  WAIT = 'WAIT'
}

export interface RecommendedAction {
  action: ActionType;
  priority: ActionPriority;
  details: string;
}

export interface GeoInference {
  location_description: string;
  risk_radius_meters: number;
}

export interface IncidentReport {
  timestamp: string;
  threat_level: ThreatLevel;
  detected_hazards: string[];
  victim_count_estimate: number;
  incident_summary: string;
  recommended_actions: RecommendedAction[];
  geo_inference: GeoInference;
}

export interface AppState {
  isMonitoring: boolean;
  history: IncidentReport[];
  currentReport: IncidentReport | null;
  error: string | null;
}
