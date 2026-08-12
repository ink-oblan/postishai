"use client";

import posthog from "posthog-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AnalyticsConsent = "granted" | "denied" | "unknown";

const STORAGE_KEY = "postishai-analytics-consent";

interface AnalyticsConsentValue {
  consent: AnalyticsConsent;
  // False until the stored decision has been read on the client. Used to avoid
  // flashing the consent banner before we know whether a choice already exists.
  loaded: boolean;
  grant: () => void;
  deny: () => void;
}

const AnalyticsConsentContext = createContext<AnalyticsConsentValue | null>(null);

export function AnalyticsConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<AnalyticsConsent>("unknown");
  const [loaded, setLoaded] = useState(false);

  // Restore any previous decision. Storing the consent choice itself is a
  // strictly necessary preference, so it is safe to persist without consent.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "granted" || stored === "denied") setConsent(stored);
    setLoaded(true);
  }, []);

  // Reflect the decision into PostHog once it is initialized. PostHog starts
  // opted out (see PostHogInit), so capturing only begins after an opt-in.
  useEffect(() => {
    if (!posthog.__loaded) return;
    if (consent === "granted") posthog.opt_in_capturing();
    else if (consent === "denied") posthog.opt_out_capturing();
  }, [consent]);

  const grant = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "granted");
    setConsent("granted");
  }, []);

  const deny = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "denied");
    setConsent("denied");
  }, []);

  return (
    <AnalyticsConsentContext.Provider value={{ consent, loaded, grant, deny }}>
      {children}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): AnalyticsConsentValue {
  const ctx = useContext(AnalyticsConsentContext);
  if (!ctx) throw new Error("useAnalyticsConsent must be used within AnalyticsConsentProvider");
  return ctx;
}
