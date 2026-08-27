export const DEFAULT_SITE_TITLE = "Twinkle Video";
export const DEFAULT_SITE_LOGO_URL = "/logo.jpg";
export const DEFAULT_SITE_ICON_URL = "/icon.svg";

export function resolveSiteTitle(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : DEFAULT_SITE_TITLE;
}
