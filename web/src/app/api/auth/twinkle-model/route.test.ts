import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    class TwinkleModelAccountError extends Error {
        constructor(
            message: string,
            public status: number,
        ) {
            super(message);
        }
    }
    return {
        currentUser: { id: "user-one" } as { id: string } | null,
        bind: vi.fn(),
        status: vi.fn(),
        preference: vi.fn(),
        unbind: vi.fn(),
        TwinkleModelAccountError,
    };
});

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn(async () => mocks.currentUser) }));
vi.mock("@/lib/server/twinkle-model-account-service", () => ({
    bindTwinkleModelAccount: mocks.bind,
    getTwinkleModelBindingStatus: mocks.status,
    setTwinkleModelProviderPreference: mocks.preference,
    unbindTwinkleModelAccount: mocks.unbind,
    TwinkleModelAccountError: mocks.TwinkleModelAccountError,
}));

import { DELETE, GET, PATCH, POST } from "./route";

describe("Twinkle Model binding API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.currentUser = { id: "user-one" };
        mocks.status.mockResolvedValue({ bound: true });
        mocks.bind.mockResolvedValue({ bound: true, providerPreference: "twinkle-model" });
        mocks.preference.mockResolvedValue({ bound: true, providerPreference: "twinkle-video" });
        mocks.unbind.mockResolvedValue({ bound: false, providerPreference: "twinkle-video" });
    });

    it("requires the current VOZEB session for every operation", async () => {
        mocks.currentUser = null;

        expect((await GET()).status).toBe(401);
        expect((await POST(jsonRequest({ email: "twinkle@example.com", password: "secret" }))).status).toBe(401);
        expect((await PATCH(jsonRequest({ provider: "twinkle-model" }))).status).toBe(401);
        expect((await DELETE()).status).toBe(401);
    });

    it("binds independent credentials without returning the password", async () => {
        const response = await POST(jsonRequest({ email: "twinkle@example.com", password: "independent-secret" }));

        expect(response.status).toBe(200);
        expect(mocks.bind).toHaveBeenCalledWith({ userId: "user-one", email: "twinkle@example.com", password: "independent-secret" });
        expect(JSON.stringify(await response.json())).not.toContain("independent-secret");
    });

    it("updates the global provider preference and supports unbinding", async () => {
        expect((await PATCH(jsonRequest({ provider: "twinkle-video" }))).status).toBe(200);
        expect(mocks.preference).toHaveBeenCalledWith("user-one", "twinkle-video");

        const response = await DELETE();
        expect(await response.json()).toEqual({ data: { bound: false, providerPreference: "twinkle-video" } });
        expect(mocks.unbind).toHaveBeenCalledWith("user-one");
    });

    it("preserves binding conflict status codes", async () => {
        mocks.bind.mockRejectedValue(new mocks.TwinkleModelAccountError("默认密钥名称重复", 409));

        const response = await POST(jsonRequest({ email: "twinkle@example.com", password: "secret" }));

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({ error: "默认密钥名称重复" });
    });
});

function jsonRequest(body: unknown) {
    return new Request("http://localhost/api/auth/twinkle-model", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
