import { describe, expect, it } from "vitest";

import { localDevelopmentBundlerFlag, localDevelopmentEnvironment } from "./local-development.mjs";

describe("local development environment", () => {
    it("uses the reserved Twinkle Video ports by default", () => {
        expect(localDevelopmentEnvironment("dev", {})).toMatchObject({
            PORT: "46511",
            NEXT_PUBLIC_SITE_URL: "http://localhost:46511",
        });
        expect(localDevelopmentEnvironment("frontend", {})).toMatchObject({
            PORT: "46511",
            VOZEB_PRO_BACKEND_ORIGIN: "http://127.0.0.1:46512",
        });
        expect(localDevelopmentEnvironment("backend", {})).toMatchObject({
            PORT: "46512",
            NEXT_PUBLIC_SITE_URL: "http://localhost:46511",
        });
    });

    it("uses a custom unified application port", () => {
        expect(localDevelopmentEnvironment("dev", { PORT: "4310" })).toMatchObject({
            PORT: "4310",
            NEXT_PUBLIC_SITE_URL: "http://localhost:4310",
            VOZEB_PRO_INTERNAL_ORIGIN: "http://127.0.0.1:4310",
            VOZEB_PRO_WORKER_API_ORIGIN: "http://127.0.0.1:4310",
        });
    });

    it("connects a custom frontend port to a custom backend port", () => {
        expect(localDevelopmentEnvironment("frontend", { FRONTEND_PORT: "4320", BACKEND_PORT: "4321" })).toMatchObject({
            PORT: "4320",
            NEXT_PUBLIC_SITE_URL: "http://localhost:4320",
            NEXT_DIST_DIR: ".next-dev-frontend",
            VOZEB_PRO_BACKEND_ORIGIN: "http://127.0.0.1:4321",
        });
        expect(localDevelopmentEnvironment("backend", { FRONTEND_PORT: "4320", BACKEND_PORT: "4321" })).toMatchObject({
            PORT: "4321",
            NEXT_PUBLIC_SITE_URL: "http://localhost:4320",
            NEXT_DIST_DIR: ".next-dev-backend",
            VOZEB_PRO_INTERNAL_ORIGIN: "http://127.0.0.1:4321",
        });
    });

    it("accepts an explicit frontend backend origin", () => {
        expect(localDevelopmentEnvironment("frontend", { VOZEB_PRO_BACKEND_ORIGIN: "http://localhost:4401/path" }).VOZEB_PRO_BACKEND_ORIGIN).toBe("http://localhost:4401");
    });

    it("avoids the Windows Turbopack package-resolution panic", () => {
        expect(localDevelopmentBundlerFlag("win32")).toBe("--webpack");
        expect(localDevelopmentBundlerFlag("linux")).toBe("--turbopack");
    });
});
