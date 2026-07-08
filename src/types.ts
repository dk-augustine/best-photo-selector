export interface UploadedPhoto {
  id: string; // Internal identifier, e.g. "photo-123"
  name: string; // Filename
  size: number; // File size in bytes
  type: string; // MIME type
  localUrl: string; // Object URL for browser rendering
  base64: string; // Base64 data without prefix, for Gemini
  status: "keep" | "discard" | "undecided"; // User choice
  width?: number; // Image dimensions
  height?: number;
}

export interface ImageAnalysis {
  id: string; // Matches Image_1, Image_2, etc.
  name: string; // Original filename
  score: number; // Quality score out of 10
  sharpness: string; // Description of focus / blur
  eyes_status: string; // Description of open/closed eyes
  expression: string; // Description of expression
  lighting_rating: number; // 1-5
  composition_rating: number; // 1-5
  pros: string[];
  cons: string[];
}

export interface AnalysisResult {
  best_image_id: string; // e.g. "Image_1"
  recommendation_summary: string; // Detailed decision context
  analyses: ImageAnalysis[];
}
