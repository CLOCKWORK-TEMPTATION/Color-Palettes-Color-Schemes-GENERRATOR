export interface Color {
  hex: string;
  rgb?: string;
  hsl?: string;
  name: string;
  description: string;
  textColor?: string;
  luminance?: number;
}

export interface Palette {
  id: string;
  paletteName: string;
  description: string;
  colors: Color[];
  createdAt: number;
}

export interface HistoryItem {
  prompt: string;
  palette: Palette;
}

export interface User {
  username: string;
  savedPalettes: Palette[];
}