import { NextResponse, type NextRequest } from "next/server";
import { getTrustedProxyHops } from "@/lib/server/trusted-proxy";

export function proxy(request: NextRequest) {
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", contentSecurityPolicy);
    const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
    const localCorsOrigin = process.env.NODE_ENV !== "production" && isApiRequest ? request.headers.get("origin")?.trim() || "" : "";

    if (localCorsOrigin && request.method === "OPTIONS") return withLocalCors(new NextResponse(null, { status: 204 }), request, localCorsOrigin, contentSecurityPolicy);

    if (!isApiRequest || request.nextUrl.pathname.startsWith("/api/billing/webhooks/") || ["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        return withLocalCors(securedNextResponse(requestHeaders, contentSecurityPolicy), request, localCorsOrigin, contentSecurityPolicy);
    }

    if (process.env.NODE_ENV !== "production") return withLocalCors(securedNextResponse(requestHeaders, contentSecurityPolicy), request, localCorsOrigin, contentSecurityPolicy);

    const requestOrigin = publicRequestOrigin(request);
    const origin = request.headers.get("origin");
    if (origin && origin !== requestOrigin) return securedJsonResponse({ error: "跨站请求已被拦截" }, 403, contentSecurityPolicy);

    const referer = request.headers.get("referer");
    if (referer) {
        try {
            if (new URL(referer).origin !== requestOrigin) return securedJsonResponse({ error: "跨站请求已被拦截" }, 403, contentSecurityPolicy);
        } catch {
            return securedJsonResponse({ error: "请求来源无效" }, 403, contentSecurityPolicy);
        }
    }

    return securedNextResponse(requestHeaders, contentSecurityPolicy);
}

export const config = {
    matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};

function securedNextResponse(requestHeaders: Headers, contentSecurityPolicy: string) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return response;
}

function securedJsonResponse(body: unknown, status: number, contentSecurityPolicy: string) {
    const response = NextResponse.json(body, { status });
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return response;
}

function withLocalCors(response: NextResponse, request: NextRequest, origin: string, contentSecurityPolicy: string) {
    if (!origin) return response;
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", request.headers.get("access-control-request-headers") || "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Range");
    response.headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    if (request.headers.get("access-control-request-private-network") === "true") response.headers.set("Access-Control-Allow-Private-Network", "true");
    return response;
}

function buildContentSecurityPolicy(nonce: string) {
    const isDev = process.env.NODE_ENV !== "production";
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' data: blob: https:",
        "font-src 'self' data: https:",
        `connect-src 'self' https:${isDev ? " http: ws: wss:" : ""}`,
        "worker-src 'self' blob:",
        "frame-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");
}

function publicRequestOrigin(request: NextRequest) {
    const trustForwarded = getTrustedProxyHops() > 0;
    const forwardedProto = trustForwarded ? request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() : "";
    const forwardedHost = trustForwarded ? request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() : "";
    const protocol = forwardedProto || request.nextUrl.protocol.replace(/:$/, "");
    const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    try {
        const origin = new URL(`${protocol}://${host}`);
        return origin.protocol === "http:" || origin.protocol === "https:" ? origin.origin : request.nextUrl.origin;
    } catch {
        return request.nextUrl.origin;
    }
}
