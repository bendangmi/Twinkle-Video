import { describe, expect, it } from "vitest";

import { buildTwinkleModelVideoRequest } from "./twinkle-model";

describe("Twinkle Model video protocol", () => {
    it("builds the documented standard gateway request with public media references", () => {
        expect(
            buildTwinkleModelVideoRequest({
                model: "Minimax-H3",
                prompt: "一只猫在窗边跳舞",
                duration: 5,
                aspectRatio: "16:9",
                resolution: "720p",
                generateAudio: true,
                images: ["https://media.example/image.png"],
                videos: ["https://media.example/reference.mp4"],
                audios: ["https://media.example/reference.mp3"],
                firstFrameUrl: "https://media.example/start.png",
                lastFrameUrl: "https://media.example/end.png",
            }),
        ).toEqual({
            model: "Minimax-H3",
            prompt: "一只猫在窗边跳舞",
            duration: 5,
            resolution: "720p",
            aspect_ratio: "16:9",
            generate_audio: true,
            image_urls: ["https://media.example/image.png"],
            video_urls: ["https://media.example/reference.mp4"],
            audio_urls: ["https://media.example/reference.mp3"],
            first_frame_url: "https://media.example/start.png",
            last_frame_url: "https://media.example/end.png",
        });
    });

    it("omits optional references and adaptive fields", () => {
        expect(
            buildTwinkleModelVideoRequest({
                model: "grokv1.5-7-15s",
                prompt: "生成视频",
                duration: 15,
                generateAudio: false,
            }),
        ).toEqual({ model: "grokv1.5-7-15s", prompt: "生成视频", duration: 15, generate_audio: false });
    });
});
