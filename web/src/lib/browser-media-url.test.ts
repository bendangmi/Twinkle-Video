import { afterEach, describe, expect, it, vi } from "vitest";

import { browserReadableMediaUrl } from "./browser-media-url";

describe("browserReadableMediaUrl", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("rewrites a split-backend loopback API URL to the current browser origin", () => {
        vi.stubGlobal("window", { location: { origin: "http://localhost:46511" } });

        expect(browserReadableMediaUrl("http://127.0.0.1:46512/api/reference-assets/permanent/audio/result.wav?download=1")).toBe("/api/reference-assets/permanent/audio/result.wav?download=1");
    });

    it("keeps same-origin URLs and proxies external media", () => {
        vi.stubGlobal("window", { location: { origin: "http://localhost:46511" } });

        expect(browserReadableMediaUrl("http://localhost:46511/api/reference-assets/audio.wav")).toBe("http://localhost:46511/api/reference-assets/audio.wav");
        expect(browserReadableMediaUrl("https://storage.example/audio.mp3")).toBe("/api/media-proxy?url=https%3A%2F%2Fstorage.example%2Faudio.mp3");
    });
});
