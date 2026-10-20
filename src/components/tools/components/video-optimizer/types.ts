export type VideoOutputFormat = "video/mp4" | "video/webm";

export type VideoResizePreset =
  | "original"
  | "1080p"
  | "720p"
  | "480p"
  | "360p"
  | "custom";

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
  originalSize: number;
  originalType: string;
  originalDimensions: { width: number; height: number };
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

  status: ProcessingStatus;
  progress: number;
  errorMessage?: string;

  compressedBlob?: Blob;
  compressedUrl?: string;
  compressedSize?: number;
  compressedDimensions?: { width: number; height: number };
  compressedFormat?: VideoOutputFormat;
  compressedDuration?: number;
  lastCompressedSettings?: VideoOptimizerSettings;
}
