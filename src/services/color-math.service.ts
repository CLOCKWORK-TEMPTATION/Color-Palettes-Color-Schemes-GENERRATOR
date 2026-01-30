import { Injectable } from '@angular/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Core Data Models & Constants
// ═══════════════════════════════════════════════════════════════════════════════

export enum DeltaEMethod {
  CIE76 = "cie76",
  CIE94 = "cie94",
  CIEDE2000 = "ciede2000",
}

export enum PaletteHarmonyType {
  COMPLEMENTARY = "complementary",
  ANALOGOUS = "analogous",
  TRIADIC = "triadic",
  SPLIT_COMPLEMENTARY = "split_complementary",
  TETRADIC = "tetradic",
  SQUARE = "square",
  MONOCHROMATIC = "monochromatic",
  RANDOM_HARMONIOUS = "random_harmonious",
}

export interface IPaletteConfig {
  dislikeRatio: number;
  minPaletteDistance: number;
  maxPaletteDistance: number;
  deltaEMethod: DeltaEMethod;
  minColorsPerPalette: number;
  maxColorsPerPalette: number;
  generationAttempts: number;
  allowedHarmonies: PaletteHarmonyType[];
}

const DEFAULT_CONFIG: IPaletteConfig = {
  dislikeRatio: 7,
  minPaletteDistance: 25.0,
  maxPaletteDistance: 150.0,
  deltaEMethod: DeltaEMethod.CIEDE2000,
  minColorsPerPalette: 5,
  maxColorsPerPalette: 5,
  generationAttempts: 200, // Reduced for browser performance
  allowedHarmonies: Object.values(PaletteHarmonyType),
};

export class RGBColor {
  public readonly r: number;
  public readonly g: number;
  public readonly b: number;

  constructor(r: number, g: number, b: number) {
    this.r = Math.max(0, Math.min(255, Math.round(r)));
    this.g = Math.max(0, Math.min(255, Math.round(g)));
    this.b = Math.max(0, Math.min(255, Math.round(b)));
  }

  toHex(): string {
    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
  }

  toNormalized(): [number, number, number] {
    return [this.r / 255.0, this.g / 255.0, this.b / 255.0];
  }

  toHsv(): [number, number, number] {
    const [r, g, b] = this.toNormalized();
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s, v];
  }

  static fromHex(hex: string): RGBColor {
    const cleanHex = hex.replace(/^#/, "");
    if (cleanHex.length !== 6) return new RGBColor(0,0,0);
    return new RGBColor(
      parseInt(cleanHex.substring(0, 2), 16),
      parseInt(cleanHex.substring(2, 4), 16),
      parseInt(cleanHex.substring(4, 6), 16),
    );
  }

  static fromHsv(h: number, s: number, v: number): RGBColor {
    const hNormalized = ((h % 360) + 360) % 360 / 360; 
    const sClamped = Math.max(0, Math.min(1, s));
    const vClamped = Math.max(0, Math.min(1, v));

    const i = Math.floor(hNormalized * 6);
    const f = hNormalized * 6 - i;
    const p = vClamped * (1 - sClamped);
    const q = vClamped * (1 - f * sClamped);
    const t = vClamped * (1 - (1 - f) * sClamped);

    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = vClamped; g = t; b = p; break;
      case 1: r = q; g = vClamped; b = p; break;
      case 2: r = p; g = vClamped; b = t; break;
      case 3: r = p; g = q; b = vClamped; break;
      case 4: r = t; g = p; b = vClamped; break;
      case 5: r = vClamped; g = p; b = q; break;
    }
    return new RGBColor(r * 255, g * 255, b * 255);
  }
}

export interface LABColor { L: number; a: number; b: number; }

