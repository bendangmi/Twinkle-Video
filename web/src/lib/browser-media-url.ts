export function browserReadableMediaUrl(url: string) {
    const value = (url || "").trim();
    if (!value || !/^https?:\/\//i.test(value)) return value;
    if (typeof window === "undefined") return value;

    try {
        const target = new URL(value);
        if (target.origin === window.location.origin) return value;
        if (isLoopbackHost(target.hostname) && (target.pathname === "/api" || target.pathname.startsWith("/api/"))) return `${target.pathname}${target.search}${target.hash}`;
        return `/api/media-proxy?url=${encodeURIComponent(value)}`;
    } catch {
        return value;
    }
}

function isLoopbackHost(hostname: string) {
    const value = hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

export function isRemoteMediaUrl(url: string) {
    return /^https?:\/\//i.test((url || "").trim());
}
