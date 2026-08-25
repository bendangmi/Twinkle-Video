import { describe, expect, it, vi } from "vitest";

import { recordChannelRuntimeFailure, recordChannelRuntimeSuccess } from "./channel-runtime-health";
import { finishGenerationAttempt, startGenerationAttempt } from "./generation-attempt";

vi.mock("./channel-runtime-health", () => ({ recordChannelRuntimeFailure: vi.fn(), recordChannelRuntimeSuccess: vi.fn() }));

describe("generation attempts", () => {
    it("keeps a stable ordered history across channel fallback", () => {
        vi.spyOn(Date, "now").mockReturnValueOnce(100).mockReturnValueOnce(200).mockReturnValueOnce(300).mockReturnValueOnce(400);
        const first = startGenerationAttempt([], { channelId: "primary", model: "writer", credentialMode: "twinkle-model" });
        const failed = finishGenerationAttempt(first.attempts, first.attempt.attemptNo, { status: "failed", error: "timeout" });
        const second = startGenerationAttempt(failed, { channelId: "backup", model: "writer", credentialMode: "system" });
        const completed = finishGenerationAttempt(second.attempts, second.attempt.attemptNo, { status: "succeeded", pointsCost: 2 });

        expect(completed).toEqual([
            expect.objectContaining({ attemptNo: 1, channelId: "primary", credentialMode: "twinkle-model", status: "failed", error: "timeout" }),
            expect.objectContaining({ attemptNo: 2, channelId: "backup", credentialMode: "system", status: "succeeded", pointsCost: 2 }),
        ]);
        vi.restoreAllMocks();
    });

    it("only updates shared channel health for system credentials", () => {
        const personal = startGenerationAttempt([], { channelId: "shared", model: "writer", capability: "text", credentialMode: "twinkle-model" });
        finishGenerationAttempt(personal.attempts, personal.attempt.attemptNo, { status: "failed", error: "personal key rejected" });

        const system = startGenerationAttempt([], { channelId: "shared", model: "writer", capability: "text", credentialMode: "system" });
        finishGenerationAttempt(system.attempts, system.attempt.attemptNo, { status: "succeeded" });

        expect(recordChannelRuntimeFailure).not.toHaveBeenCalled();
        expect(recordChannelRuntimeSuccess).toHaveBeenCalledOnce();
        expect(recordChannelRuntimeSuccess).toHaveBeenCalledWith("shared", "text", expect.any(Number));
    });
});