export class ColorPalette {
  public readonly colors: ReadonlyArray<RGBColor>;
  constructor(colors: RGBColor[], public readonly harmonyType: PaletteHarmonyType | null = null) {
    this.colors = [...colors];
  }
  get length(): number { return this.colors.length; }
  getDominantHue(): number {
    const hues = this.colors.map((c) => c.toHsv()[0]);
    return hues.reduce((a, b) => a + b, 0) / hues.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Logic Classes (Hidden from export)
// ═══════════════════════════════════════════════════════════════════════════════

class ColorSpaceConverter {
  private static readonly REF_X = 95.047;
  private static readonly REF_Y = 100.0;
  private static readonly REF_Z = 108.883;

  static rgbToLab(rgb: RGBColor): LABColor {
    const linearize = (c: number): number => c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
    let [r, g, b] = rgb.toNormalized();
    r = linearize(r); g = linearize(g); b = linearize(b);

    const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
    const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) * 100;
    const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) * 100;

    const f = (t: number): number => t > Math.pow(6/29, 3) ? Math.pow(t, 1/3) : t / (3 * Math.pow(6/29, 2)) + 4/29;
    
    return {
      L: 116 * f(y / this.REF_Y) - 16,
      a: 500 * (f(x / this.REF_X) - f(y / this.REF_Y)),
      b: 200 * (f(y / this.REF_Y) - f(z / this.REF_Z))
    };
  }
}

class DeltaE2000Calculator {
  private toRad(deg: number): number { return deg * (Math.PI / 180); }
  private toDeg(rad: number): number { return rad * (180 / Math.PI); }

  calculate(lab1: LABColor, lab2: LABColor): number {
    const { L: L1, a: a1, b: b1 } = lab1;
    const { L: L2, a: a2, b: b2 } = lab2;

    const C1 = Math.sqrt(a1 ** 2 + b1 ** 2);
    const C2 = Math.sqrt(a2 ** 2 + b2 ** 2);
    const CBar = (C1 + C2) / 2;

    const G = 0.5 * (1 - Math.sqrt(CBar ** 7 / (CBar ** 7 + 25 ** 7)));
    const a1P = a1 * (1 + G);
    const a2P = a2 * (1 + G);
    const C1P = Math.sqrt(a1P ** 2 + b1 ** 2);
    const C2P = Math.sqrt(a2P ** 2 + b2 ** 2);

    const hP = (a: number, b: number) => {
      if (a === 0 && b === 0) return 0;
      const h = this.toDeg(Math.atan2(b, a));
      return h < 0 ? h + 360 : h;
    };
    const h1P = hP(a1P, b1);
    const h2P = hP(a2P, b2);

    const dLP = L2 - L1;
    const dCP = C2P - C1P;
    
    let dhP = 0;
    if (C1P * C2P !== 0) {
      if (Math.abs(h2P - h1P) <= 180) dhP = h2P - h1P;
      else dhP = (h2P - h1P) - (h2P - h1P > 180 ? 360 : -360);
    }
    
    const dHP = 2 * Math.sqrt(C1P * C2P) * Math.sin(this.toRad(dhP / 2));
    const LBP = (L1 + L2) / 2;
    const CBP = (C1P + C2P) / 2;
    
    const hBP = (Math.abs(h1P - h2P) <= 180) ? (h1P + h2P) / 2 : (h1P + h2P + (h1P + h2P < 360 ? 360 : -360)) / 2;
    
    const T = 1 - 0.17 * Math.cos(this.toRad(hBP - 30)) + 0.24 * Math.cos(this.toRad(2 * hBP)) 
              + 0.32 * Math.cos(this.toRad(3 * hBP + 6)) - 0.2 * Math.cos(this.toRad(4 * hBP - 63));
    
    const SL = 1 + (0.015 * (LBP - 50) ** 2) / Math.sqrt(20 + (LBP - 50) ** 2);
    const SC = 1 + 0.045 * CBP;
    const SH = 1 + 0.015 * CBP * T;
    
    const RT = -2 * Math.sqrt(CBP ** 7 / (CBP ** 7 + 25 ** 7)) * Math.sin(this.toRad(60 * Math.exp(-(((hBP - 275) / 25) ** 2))));

    return Math.sqrt((dLP / SL) ** 2 + (dCP / SC) ** 2 + (dHP / SH) ** 2 + RT * (dCP / SC) * (dHP / SH));
  }
}

