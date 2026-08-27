import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("application proxy security", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("ignores spoofed forwarded origins unless a trusted proxy is configured", () => {
        vi.stubEnv("NODE_ENV", "production");
        const request = writeRequest({
            origin: "https://public.example.com",
            "x-forwarded-host": "public.example.com",
            "x-forwarded-proto": "https",
        });

        expect(proxy(request).status).toBe(403);
        vi.stubEnv("VOZEB_PRO_TRUSTED_PROXY_HOPS", "1");
        expect(proxy(request).status).toBe(200);
    });

    it("does not restrict write-request origins during local development", () => {
        vi.stubEnv("NODE_ENV", "development");

        const response = proxy(
            writeRequest({
                origin: "http://localhost:46511",
                referer: "http://localhost:46511/create",
                host: "127.0.0.1:46512",
            }),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:46511");
        expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    });

    it("answers local API preflight requests without restrictions", () => {
        vi.stubEnv("NODE_ENV", "development");

        const response = proxy(
            new NextRequest("http://127.0.0.1:46512/api/auth/login", {
                method: "OPTIONS",
                headers: {
                    origin: "http://localhost:46511",
                    "access-control-request-method": "POST",
                    "access-control-request-headers": "content-type, x-debug-token",
                    "access-control-request-private-network": "true",
                },
            }),
        );

        expect(response.status).toBe(204);
        expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:46511");
        expect(response.headers.get("access-control-allow-headers")).toBe("content-type, x-debug-token");
        expect(response.headers.get("access-control-allow-private-network")).toBe("true");
    });

    it("uses a per-request script nonce and restricts production connections", () => {
        vi.stubEnv("NODE_ENV", "production");

        const policy = proxy(new NextRequest("https://app.example.com/create")).headers.get("content-security-policy") || "";

        expect(policy).toMatch(/script-src 'self' 'nonce-[a-f0-9]+' 'strict-dynamic' 'wasm-unsafe-eval'/);
        expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
        expect(policy).not.toMatch(/script-src[^;]* 'unsafe-eval'/);
        expect(policy).toContain("connect-src 'self' https:");
        expect(policy).not.toMatch(/connect-src[^;]*http:/);
        expect(policy).toContain("upgrade-insecure-requests");
    });
});

function writeRequest(headers: Record<string, string>) {
    return new NextRequest("http://app.internal/api/auth/login", { method: "POST", headers });
}
