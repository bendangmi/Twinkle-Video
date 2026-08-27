import { describe, expect, it } from "vitest";

import { buildTwinkleModelVideoRequest } from "./twinkle-model";

describe("Twinkle Model video protocol", () => {
    it("builds the documented standard gateway request with public media references", () => {
        expect(
            buildTwinkleModelVideoRequest({
                model: "Minimax-H3",
                prompt: "一只猫在窗边跳舞",
                duration: 5,
                aspectRatio: "9:16",
                size: "1280x720",
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
            size: "1280x720",
            generate_audio: true,
            image_urls: ["https://media.example/image.png"],
            video_urls: ["https://media.example/reference.mp4"],
            audio_urls: ["https://media.example/reference.mp3"],
            start_image_url: "https://media.example/start.png",
            end_image_url: "https://media.example/end.png",
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

    it("enforces the documented Twinkle Model reference limits and URL shape", () => {
        const base = { model: "Minimax-H3-933-480p", prompt: "生成视频", duration: 4, generateAudio: true };
        expect(() => buildTwinkleModelVideoRequest({ ...base, images: Array.from({ length: 10 }, (_, index) => `https://media.example/${index}.png`) })).toThrow("最多支持 9 张参考图片");
        expect(() =>
            buildTwinkleModelVideoRequest({ ...base, images: Array.from({ length: 7 }, (_, index) => `https://media.example/${index}.png`), videos: ["https://media.example/1.mp4"], audios: ["https://media.example/1.mp3", "https://media.example/2.mp3"] }),
        ).toThrow("参考素材总数不能超过 9 个");
        expect(() => buildTwinkleModelVideoRequest({ ...base, images: ["assetId://image-one"] })).toThrow("必须使用公网 HTTP(S) URL");
    });
});
