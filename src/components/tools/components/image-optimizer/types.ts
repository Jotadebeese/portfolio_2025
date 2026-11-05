export type OutputFormat = "image/webp" | "image/jpeg" | "image/png";

export type ResizePreset =
  | "original"
  | "1920"
  | "1280"
  | "800"
  | "50%"
  | "custom";

export interface OptimizerSettings {
  format: OutputFormat;
  quality: number;
  resizePreset: ResizePreset;
  customMaxDimension?: number;
}

export type ProcessingStatus = "idle" | "processing" | "done" | "error";

export interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  customName?: string;
  originalSize: number;
  originalType: string;
  originalDimensions: { width: number; height: number };
  originalUrl: string;
  hasAlpha?: boolean;

  status: ProcessingStatus;
  progress: number;
  errorMessage?: string;

  optimizedBlob?: Blob;
  optimizedUrl?: string;
  optimizedSize?: number;
  optimizedDimensions?: { width: number; height: number };
  optimizedFormat?: OutputFormat;
}
