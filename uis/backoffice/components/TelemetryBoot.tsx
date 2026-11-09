"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { fingerprint, routeTemplate, telemetryRelease, track } from "../lib/telemetry";

const VITALS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);

function deviceClass(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  return width < 768 ? "mobile" : width < 1100 ? "tablet" : "desktop";
}

// Stable reference: useReportWebVitals would report duplicates if this function changed.
function reportVital(metric: { name: string; value: number; rating: string }) {
  if (!VITALS.has(metric.name)) return;
  track("web_vitals_reported", {
    app: "backoffice",
    route: routeTemplate(window.location.pathname),
    metric: metric.name,
    value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating,
    device_class: deviceClass(),
  });
}

/** Cross-cutting telemetry: page views, uncaught errors and Web Vitals for every page. */
export function TelemetryBoot() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  useReportWebVitals(reportVital);

  useEffect(() => {
    const route = routeTemplate(pathname || "/");
    if (previous.current === route) return;
    track("page_viewed", { app: "backoffice", route, referrer_route: previous.current });
    previous.current = route;
  }, [pathname]);

  useEffect(() => {
    function uncaught(name: string, message: string, stack?: string) {
      // The message itself is never sent (it could contain user data): only a fingerprint.
      const firstFrame = (stack ?? "").split("\n").find((line) => line.includes("at ")) ?? "";
      track("frontend_error_uncaught", {
        app: "backoffice",
        route: routeTemplate(window.location.pathname),
        error_name: (name || "Error").slice(0, 60),
        error_fingerprint: fingerprint(name, message, firstFrame.trim()),
        release: telemetryRelease,
      });
    }
    const onError = (event: ErrorEvent) => uncaught(event.error?.name ?? "Error", event.message, event.error?.stack);
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      uncaught(reason?.name ?? "UnhandledRejection", String(reason?.message ?? reason), reason?.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
