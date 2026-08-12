"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAnalyticsConsent } from "@/lib/analytics-consent";
import { useAppConfig } from "@/lib/app-config-context";

export function CookieConsent() {
  const { selfDeployment, posthogProjectToken, posthogHost } = useAppConfig();
  const { consent, loaded, grant, deny } = useAnalyticsConsent();

  // Nothing to consent to when analytics is not configured, before the stored
  // decision has been read (avoids a flash), or once the user has decided.
  if (selfDeployment || !posthogProjectToken || !posthogHost) return null;
  if (!loaded || consent !== "unknown") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-border border-t bg-background/95 p-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          We use analytics cookies to understand how PostishAI is used and to improve it. See our{" "}
          <Link href="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={deny}>
            Decline
          </Button>
          <Button size="sm" onClick={grant}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
