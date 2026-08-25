import { describe, expect, it } from "vitest";

import { channelSupportsModel, generationModelId, resolveModelAdvancedConfig, resolveSystemGenerationChannel, systemAiProxyBasePath, systemGenerationChannelId, toSystemGenerationChannel } from "./generation-channel";

const channels = [{ id: "channel-1", enabled: true, apiFormat: "gemini" as const, models: ["models/video-v1"] }];

describe("resolveSystemGenerationChannel", () => {
    it("uses the logical model id for public records and billing", () => {
        expect(generationModelId({ model: "vendor/model-v2", logicalModel: "writer" })).toBe("writer");
        expect(generationModelId({ model: "vendor/model-v2" })).toBe("vendor/model-v2");
    });

    it("uses the canonical enabled backend channel settings", () => {
        expect(resolveSystemGenerationChannel({ apiSource: "system", baseUrl: "/api/ai/system/channel-1", apiFormat: "openai", model: "video-v1" }, channels)).toEqual({
            apiSource: "system",
            baseUrl: "/api/ai/system/channel-1",
            apiKey: "system",
            apiFormat: "gemini",
            model: "video-v1",
        });
    });

    it("rejects disabled, unknown, malformed, and unlisted models", () => {
        expect(resolveSystemGenerationChannel({ apiSource: "system", baseUrl: "/api/ai/system/missing", model: "video-v1" }, channels)).toBeNull();
        expect(resolveSystemGenerationChannel({ apiSource: "system", baseUrl: "/api/ai/system/channel-1/extra", model: "video-v1" }, channels)).toBeNull();
        expect(resolveSystemGenerationChannel({ apiSource: "system", baseUrl: "/api/ai/system/channel-1", model: "other" }, channels)).toBeNull();
        expect(resolveSystemGenerationChannel({ apiSource: "system", baseUrl: "/api/ai/system/channel-1", model: "video-v1" }, [{ ...channels[0], enabled: false }])).toBeNull();
    });

    it("extracts only an exact system channel path", () => {
        expect(systemGenerationChannelId("/api/ai/system/channel-1")).toBe("channel-1");
        expect(systemGenerationChannelId("/api/ai/system/channel-1/_twinkle-model")).toBe("channel-1");
        expect(systemGenerationChannelId("/api/ai/system/channel-1/extra")).toBe("");
        expect(systemGenerationChannelId("/api/ai/system/%E0%A4%A")).toBe("");
    });

    it("persists the external billing marker in system task configuration", () => {
        const resolved = {
            logicalModelId: "video",
            upstreamModel: "vendor-video",
            channelId: "channel-1",
            credentialMode: "twinkle-model" as const,
            channel: { id: "channel-1", name: "Admin", enabled: true, baseUrl: "https://admin.example.com", apiKey: "admin-key", apiFormat: "openai" as const, models: ["vendor-video"] },
        };

        expect(systemAiProxyBasePath(resolved)).toBe("/api/ai/system/channel-1/_twinkle-model");
        expect(toSystemGenerationChannel(resolved)).toMatchObject({ baseUrl: "/api/ai/system/channel-1/_twinkle-model", credentialMode: "twinkle-model" });
        expect(resolveSystemGenerationChannel({ apiSource: "system", baseUrl: "/api/ai/system/channel-1/_twinkle-model", model: "video-v1" }, channels)).toMatchObject({
            baseUrl: "/api/ai/system/channel-1/_twinkle-model",
            model: "video-v1",
        });
    });

    it("matches model prefixes and casing consistently", () => {
        expect(channelSupportsModel(["models/Video-V1"], "video-v1")).toBe(true);
        expect(channelSupportsModel(["video-v1"], "models/VIDEO-V1")).toBe(true);
        expect(channelSupportsModel(["video-v2"], "video-v1")).toBe(false);
    });

    it("resolves create and query paths per model on a mixed company channel", () => {
        const advanced = {
            protocol: "auto",
            createPath: "",
            queryPath: "",
            modelConfigs: {
                "openai-text": { capability: "text", apiFormat: "openai", createPath: "/chat/completions" },
                "sd2.0": { capability: "video", apiFormat: "openai", protocol: "seedance", createPath: "/videos", queryPath: "/videos/:task_id" },
            },
        } as never;

        expect(resolveModelAdvancedConfig(advanced, "openai-text")).toMatchObject({ createPath: "/chat/completions", queryPath: "" });
        expect(resolveModelAdvancedConfig(advanced, "sd2.0")).toMatchObject({ protocol: "seedance", createPath: "/videos", queryPath: "/videos/:task_id" });
    });
});
