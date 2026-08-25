export type TwinkleModelVideoRequestInput = {
    model: string;
    prompt: string;
    duration: number;
    aspectRatio?: string;
    resolution?: string;
    generateAudio: boolean;
    images?: string[];
    videos?: string[];
    audios?: string[];
    firstFrameUrl?: string;
    lastFrameUrl?: string;
};

export function buildTwinkleModelVideoRequest(input: TwinkleModelVideoRequestInput) {
    return {
        model: input.model,
        prompt: input.prompt,
        duration: input.duration,
        ...(input.resolution ? { resolution: input.resolution } : {}),
        ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}),
        generate_audio: input.generateAudio,
        ...(input.images?.length ? { image_urls: input.images } : {}),
        ...(input.videos?.length ? { video_urls: input.videos } : {}),
        ...(input.audios?.length ? { audio_urls: input.audios } : {}),
        ...(input.firstFrameUrl ? { first_frame_url: input.firstFrameUrl } : {}),
        ...(input.lastFrameUrl ? { last_frame_url: input.lastFrameUrl } : {}),
    };
}
