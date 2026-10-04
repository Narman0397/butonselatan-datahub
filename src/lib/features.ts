import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeatureKey =
  | "notifications"
  | "audit_history"
  | "data_requests"
  | "reports"
  | "user_management"
  | "org_management"
  | "portal_settings"
  | "leadership_section"
  | "citation";

export const featuresQuery = queryOptions({
  queryKey: ["system-features"],
  queryFn: async () => {
    const { data, error } = await supabase.from("system_features").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
  staleTime: 30_000,
});

/** Returns true while loading (avoid flicker hiding); false only when explicitly disabled. */
export function useFeature(key: FeatureKey) {
  const { data } = useQuery(featuresQuery);
  const row = data?.find((f) => f.key === key);
  return row ? row.enabled : true;
}

export function useFeatures() {
  const { data } = useQuery(featuresQuery);
  return (key: FeatureKey) => data?.find((f) => f.key === key)?.enabled ?? true;
}
