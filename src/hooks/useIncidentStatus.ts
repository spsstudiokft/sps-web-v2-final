import { useState, useEffect, useCallback, useRef } from "react";
import { 
  IncidentIoIncident, 
  IncidentIoMaintenance, 
  IncidentIoSummary, 
  IncidentIoApiResponse, 
  OverallStatusType 
} from "../types/status";

const PRIMARY_API_ENDPOINT = "https://status.spsstudio.hu/api/v1/summary";
const PROXY_API_ENDPOINT = "/api/status-summary";
const DEFAULT_POLL_INTERVAL_MS = 35000; // 35 seconds
const DISMISS_STORAGE_KEY = "sps_incident_status_dismissed_v2";

interface UseIncidentStatusResult {
  summary: IncidentIoSummary | null;
  overallStatus: OverallStatusType;
  ongoingIncidents: IncidentIoIncident[];
  inProgressMaintenances: IncidentIoMaintenance[];
  hasActiveIssues: boolean;
  isVisible: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  dismiss: () => void;
  refetch: () => Promise<void>;
  statusPageUrl: string;
}

export function useIncidentStatus(pollIntervalMs = DEFAULT_POLL_INTERVAL_MS): UseIncidentStatusResult {
  const [summary, setSummary] = useState<IncidentIoSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  const [dismissedFingerprint, setDismissedFingerprint] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISS_STORAGE_KEY) || localStorage.getItem(DISMISS_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const isMountedRef = useRef<boolean>(true);

  // Monitor online / offline network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchStatus();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Normalize API response from different potential formats
  const parseApiResponse = useCallback((resData: any): IncidentIoSummary => {
    const rawData = resData.data && !Array.isArray(resData.data) ? resData.data : resData;
    const rawSummary = rawData.summary || rawData;

    const page_title = rawData.page_title || rawSummary.page_title || "SPS Studio";
    const page_url = rawData.page_url || rawSummary.page_url || "https://status.spsstudio.hu/";

    const ongoing_incidents: IncidentIoIncident[] = Array.isArray(rawData.ongoing_incidents)
      ? rawData.ongoing_incidents
      : Array.isArray(rawSummary.ongoing_incidents)
      ? rawSummary.ongoing_incidents
      : [];

    const in_progress_maintenances: IncidentIoMaintenance[] = Array.isArray(rawData.in_progress_maintenances)
      ? rawData.in_progress_maintenances
      : Array.isArray(rawSummary.in_progress_maintenances)
      ? rawSummary.in_progress_maintenances
      : [];

    const scheduled_maintenances: IncidentIoMaintenance[] = Array.isArray(rawData.scheduled_maintenances)
      ? rawData.scheduled_maintenances
      : Array.isArray(rawSummary.scheduled_maintenances)
      ? rawSummary.scheduled_maintenances
      : [];

    // Derive overall status if not explicitly provided
    let status: OverallStatusType = "operational";
    if (in_progress_maintenances.length > 0) {
      status = "under_maintenance";
    } else if (ongoing_incidents.length > 0) {
      const worstImpact = ongoing_incidents.find(i => 
        i.current_worst_impact === "major_outage" || i.current_worst_impact === "full_outage"
      );
      const partialImpact = ongoing_incidents.find(i => 
        i.current_worst_impact === "partial_outage"
      );
      if (worstImpact) {
        status = "major_outage";
      } else if (partialImpact) {
        status = "partial_outage";
      } else {
        status = "degraded";
      }
    } else if (rawSummary.status) {
      status = String(rawSummary.status).toLowerCase() as OverallStatusType;
    }

    return {
      page_title,
      page_url,
      status,
      description: rawSummary.description,
      ongoing_incidents,
      in_progress_maintenances,
      scheduled_maintenances,
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return;
    }

    try {
      let data: any = null;

      // 1. Try Direct incident.io API first
      try {
        const directResponse = await fetch(PRIMARY_API_ENDPOINT, {
          headers: { Accept: "application/json" },
          cache: "no-cache",
        });
        if (directResponse.ok) {
          data = await directResponse.json();
        }
      } catch (directErr) {
        // Fallback to internal proxy
      }

      // 2. Try Backend Proxy if direct fetch was blocked by network/CORS
      if (!data || (!data.ongoing_incidents && !data.data && !data.summary)) {
        try {
          const proxyResponse = await fetch(PROXY_API_ENDPOINT, {
            headers: { Accept: "application/json" },
            cache: "no-cache",
          });
          if (proxyResponse.ok) {
            data = await proxyResponse.json();
          }
        } catch (proxyErr) {
          // Proxy also unreachable
        }
      }

      if (!isMountedRef.current) return;

      if (data) {
        const parsed = parseApiResponse(data);
        setSummary(parsed);
        setError(null);
        setLastUpdated(new Date());
      } else {
        // If offline or data unavailable, fail gracefully without breaking UI
        setError("Status summary unavailable");
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError("Failed to fetch status");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [parseApiResponse]);

  // Initial fetch and continuous interval polling (30–60s)
  useEffect(() => {
    isMountedRef.current = true;
    fetchStatus();

    const intervalId = setInterval(() => {
      fetchStatus();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchStatus, pollIntervalMs]);

  // Determine active issues
  const ongoingIncidents = summary?.ongoing_incidents || [];
  const inProgressMaintenances = summary?.in_progress_maintenances || [];
  const rawStatus = (summary?.status || "operational").toLowerCase();

  const isDegradedOrOutage = ["degraded", "partial_outage", "major_outage", "full_outage", "under_maintenance"].includes(rawStatus);
  const hasActiveIssues = ongoingIncidents.length > 0 || inProgressMaintenances.length > 0 || isDegradedOrOutage;

  // Determine overall status
  let overallStatus: OverallStatusType = "operational";
  if (inProgressMaintenances.length > 0 || rawStatus === "under_maintenance") {
    overallStatus = "under_maintenance";
  } else if (rawStatus.includes("major") || rawStatus.includes("full")) {
    overallStatus = "major_outage";
  } else if (rawStatus.includes("partial")) {
    overallStatus = "partial_outage";
  } else if (rawStatus.includes("degraded") || ongoingIncidents.length > 0) {
    // Check worst impact inside incidents
    const hasMajor = ongoingIncidents.some(i => (i.current_worst_impact || "").includes("major"));
    const hasPartial = ongoingIncidents.some(i => (i.current_worst_impact || "").includes("partial"));
    if (hasMajor) overallStatus = "major_outage";
    else if (hasPartial) overallStatus = "partial_outage";
    else overallStatus = "degraded";
  }

  // Generate unique fingerprint for the current active state to know if user dismissed this exact update
  const currentFingerprint = hasActiveIssues
    ? `${overallStatus}:${ongoingIncidents.map((i) => `${i.id}-${i.status}-${i.last_update_at || ""}`).join(",")}:${inProgressMaintenances.map((m) => `${m.id}-${m.status}-${m.last_update_at || ""}`).join(",")}`
    : "operational";

  const isDismissed = Boolean(dismissedFingerprint && dismissedFingerprint === currentFingerprint);

  // Widget visibility rule:
  // Show popup ONLY when there is at least one ongoing incident OR in-progress maintenance (and not dismissed)
  // Hide completely when there are no active incidents or maintenances.
  const isVisible = Boolean(
    hasActiveIssues && 
    (ongoingIncidents.length > 0 || inProgressMaintenances.length > 0) && 
    !isDismissed
  );

  const dismiss = useCallback(() => {
    setDismissedFingerprint(currentFingerprint);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, currentFingerprint);
      localStorage.setItem(DISMISS_STORAGE_KEY, currentFingerprint);
    } catch {
      // Storage unavailable
    }
  }, [currentFingerprint]);

  return {
    summary,
    overallStatus,
    ongoingIncidents,
    inProgressMaintenances,
    hasActiveIssues,
    isVisible,
    isLoading,
    error,
    lastUpdated,
    dismiss,
    refetch: fetchStatus,
    statusPageUrl: summary?.page_url || "https://status.spsstudio.hu",
  };
}
