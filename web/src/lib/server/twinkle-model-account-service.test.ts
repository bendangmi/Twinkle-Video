import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getAuthSettings: vi.fn(),
    readBinding: vi.fn(),
    upsertBinding: vi.fn(),
    deleteBinding: vi.fn(),
    fetchSafeOutbound: vi.fn(),
}));

vi.mock("@/lib/auth/store", () => ({ getAuthSettings: mocks.getAuthSettings }));
vi.mock("@/lib/server/database/twinkle-model-binding-repository", () => ({
    readTwinkleModelBinding: mocks.readBinding,
    upsertTwinkleModelBinding: mocks.upsertBinding,
    deleteTwinkleModelBinding: mocks.deleteBinding,
}));
vi.mock("@/lib/server/safe-outbound-fetch", () => ({ fetchSafeOutbound: mocks.fetchSafeOutbound }));
vi.mock("@/lib/server/secret-crypto", () => ({ encryptSecretValue: (value: string) => `enc:${value}`, decryptSecretValue: (value: string) => value.replace(/^enc:/, "") }));

import { bindTwinkleModelAccount, getTwinkleModelBindingStatus, resolveTwinkleModelChannelCredential, twinkleModelRoutingPreference } from "./twinkle-model-account-service";

const now = new Date().toISOString();
const binding = {
    userId: "user-one",
    providerBaseUrl: "https://big-model.smart-agi.com",
    accountEmail: "user@example.com",
    accessTokenCiphertext: "enc:panel-access",
    refreshTokenCiphertext: "enc:panel-refresh",
    accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: "active" as const,
    providerPreference: "twinkle-model" as const,
    apiKeys: [],
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
};

describe("Twinkle Model account service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getAuthSettings.mockResolvedValue({ twinkleModel: { baseUrl: "https://big-model.smart-agi.com" } });
        mocks.readBinding.mockResolvedValue(binding);
        mocks.upsertBinding.mockImplementation(async (value) => value);
    });

    it("matches one active system-default key by exact name and persists template_id", async () => {
        mocks.fetchSafeOutbound.mockResolvedValue(jsonResponse({ code: 0, data: { items: [{ key: "personal-key", name: "VOZEB 默认", origin: "system_default", status: "active", template_id: 37 }], pages: 1 } }));

        const result = await resolveTwinkleModelChannelCredential("user-one", { defaultKeyName: "VOZEB 默认" });

        expect(result).toEqual({ apiKey: "personal-key", templateId: "37", templateName: "VOZEB 默认" });
        expect(mocks.upsertBinding).toHaveBeenCalledWith(expect.objectContaining({ apiKeys: [expect.objectContaining({ templateId: "37", keyCiphertext: "enc:personal-key" })] }));
    });

    it("fails when multiple active default keys share the configured name", async () => {
        mocks.fetchSafeOutbound.mockResolvedValue(
            jsonResponse({
                code: 0,
                data: {
                    items: [
                        { key: "one", name: "重复名称", origin: "system_default", status: "active", template_id: "one" },
                        { key: "two", name: "重复名称", origin: "system_default", status: "active", template_id: "two" },
                    ],
                    pages: 1,
                },
            }),
        );

        await expect(resolveTwinkleModelChannelCredential("user-one", { defaultKeyName: "重复名称" })).rejects.toEqual(expect.objectContaining({ status: 409 }));
    });

    it("uses cached template_id after the default key name changes", async () => {
        mocks.readBinding.mockResolvedValue({ ...binding, apiKeys: [{ templateId: "stable-template", templateName: "旧名称", keyCiphertext: "enc:stable-key", updatedAt: now }] });

        await expect(resolveTwinkleModelChannelCredential("user-one", { templateId: "stable-template", defaultKeyName: "新名称" })).resolves.toEqual({ apiKey: "stable-key", templateId: "stable-template", templateName: "旧名称" });
        expect(mocks.fetchSafeOutbound).not.toHaveBeenCalled();
    });

    it("never persists the submitted Twinkle password", async () => {
        mocks.readBinding.mockResolvedValue(null);
        mocks.fetchSafeOutbound.mockResolvedValue(jsonResponse({ code: 0, data: { access_token: "access", refresh_token: "refresh", expires_in: 3600 } }));

        await bindTwinkleModelAccount({ userId: "user-one", email: "USER@example.com", password: "plain-password" });

        const persisted = JSON.stringify(mocks.upsertBinding.mock.calls[0][0]);
        expect(persisted).not.toContain("plain-password");
        expect(persisted).toContain("enc:access");
        expect(persisted).toContain("enc:refresh");
    });

    it("marks an old-address binding for rebind and routes locally after the global address changes", async () => {
        mocks.getAuthSettings.mockResolvedValue({ twinkleModel: { baseUrl: "https://new-twinkle.example.com" } });

        await expect(getTwinkleModelBindingStatus("user-one")).resolves.toEqual(expect.objectContaining({ bound: true, status: "needs_rebind", baseUrl: "https://new-twinkle.example.com" }));
        await expect(twinkleModelRoutingPreference("user-one")).resolves.toBe("twinkle-video");
        await expect(resolveTwinkleModelChannelCredential("user-one", { templateId: "template-one" })).rejects.toEqual(expect.objectContaining({ status: 409 }));
    });
});

function jsonResponse(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}
