export type VideoOutputFormat = "video/mp4" | "video/webm";

export type VideoResizePreset =
  | "original"
  | "1080p"
  | "720p"
  | "480p"
  | "360p"
  | "custom";

export type VideoFpsOption = "original" | 60 | 30 | 24 | 15;

export type CompressionMode = "quality" | "target-size" | "bitrate";

export interface VideoSection {
  id: string;
  start: number;
  end: number;
  isDeleted?: boolean;
}

export interface VideoOptimizerSettings {
  format: VideoOutputFormat;
  mode: CompressionMode;
  qualityPercent: number;
  bitrateMbps: number;
  targetSizeMB: number;
  resizePreset: VideoResizePreset;
  customMaxDimension?: number;
  targetFps?: VideoFpsOption;
  exportSpeed?: number;
  stripAudio: boolean;
  trim?: {
    start: number;
    end: number;
  };
  sections?: VideoSection[];
}

export type ProcessingStatus = "idle" | "processing" | "done" | "error";

export interface VideoFileItem {
  id: string;
  file: File;
  name: string;
  customName?: string;
  originalSize: number;
  originalType: string;
  originalDimensions: { width: number; height: number };
  originalFps?: number;
  duration: number;
  thumbnailUrl: string;
  originalUrl: string;
  hasAudio: boolean;
  trim?: {
    start: number;
    end: number;
  };
  sections?: VideoSection[];
  stripAudio?: boolean;
  exportSpeed?: number;
  targetFps?: VideoFpsOption;

  status: ProcessingStatus;
  progress: number;
  errorMessage?: string;

  compressedBlob?: Blob;
  compressedUrl?: string;
  compressedSize?: number;
  compressedDimensions?: { width: number; height: number };
  compressedFormat?: VideoOutputFormat;
  compressedDuration?: number;
  compressedFps?: number;
  lastCompressedSettings?: VideoOptimizerSettings;
}
