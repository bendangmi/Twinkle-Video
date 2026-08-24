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
    startImageUrl?: string;
    endImageUrl?: string;
};

export function buildTwinkleModelVideoRequest(input: TwinkleModelVideoRequestInput) {
    return {
        model: input.model,
        prompt: input.prompt,
        duration: input.duration,
        ...(input.resolution ? { resolution: input.resolution } : {}),
        ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}),
        generate_audio: input.generateAudio,
        ...(input.images?.length ? { images: input.images } : {}),
        ...(input.videos?.length ? { video_references: input.videos.map((url) => ({ url })) } : {}),
        ...(input.audios?.length ? { audio_references: input.audios.map((url) => ({ url })) } : {}),
        ...(input.startImageUrl ? { start_image_url: input.startImageUrl } : {}),
        ...(input.endImageUrl ? { end_image_url: input.endImageUrl } : {}),
    };
}
