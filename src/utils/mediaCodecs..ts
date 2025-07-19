import { TmediaCodecs } from "../types/media/mediaCodecs";

export const mediaCodecs: TmediaCodecs[] = [
    {
        kind: 'audio',
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
            'x-google-min-bitrate': 300,
            'x-google-max-bitrate': 1500,
        }
    }
]