"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { useAppConfig } from "@/lib/app-config-context";

// Initializes PostHog from runtime config. Kept out of the Suspense boundary
// (it needs no search params) so init runs before any capture/identify call
// deeper in the tree — otherwise those calls hit an uninitialized instance.
export function PostHogInit() {
  const { selfDeployment, posthogProjectToken, posthogHost } = useAppConfig();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || selfDeployment) return;
    if (!posthogProjectToken || !posthogHost) {
      if (process.env.NODE_ENV === "development") {
        const missing = !posthogProjectToken ? "POSTHOG_PROJECT_TOKEN" : "POSTHOG_HOST";
        console.warn(
          `${missing} is missing — PostHog is not initialized and events are silently dropped. ` +
            `Set ${missing} (or NEXT_PUBLIC_SELF_DEPLOYMENT=true) to resolve this.`,
        );
      }
      return;
    }
    posthog.init(posthogProjectToken, {
      api_host: posthogHost,
      defaults: "2026-01-30",
      capture_exceptions: true,
      capture_pageview: false,
      debug: process.env.NODE_ENV === "development",
    });
    posthog.register({ environment: process.env.NODE_ENV });
    initialized.current = true;
  }, [selfDeployment, posthogProjectToken, posthogHost]);

  return null;
}

// Captures pageviews on client-side navigation. Uses useSearchParams, so it
// must live inside a Suspense boundary.
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!posthog.__loaded) return;
    let url = window.location.origin + pathname;
    const search = searchParams.toString();
    if (search) url += "?" + search;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
