"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/** Fires `page_not_found` once when the 404 page shows. Renders nothing. */
export function TrackNotFound() {
  useEffect(() => {
    let referrer_host: string | null = null;
    try {
      referrer_host = document.referrer ? new URL(document.referrer).hostname || null : null;
    } catch {
      referrer_host = null;
    }
    track("page_not_found", { page: location.pathname, referrer_host });
  }, []);
  return null;
}
