export type OverallStatusType =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance"
  | "unknown";

export interface IncidentIoAffectedComponent {
  id: string;
  name: string;
  current_status?: string; // e.g. "operational", "degraded_performance", "partial_outage", "major_outage"
}

export interface IncidentIoIncident {
  id: string;
  name: string;
  status: string; // e.g. "investigating", "identified", "monitoring", "resolved"
  current_worst_impact?: string; // e.g. "degraded_performance", "partial_outage", "major_outage"
  affected_components?: IncidentIoAffectedComponent[];
  last_update_at?: string;
  last_update_message?: string;
  summary?: string;
  permalink?: string;
  url?: string;
  created_at?: string;
  updated_at?: string;
  severity?: {
    name?: string;
    description?: string;
  } | string;
}

export interface IncidentIoMaintenance {
  id: string;
  name: string;
  status: string; // e.g. "scheduled", "in_progress", "completed"
  affected_components?: IncidentIoAffectedComponent[];
  last_update_at?: string;
  last_update_message?: string;
  summary?: string;
  permalink?: string;
  url?: string;
  start_at?: string;
  end_at?: string;
}

export interface IncidentIoSummary {
  page_title?: string;
  page_url?: string;
  status: OverallStatusType | string;
  description?: string;
  ongoing_incidents?: IncidentIoIncident[];
  in_progress_maintenances?: IncidentIoMaintenance[];
  scheduled_maintenances?: IncidentIoMaintenance[];
}

export interface IncidentIoApiResponse {
  success?: boolean;
  page_title?: string;
  page_url?: string;
  data?: {
    page_title?: string;
    page_url?: string;
    summary?: IncidentIoSummary;
    page?: {
      name?: string;
      url?: string;
    };
    status?: string;
    ongoing_incidents?: IncidentIoIncident[];
    in_progress_maintenances?: IncidentIoMaintenance[];
    scheduled_maintenances?: IncidentIoMaintenance[];
  };
  summary?: IncidentIoSummary;
  page?: {
    name?: string;
    url?: string;
  };
  status?: string;
  ongoing_incidents?: IncidentIoIncident[];
  in_progress_maintenances?: IncidentIoMaintenance[];
  scheduled_maintenances?: IncidentIoMaintenance[];
  error?: string;
}

export interface StatusWidgetConfig {
  apiUrl?: string;
  statusPageUrl?: string;
  pollingIntervalMs?: number;
}