class HarmoniousPaletteGenerator {
  private randomUniform(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private vary(baseS: number, baseV: number): [number, number] {
    const s = Math.max(0.1, Math.min(1.0, baseS + this.randomUniform(-0.2, 0.2)));
    const v = Math.max(0.2, Math.min(1.0, baseV + this.randomUniform(-0.2, 0.2)));
    return [s, v];
  }

  generate(type: PaletteHarmonyType, baseHue: number, size: number): ColorPalette {
    const colors: RGBColor[] = [];
    const sat = 0.7, val = 0.8;
    let hues: number[] = [];

    switch(type) {
      case PaletteHarmonyType.COMPLEMENTARY: hues = [baseHue, baseHue + 180]; break;
      case PaletteHarmonyType.ANALOGOUS: hues = Array.from({length: size}, (_, i) => baseHue + (i - size/2) * 30/size); break;
      case PaletteHarmonyType.TRIADIC: hues = [baseHue, baseHue + 120, baseHue + 240]; break;
      case PaletteHarmonyType.SQUARE: hues = [baseHue, baseHue + 90, baseHue + 180, baseHue + 270]; break;
      case PaletteHarmonyType.MONOCHROMATIC: hues = Array(size).fill(baseHue); break;
      default: hues = [baseHue, baseHue + 180]; 
    }

    for (let i = 0; i < size; i++) {
      const h = hues[i % hues.length] + this.randomUniform(-10, 10);
      const [s, v] = this.vary(sat, val);
      colors.push(RGBColor.fromHsv(h, s, v));
    }
    
    return new ColorPalette(colors, type);
  }
}

@Injectable({
  providedIn: 'root'
})
export class ColorMathService {
  private config: IPaletteConfig = DEFAULT_CONFIG;
  private calculator = new DeltaE2000Calculator();
  private generator = new HarmoniousPaletteGenerator();

  constructor() {}

  // The main entry point for the Anti-Palette feature
  generateDislikedPalette(baseHexColors: string[]): { palette: ColorPalette; distance: number; method: string } | null {
    if (baseHexColors.length === 0) return null;

    const preferredPalette = new ColorPalette(baseHexColors.map(h => RGBColor.fromHex(h)));
    const preferredLabs = preferredPalette.colors.map(c => ColorSpaceConverter.rgbToLab(c));
    const preferredHue = preferredPalette.getDominantHue();

    let bestCandidate: ColorPalette | null = null;
    let maxMinDistance = -1;

    // Generate candidates
    for (let i = 0; i < this.config.generationAttempts; i++) {
      // Pick a random harmony for the candidate
      const harmonies = this.config.allowedHarmonies;
      const type = harmonies[Math.floor(Math.random() * harmonies.length)];
      
      // Try to pick a hue far from the preferred one
      const candidateHue = (preferredHue + 180 + (Math.random() * 60 - 30)) % 360; 
      
      const candidate = this.generator.generate(type, candidateHue, this.config.minColorsPerPalette);
      
      // Calculate distance (simplified average min distance logic)
      const candidateLabs = candidate.colors.map(c => ColorSpaceConverter.rgbToLab(c));
      
      let currentTotalMinDist = 0;
      for (const cLab of candidateLabs) {
        let minDist = Number.MAX_VALUE;
        for (const pLab of preferredLabs) {
          const d = this.calculator.calculate(cLab, pLab);
          if (d < minDist) minDist = d;
        }
        currentTotalMinDist += minDist;
      }
      
      const avgDist = currentTotalMinDist / candidateLabs.length;

      // We want the palette with the HIGHEST average distance from the preferred set
      if (avgDist > maxMinDistance) {
        maxMinDistance = avgDist;
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) return null;

    return {
      palette: bestCandidate,
      distance: maxMinDistance,
      method: bestCandidate.harmonyType || 'random'
    };
  }
}
