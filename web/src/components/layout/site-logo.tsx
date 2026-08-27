"use client";

import { useState } from "react";

import { DEFAULT_SITE_LOGO_URL } from "@/lib/site-brand";
import { cn } from "@/lib/utils";

export function SiteLogo({ logoUrl, className }: { logoUrl: string; className?: string }) {
    const configuredLogoUrl = logoUrl.trim();
    const resolvedLogoUrl = configuredLogoUrl === "/logo.svg" || configuredLogoUrl === "/download.jpg" ? DEFAULT_SITE_LOGO_URL : configuredLogoUrl || DEFAULT_SITE_LOGO_URL;
    const [failedLogoUrl, setFailedLogoUrl] = useState("");
    const source = failedLogoUrl === resolvedLogoUrl ? DEFAULT_SITE_LOGO_URL : resolvedLogoUrl;

    return <img src={source} alt="" className={cn("shrink-0 rounded-[22%] object-cover", className)} referrerPolicy="no-referrer" onError={() => setFailedLogoUrl(resolvedLogoUrl)} />;
}
