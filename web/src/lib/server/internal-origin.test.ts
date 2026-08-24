import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveInternalOrigin } from "./internal-origin";

describe("internal origin", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("uses the configured local app origin for worker and server callbacks", () => {
        vi.stubEnv("VOZEB_PRO_INTERNAL_ORIGIN", "http://127.0.0.1:3000");

        expect(resolveInternalOrigin("http://localhost:3000")).toBe("http://127.0.0.1:3000");
    });

    it("falls back to the running app port when no internal origin is configured", () => {
        vi.stubEnv("VOZEB_PRO_INTERNAL_ORIGIN", "");
        vi.stubEnv("PORT", "3000");

        expect(resolveInternalOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    });
});
