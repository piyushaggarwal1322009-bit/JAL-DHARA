export type SiteFeatureKind = "tank" | "village" | "channel" | "observation";

export interface SiteFeature {
  id: string;
  kind: SiteFeatureKind;
  name: string;
  latitude: number;
  longitude: number;
  source: string;
  observedOn: string;
  notes: string;
  measurements: Record<string, string>;
}

export const SITE_DATA_KEY = "jalsaarthi.site-data.v1";

export function isSiteFeature(value: unknown): value is SiteFeature {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SiteFeature>;
  return typeof item.id === "string" && item.id.length <= 100 && typeof item.name === "string" && item.name.length > 0 && item.name.length <= 80 &&
    ["tank", "village", "channel", "observation"].includes(String(item.kind)) &&
    Number.isFinite(item.latitude) && Number(item.latitude) >= -90 && Number(item.latitude) <= 90 &&
    Number.isFinite(item.longitude) && Number(item.longitude) >= -180 && Number(item.longitude) <= 180 &&
    typeof item.source === "string" && item.source.length > 0 && item.source.length <= 240 &&
    typeof item.observedOn === "string" && item.observedOn.length <= 10 &&
    typeof item.notes === "string" && item.notes.length <= 1000 && !!item.measurements && typeof item.measurements === "object" && !Array.isArray(item.measurements) &&
    Object.entries(item.measurements).length <= 40 && Object.entries(item.measurements).every(([key, value]) => key.length > 0 && key.length <= 80 && typeof value === "string" && value.length <= 1000);
}
