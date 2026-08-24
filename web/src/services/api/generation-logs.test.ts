import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteGenerationLog } from "./generation-logs";

describe("generation log API", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("deletes one generation record by its stable ID", async () => {
        const fetchMock = vi.fn(async () => Response.json({ deleted: 1 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(deleteGenerationLog("log-one")).resolves.toBe(1);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/generation-logs",
            expect.objectContaining({
                method: "DELETE",
                body: JSON.stringify({ ids: ["log-one"] }),
                cache: "no-store",
            }),
        );
    });

    it("reports the server error when deletion fails", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ error: "无权删除" }), { status: 403 })),
        );

        await expect(deleteGenerationLog("log-one")).rejects.toThrow("无权删除");
    });
});
