export interface ProcessedImage {
  original: string; // Base64
  generated: string; // Base64
  transparent: string | null; // Base64 or null
}

export enum LineStyle {
  MINIMAL = 'minimal',
  DETAILED = 'detailed',
  ORGANIC = 'organic'
}

export interface GenerationConfig {
  style: LineStyle;
  promptAddon: string;
}

