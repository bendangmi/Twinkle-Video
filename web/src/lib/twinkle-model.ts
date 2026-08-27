export type TwinkleModelVideoRequestInput = {
    model: string;
    prompt: string;
    duration: number;
    aspectRatio?: string;
    size?: string;
    resolution?: string;
    generateAudio: boolean;
    images?: string[];
    videos?: string[];
    audios?: string[];
    firstFrameUrl?: string;
    lastFrameUrl?: string;
};

export function buildTwinkleModelVideoRequest(input: TwinkleModelVideoRequestInput) {
    assertTwinkleModelVideoReferences(input);
    return {
        model: input.model,
        prompt: input.prompt,
        duration: input.duration,
        ...(input.resolution ? { resolution: input.resolution } : {}),
        ...(input.size ? { size: input.size } : input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}),
        generate_audio: input.generateAudio,
        ...(input.images?.length ? { image_urls: input.images } : {}),
        ...(input.videos?.length ? { video_urls: input.videos } : {}),
        ...(input.audios?.length ? { audio_urls: input.audios } : {}),
        ...(input.firstFrameUrl ? { start_image_url: input.firstFrameUrl } : {}),
        ...(input.lastFrameUrl ? { end_image_url: input.lastFrameUrl } : {}),
    };
}

export function assertTwinkleModelVideoReferences(input: TwinkleModelVideoRequestInput) {
    const images = [...(input.images || []), ...(input.firstFrameUrl ? [input.firstFrameUrl] : []), ...(input.lastFrameUrl ? [input.lastFrameUrl] : [])];
    const imageLimit = /933/i.test(input.model) ? 9 : 4;
    const audioLimit = /933/i.test(input.model) ? 3 : 1;
    if (images.length > imageLimit) throw new Error(`Twinkle Model 最多支持 ${imageLimit} 张参考图片`);
    if ((input.videos || []).length > 3) throw new Error("Twinkle Model 最多支持 3 个参考视频");
    if ((input.audios || []).length > audioLimit) throw new Error(`Twinkle Model 最多支持 ${audioLimit} 个参考音频`);
    if (/933/i.test(input.model) && images.length + (input.videos || []).length + (input.audios || []).length > 9) throw new Error("Twinkle Model 933 模型的参考素材总数不能超过 9 个");
    for (const url of [...images, ...(input.videos || []), ...(input.audios || [])]) {
        if (!/^https?:\/\/\S+$/i.test(url.trim())) throw new Error("Twinkle Model 参考素材必须使用公网 HTTP(S) URL");
    }
}
