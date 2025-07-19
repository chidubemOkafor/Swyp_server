type bitrate = "x-google-start-bitrate" | "x-google-min-bitrate" | "x-google-max-bitrate"

type videoOptions = "video/VP8" | "video/H264" | "video/VP9"
type audioOptions = "audio/opus"

export type TmediaCodecs = {
    kind: "audio" | "video",
    mimeType: videoOptions | audioOptions,
    clockRate: number,
    channels?: number,
    parameters?: Record<bitrate, number>
}