import { Injectable } from '@angular/core';

// ═══════════════════════════════════════════════════════════════════════════════
// النظام الموحد لتوليد الألوان المتباعدة (Disliked Colors & Palettes)
// يدمج هذا الملف نظامين:
// 1. نظام الألوان الفردية (Color-based) - لتوليد ألوان فردية متباعدة
// 2. نظام الباليتات (Palette-based) - لتوليد مجموعات ألوان متناسقة ومتباعدة
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// Logging System - نظام التسجيل
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * نظام تسجيل بسيط للمتصفح
 * يمكن استبداله بنظام أكثر تعقيداً في الإنتاج
 */
class Logger {
  private context: string;
  private enabled: boolean;

  constructor(context: string, enabled: boolean = false) {
    this.context = context;
    this.enabled = enabled;
  }

  private formatMessage(level: string, message: string): string {
    return `[${level}] [${new Date().toISOString()}] [${this.context}] ${message}`;
  }

  info(message: string, data?: unknown): void {
    if (!this.enabled) return;
    console.log(this.formatMessage('INFO', message), data ?? '');
  }

  warn(message: string, data?: unknown): void {
    if (!this.enabled) return;
    console.warn(this.formatMessage('WARN', message), data ?? '');
  }

  error(message: string, error?: unknown): void {
    // الأخطاء تُسجل دائماً
    console.error(this.formatMessage('ERROR', message), error ?? '');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Seeded Random Number Generator - مولد أرقام عشوائية قابل للتكرار
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * مولد أرقام عشوائية باستخدام خوارزمية Linear Congruential Generator
 * يسمح بإعادة إنتاج نفس النتائج عند استخدام نفس البذرة
 */
class SeededRandom {
  private seed: number;
  private readonly multiplier = 1664525;
  private readonly increment = 1013904223;
  private readonly modulus = 4294967296;

  constructor(seed: number | null = null) {
    this.seed = seed !== null ? seed : Date.now();
  }

  /**
   * يُرجع رقم عشري بين 0 و 1
   */
  next(): number {
    this.seed = (this.multiplier * this.seed + this.increment) % this.modulus;
    return this.seed / this.modulus;
  }

  /**
   * يُرجع رقم صحيح بين min و max (شامل)
   */
  randint(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * يُرجع رقم عشري بين min و max
   */
  uniform(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * يختار عنصر عشوائي من مصفوفة
   */
  choice<T>(array: ReadonlyArray<T>): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[Math.floor(this.next() * array.length)];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Math Utilities - أدوات رياضية
// ═══════════════════════════════════════════════════════════════════════════════

const MathUtils = {
  toRadians: (deg: number): number => deg * (Math.PI / 180),
  toDegrees: (rad: number): number => rad * (180 / Math.PI),
  clamp: (value: number, min: number, max: number): number => 
    Math.max(min, Math.min(max, value)),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Enums & Constants - التعدادات والثوابت
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * طرق حساب DeltaE المدعومة
 * CIE76: الأسرع، الأقل دقة
 * CIE94: توازن بين السرعة والدقة
 * CIEDE2000: الأدق، الأبطأ
 */
export enum DeltaEMethod {
  CIE76 = 'cie76',
  CIE94 = 'cie94',
  CIEDE2000 = 'ciede2000',
}

/**
 * طرق حساب المسافة بين الباليتات
 */
export enum PaletteDistanceMethod {
  HAUSDORFF = 'hausdorff',
  AVERAGE_MIN = 'average_min',
  WEIGHTED_AVERAGE = 'weighted_average',
  BIDIRECTIONAL_HAUSDORFF = 'bidirectional',
}

/**
 * أنواع التناسق اللوني (Color Harmony)
 */
export enum PaletteHarmonyType {
  COMPLEMENTARY = 'complementary',
  ANALOGOUS = 'analogous',
  TRIADIC = 'triadic',
  SPLIT_COMPLEMENTARY = 'split_complementary',
  TETRADIC = 'tetradic',
  SQUARE = 'square',
  MONOCHROMATIC = 'monochromatic',
  RANDOM_HARMONIOUS = 'random_harmonious',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Interfaces - واجهات الإعدادات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إعدادات توليد الألوان الفردية
 */
export interface IColorConfig {
  readonly dislikeRatio: number;
  readonly minDeltaEThreshold: number;
  readonly maxDeltaEThreshold: number;
  readonly deltaEMethod: DeltaEMethod;
  readonly colorSpaceDivisions: number;
  readonly randomSeed: number | null;
}

/**
 * إعدادات توليد الباليتات
 */
export interface IPaletteConfig {
  readonly dislikeRatio: number;
  readonly minPaletteDistance: number;
  readonly maxPaletteDistance: number;
  readonly deltaEMethod: DeltaEMethod;
  readonly paletteDistanceMethod: PaletteDistanceMethod;
  readonly minColorsPerPalette: number;
  readonly maxColorsPerPalette: number;
  readonly defaultPaletteSize: number;
  readonly generationAttempts: number;
  readonly randomSeed: number | null;
  readonly allowedHarmonies: ReadonlyArray<PaletteHarmonyType>;
}

/**
 * الإعدادات الموحدة للنظام
 */
export interface IUnifiedConfig {
  readonly color: IColorConfig;
  readonly palette: IPaletteConfig;
  readonly enableLogging: boolean;
  readonly enableCache: boolean;
  readonly cacheSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Configurations - الإعدادات الافتراضية
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_COLOR_CONFIG: IColorConfig = {
  dislikeRatio: 7,
  minDeltaEThreshold: 30.0,
  maxDeltaEThreshold: 100.0,
  deltaEMethod: DeltaEMethod.CIEDE2000,
  colorSpaceDivisions: 16,
  randomSeed: null,
};

const DEFAULT_PALETTE_CONFIG: IPaletteConfig = {
  dislikeRatio: 7,
  minPaletteDistance: 25.0,
  maxPaletteDistance: 150.0,
  deltaEMethod: DeltaEMethod.CIEDE2000,
  paletteDistanceMethod: PaletteDistanceMethod.AVERAGE_MIN,
  minColorsPerPalette: 3,
  maxColorsPerPalette: 7,
  defaultPaletteSize: 5,
  generationAttempts: 200,
  randomSeed: null,
  allowedHarmonies: Object.values(PaletteHarmonyType),
};

const DEFAULT_UNIFIED_CONFIG: IUnifiedConfig = {
  color: DEFAULT_COLOR_CONFIG,
  palette: DEFAULT_PALETTE_CONFIG,
  enableLogging: false,
  enableCache: true,
  cacheSize: 4096,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Core Data Models - نماذج البيانات الأساسية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * يمثل لون في فضاء RGB
 * القيم محصورة بين 0 و 255
 */
export class RGBColor {
  public readonly r: number;
  public readonly g: number;
  public readonly b: number;

  constructor(r: number, g: number, b: number, validate: boolean = true) {
    if (validate) {
      this.validateChannel('r', r);
      this.validateChannel('g', g);
      this.validateChannel('b', b);
    }
    this.r = Math.round(MathUtils.clamp(r, 0, 255));
    this.g = Math.round(MathUtils.clamp(g, 0, 255));
    this.b = Math.round(MathUtils.clamp(b, 0, 255));
  }

  private validateChannel(name: string, value: number): void {
    if (!Number.isFinite(value)) {
      throw new Error(`${name} must be a finite number. Got: ${value}`);
    }
  }

  /**
   * تحويل إلى صيغة Hex
   */
  toHex(): string {
    const toHex = (c: number): string => c.toString(16).padStart(2, '0');
    return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
  }

  /**
   * تحويل إلى قيم مُطبَّعة (0-1)
   */
  toNormalized(): [number, number, number] {
    return [this.r / 255.0, this.g / 255.0, this.b / 255.0];
  }

  /**
   * تحويل إلى صيغة HSV
   * @returns [hue (0-360), saturation (0-1), value (0-1)]
   */
  toHsv(): [number, number, number] {
    const [r, g, b] = this.toNormalized();
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    const s = max === 0 ? 0 : delta / max;
    const v = max;

    if (delta !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / delta + 2) / 6;
          break;
        case b:
          h = ((r - g) / delta + 4) / 6;
          break;
      }
    }

    return [h * 360, s, v];
  }

  /**
   * تحويل إلى نص CSS
   */
  toRgbString(): string {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  /**
   * إنشاء من صيغة Hex
   */
  static fromHex(hex: string): RGBColor {
    const cleanHex = hex.replace(/^#/, '');
    
    if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      throw new Error(`Invalid HEX format: ${hex}. Expected 6 hex characters.`);
    }

    return new RGBColor(
      parseInt(cleanHex.substring(0, 2), 16),
      parseInt(cleanHex.substring(2, 4), 16),
      parseInt(cleanHex.substring(4, 6), 16),
      false
    );
  }

  /**
   * إنشاء من صيغة HSV
   */
  static fromHsv(h: number, s: number, v: number): RGBColor {
    const hNormalized = ((h % 360) + 360) % 360 / 360;
    const sClamped = MathUtils.clamp(s, 0, 1);
    const vClamped = MathUtils.clamp(v, 0, 1);

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

    return new RGBColor(r * 255, g * 255, b * 255, false);
  }

  /**
   * التحقق من التساوي
   */
  equals(other: RGBColor): boolean {
    return this.r === other.r && this.g === other.g && this.b === other.b;
  }
}

/**
 * يمثل لون في فضاء CIELAB
 */
export class LABColor {
  constructor(
    public readonly L: number,
    public readonly a: number,
    public readonly b: number
  ) {}

  /**
   * مفتاح فريد للتخزين المؤقت
   */
  toKey(): string {
    return `${this.L.toFixed(4)}_${this.a.toFixed(4)}_${this.b.toFixed(4)}`;
  }
}

/**
 * يمثل مجموعة ألوان (Palette)
 */
export class ColorPalette {
  public readonly colors: ReadonlyArray<RGBColor>;
  public readonly name: string;
  public readonly harmonyType: PaletteHarmonyType | null;

  constructor(
    colors: RGBColor[],
    name: string = '',
    harmonyType: PaletteHarmonyType | null = null
  ) {
    if (colors.length < 2) {
      throw new Error('Palette must contain at least 2 colors');
    }
    this.colors = Object.freeze([...colors]);
    this.name = name;
    this.harmonyType = harmonyType;
  }

  get length(): number {
    return this.colors.length;
  }

  /**
   * الحصول على قائمة Hex
   */
  toHexList(): string[] {
    return this.colors.map(c => c.toHex());
  }

  /**
   * حساب الـ Hue السائد
   */
  getDominantHue(): number {
    const hues = this.colors.map(c => c.toHsv()[0]);
    return hues.reduce((sum, h) => sum + h, 0) / hues.length;
  }

  /**
   * حساب متوسط التشبع
   */
  getAverageSaturation(): number {
    const saturations = this.colors.map(c => c.toHsv()[1]);
    return saturations.reduce((sum, s) => sum + s, 0) / saturations.length;
  }

  /**
   * حساب متوسط القيمة
   */
  getAverageValue(): number {
    const values = this.colors.map(c => c.toHsv()[2]);
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Result Interfaces - واجهات النتائج
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * عينة لون مع معلومات إضافية
 */
export interface ColorSample {
  readonly color: RGBColor;
  readonly isPreferred: boolean;
  readonly deltaEFromNearestPreferred: number | null;
  readonly source: 'user' | 'generated';
}

/**
 * عينة باليت مع معلومات إضافية
 */
export interface PaletteSample {
  readonly palette: ColorPalette;
  readonly isPreferred: boolean;
  readonly distanceFromNearestPreferred: number | null;
  readonly source: 'user' | 'generated';
  readonly generationMethod: PaletteHarmonyType | null;
}

/**
 * إحصائيات توليد الألوان
 */
export interface ColorGenerationStatistics {
  readonly preferredCount: number;
  readonly dislikedCount: number;
  readonly ratio: string;
  readonly deltaEMethod: string;
  readonly minDeltaE: number;
  readonly maxDeltaE: number;
  readonly avgDeltaE: number;
  readonly candidatesGenerated: number;
  readonly candidatesFiltered: number;
}

/**
 * إحصائيات توليد الباليتات
 */
export interface PaletteGenerationStatistics {
  readonly preferredCount: number;
  readonly dislikedCount: number;
  readonly ratio: string;
  readonly deltaEMethod: string;
  readonly paletteDistanceMethod: string;
  readonly minDistance: number;
  readonly maxDistance: number;
  readonly avgDistance: number;
  readonly generationAttempts: number;
  readonly paletteSize: number;
  readonly harmonyDistribution: Record<string, number>;
}

/**
 * نتيجة توليد الألوان الفردية
 */
export interface ColorGenerationResult {
  readonly preferredColors: ColorSample[];
  readonly dislikedColors: ColorSample[];
  readonly statistics: ColorGenerationStatistics;
}

/**
 * نتيجة توليد الباليتات
 */
export interface PaletteGenerationResult {
  readonly preferredPalettes: PaletteSample[];
  readonly dislikedPalettes: PaletteSample[];
  readonly statistics: PaletteGenerationStatistics;
}

/**
 * نتيجة Anti-Palette المبسطة (للاستخدام في الواجهة)
 */
export interface AntiPaletteResult {
  readonly palette: ColorPalette;
  readonly distance: number;
  readonly method: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Color Space Converter - محول فضاءات الألوان
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * محول بين فضاءات الألوان المختلفة
 * يدعم التحويل بين RGB, XYZ, LAB
 * يتضمن نظام تخزين مؤقت لتحسين الأداء
 */
class ColorSpaceConverter {
  // نقطة البياض المرجعية D65
  private static readonly REF_X = 95.047;
  private static readonly REF_Y = 100.0;
  private static readonly REF_Z = 108.883;

  // التخزين المؤقت
  private cache: Map<string, LABColor> = new Map();
  private cacheEnabled: boolean;
  private maxCacheSize: number;

  constructor(cacheEnabled: boolean = true, maxCacheSize: number = 4096) {
    this.cacheEnabled = cacheEnabled;
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * تحويل RGB إلى XYZ
   */
  rgbToXyz(rgb: RGBColor): [number, number, number] {
    const linearize = (c: number): number => {
      return c > 0.04045 
        ? Math.pow((c + 0.055) / 1.055, 2.4) 
        : c / 12.92;
    };

    let [r, g, b] = rgb.toNormalized();
    r = linearize(r);
    g = linearize(g);
    b = linearize(b);

    const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
    const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
    const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;

    return [x, y, z];
  }

  /**
   * تحويل XYZ إلى LAB
   */
  xyzToLab(x: number, y: number, z: number): LABColor {
    const f = (t: number): number => {
      const delta = 6 / 29;
      return t > Math.pow(delta, 3)
        ? Math.pow(t, 1 / 3)
        : t / (3 * Math.pow(delta, 2)) + 4 / 29;
    };

    const xn = x / ColorSpaceConverter.REF_X;
    const yn = y / ColorSpaceConverter.REF_Y;
    const zn = z / ColorSpaceConverter.REF_Z;

    const L = 116 * f(yn) - 16;
    const a = 500 * (f(xn) - f(yn));
    const b = 200 * (f(yn) - f(zn));

    return new LABColor(L, a, b);
  }

  /**
   * تحويل RGB إلى LAB مع تخزين مؤقت
   */
  rgbToLab(rgb: RGBColor): LABColor {
    const key = rgb.toHex();

    if (this.cacheEnabled && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const [x, y, z] = this.rgbToXyz(rgb);
    const lab = this.xyzToLab(x, y, z);

    if (this.cacheEnabled) {
      if (this.cache.size >= this.maxCacheSize) {
        // حذف أقدم 25% من الإدخالات
        const keysToDelete = Array.from(this.cache.keys())
          .slice(0, Math.floor(this.maxCacheSize / 4));
        keysToDelete.forEach(k => this.cache.delete(k));
      }
      this.cache.set(key, lab);
    }

    return lab;
  }

  /**
   * تحويل LAB إلى XYZ
   */
  labToXyz(lab: LABColor): [number, number, number] {
    const fInv = (t: number): number => {
      const delta = 6 / 29;
      return t > delta
        ? Math.pow(t, 3)
        : 3 * Math.pow(delta, 2) * (t - 4 / 29);
    };

    const { L, a, b } = lab;
    const y = ColorSpaceConverter.REF_Y * fInv((L + 16) / 116);
    const x = ColorSpaceConverter.REF_X * fInv((L + 16) / 116 + a / 500);
    const z = ColorSpaceConverter.REF_Z * fInv((L + 16) / 116 - b / 200);

    return [x, y, z];
  }

  /**
   * تحويل XYZ إلى RGB
   */
  xyzToRgb(x: number, y: number, z: number): RGBColor {
    const xn = x / 100;
    const yn = y / 100;
    const zn = z / 100;

    let r = xn *  3.2404542 + yn * -1.5371385 + zn * -0.4985314;
    let g = xn * -0.9692660 + yn *  1.8760108 + zn *  0.0415560;
    let b = xn *  0.0556434 + yn * -0.2040259 + zn *  1.0572252;

    const gammaCorrect = (c: number): number => {
      return c > 0.0031308
        ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055
        : 12.92 * c;
    };

    r = MathUtils.clamp(gammaCorrect(r), 0, 1);
    g = MathUtils.clamp(gammaCorrect(g), 0, 1);
    b = MathUtils.clamp(gammaCorrect(b), 0, 1);

    return new RGBColor(r * 255, g * 255, b * 255, false);
  }

  /**
   * تحويل LAB إلى RGB
   */
  labToRgb(lab: LABColor): RGBColor {
    const [x, y, z] = this.labToXyz(lab);
    return this.xyzToRgb(x, y, z);
  }

  /**
   * مسح التخزين المؤقت
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * حجم التخزين المؤقت الحالي
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeltaE Calculators - حاسبات DeltaE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * واجهة حاسب DeltaE
 */
interface IDeltaECalculator {
  calculate(lab1: LABColor, lab2: LABColor): number;
}

/**
 * حاسب CIE76 - الأسرع، الأقل دقة
 * مناسب للحسابات السريعة حيث الدقة ليست حرجة
 */
class DeltaE76Calculator implements IDeltaECalculator {
  calculate(lab1: LABColor, lab2: LABColor): number {
    return Math.sqrt(
      Math.pow(lab2.L - lab1.L, 2) +
      Math.pow(lab2.a - lab1.a, 2) +
      Math.pow(lab2.b - lab1.b, 2)
    );
  }
}

/**
 * حاسب CIE94 - توازن بين السرعة والدقة
 * يأخذ في الاعتبار اختلافات الإدراك البشري
 */
class DeltaE94Calculator implements IDeltaECalculator {
  constructor(
    private readonly kL: number = 1,
    private readonly kC: number = 1,
    private readonly kH: number = 1
  ) {}

  calculate(lab1: LABColor, lab2: LABColor): number {
    const C1 = Math.sqrt(Math.pow(lab1.a, 2) + Math.pow(lab1.b, 2));
    const C2 = Math.sqrt(Math.pow(lab2.a, 2) + Math.pow(lab2.b, 2));

    const deltaL = lab1.L - lab2.L;
    const deltaC = C1 - C2;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;

    const deltaHSq = Math.pow(deltaA, 2) + Math.pow(deltaB, 2) - Math.pow(deltaC, 2);
    const deltaH = Math.sqrt(Math.max(0, deltaHSq));

    const SL = 1;
    const SC = 1 + 0.045 * C1;
    const SH = 1 + 0.015 * C1;

    const termL = deltaL / (this.kL * SL);
    const termC = deltaC / (this.kC * SC);
    const termH = deltaH / (this.kH * SH);

    return Math.sqrt(
      Math.pow(termL, 2) + 
      Math.pow(termC, 2) + 
      Math.pow(termH, 2)
    );
  }
}

/**
 * حاسب CIEDE2000 - الأدق
 * المعيار الحالي في الصناعة للمقارنات اللونية الدقيقة
 */
class DeltaE2000Calculator implements IDeltaECalculator {
  constructor(
    private readonly kL: number = 1,
    private readonly kC: number = 1,
    private readonly kH: number = 1
  ) {}

  calculate(lab1: LABColor, lab2: LABColor): number {
    const { L: L1, a: a1, b: b1 } = lab1;
    const { L: L2, a: a2, b: b2 } = lab2;

    // الخطوة 1: حساب C' و h'
    const C1 = Math.sqrt(a1 ** 2 + b1 ** 2);
    const C2 = Math.sqrt(a2 ** 2 + b2 ** 2);
    const CBar = (C1 + C2) / 2;

    const G = 0.5 * (1 - Math.sqrt(CBar ** 7 / (CBar ** 7 + 25 ** 7)));

    const a1Prime = a1 * (1 + G);
    const a2Prime = a2 * (1 + G);

    const C1Prime = Math.sqrt(a1Prime ** 2 + b1 ** 2);
    const C2Prime = Math.sqrt(a2Prime ** 2 + b2 ** 2);

    const calcHPrime = (aPrime: number, b: number): number => {
      if (aPrime === 0 && b === 0) return 0;
      const h = MathUtils.toDegrees(Math.atan2(b, aPrime));
      return h < 0 ? h + 360 : h;
    };

    const h1Prime = calcHPrime(a1Prime, b1);
    const h2Prime = calcHPrime(a2Prime, b2);

    // الخطوة 2: حساب الفروقات
    const deltaLPrime = L2 - L1;
    const deltaCPrime = C2Prime - C1Prime;

    let deltahPrime = 0;
    if (C1Prime * C2Prime === 0) {
      deltahPrime = 0;
    } else if (Math.abs(h2Prime - h1Prime) <= 180) {
      deltahPrime = h2Prime - h1Prime;
    } else if (h2Prime - h1Prime > 180) {
      deltahPrime = h2Prime - h1Prime - 360;
    } else {
      deltahPrime = h2Prime - h1Prime + 360;
    }

    const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * 
      Math.sin(MathUtils.toRadians(deltahPrime / 2));

    // الخطوة 3: حساب المتوسطات
    const LBarPrime = (L1 + L2) / 2;
    const CBarPrime = (C1Prime + C2Prime) / 2;

    let hBarPrime = 0;
    if (C1Prime * C2Prime === 0) {
      hBarPrime = h1Prime + h2Prime;
    } else if (Math.abs(h1Prime - h2Prime) <= 180) {
      hBarPrime = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
      hBarPrime = (h1Prime + h2Prime + 360) / 2;
    } else {
      hBarPrime = (h1Prime + h2Prime - 360) / 2;
    }

    // الخطوة 4: حساب T و SL و SC و SH
    const T = 1 -
      0.17 * Math.cos(MathUtils.toRadians(hBarPrime - 30)) +
      0.24 * Math.cos(MathUtils.toRadians(2 * hBarPrime)) +
      0.32 * Math.cos(MathUtils.toRadians(3 * hBarPrime + 6)) -
      0.20 * Math.cos(MathUtils.toRadians(4 * hBarPrime - 63));

    const SL = 1 + (0.015 * (LBarPrime - 50) ** 2) / 
      Math.sqrt(20 + (LBarPrime - 50) ** 2);
    const SC = 1 + 0.045 * CBarPrime;
    const SH = 1 + 0.015 * CBarPrime * T;

    // الخطوة 5: حساب RT
    const deltaTheta = 30 * Math.exp(-(((hBarPrime - 275) / 25) ** 2));
    const RC = 2 * Math.sqrt((CBarPrime ** 7) / ((CBarPrime ** 7) + (25 ** 7)));
    const RT = -RC * Math.sin(MathUtils.toRadians(2 * deltaTheta));

    // النتيجة النهائية
    const term1 = (deltaLPrime / (this.kL * SL)) ** 2;
    const term2 = (deltaCPrime / (this.kC * SC)) ** 2;
    const term3 = (deltaHPrime / (this.kH * SH)) ** 2;
    const term4 = RT * (deltaCPrime / (this.kC * SC)) * (deltaHPrime / (this.kH * SH));

    return Math.sqrt(term1 + term2 + term3 + term4);
  }
}

/**
 * مصنع حاسبات DeltaE
 */
class DeltaEFactory {
  static create(method: DeltaEMethod): IDeltaECalculator {
    switch (method) {
      case DeltaEMethod.CIE76:
        return new DeltaE76Calculator();
      case DeltaEMethod.CIE94:
        return new DeltaE94Calculator();
      case DeltaEMethod.CIEDE2000:
        return new DeltaE2000Calculator();
      default:
        throw new Error(`Unknown DeltaE method: ${method}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Palette Distance Calculator - حاسب المسافة بين الباليتات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * حاسب المسافة بين الباليتات
 * يدعم عدة طرق لحساب المسافة
 */
class PaletteDistanceCalculator {
  constructor(
    private readonly deltaE: IDeltaECalculator,
    private readonly converter: ColorSpaceConverter,
    private readonly method: PaletteDistanceMethod = PaletteDistanceMethod.AVERAGE_MIN
  ) {}

  private paletteToLabs(palette: ColorPalette): LABColor[] {
    return palette.colors.map(c => this.converter.rgbToLab(c));
  }

  private minDistanceToSet(lab: LABColor, labSet: LABColor[]): number {
    if (labSet.length === 0) return Infinity;
    return Math.min(...labSet.map(other => this.deltaE.calculate(lab, other)));
  }

  /**
   * مسافة Hausdorff - أكثر صرامة
   * تُرجع أقصى مسافة دنيا
   */
  calculateHausdorff(palette1: ColorPalette, palette2: ColorPalette): number {
    const labs1 = this.paletteToLabs(palette1);
    const labs2 = this.paletteToLabs(palette2);

    let maxMinDist = 0;
    for (const lab of labs1) {
      const minDist = this.minDistanceToSet(lab, labs2);
      maxMinDist = Math.max(maxMinDist, minDist);
    }
    return maxMinDist;
  }

  /**
   * مسافة Hausdorff ثنائية الاتجاه
   */
  calculateBidirectionalHausdorff(palette1: ColorPalette, palette2: ColorPalette): number {
    const h12 = this.calculateHausdorff(palette1, palette2);
    const h21 = this.calculateHausdorff(palette2, palette1);
    return Math.max(h12, h21);
  }

  /**
   * متوسط المسافات الدنيا - متوازن
   */
  calculateAverageMin(palette1: ColorPalette, palette2: ColorPalette): number {
    const labs1 = this.paletteToLabs(palette1);
    const labs2 = this.paletteToLabs(palette2);

    let totalDist = 0;
    for (const lab of labs1) {
      totalDist += this.minDistanceToSet(lab, labs2);
    }
    return totalDist / labs1.length;
  }

  /**
   * متوسط موزون - يعطي أهمية أكبر للألوان الأولى
   */
  calculateWeightedAverage(palette1: ColorPalette, palette2: ColorPalette): number {
    const labs1 = this.paletteToLabs(palette1);
    const labs2 = this.paletteToLabs(palette2);

    const weights = labs1.map((_, i) => 1.0 / (i + 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let weightedDist = 0;
    labs1.forEach((lab, i) => {
      const minDist = this.minDistanceToSet(lab, labs2);
      weightedDist += weights[i] * minDist;
    });

    return weightedDist / totalWeight;
  }

  /**
   * حساب المسافة بالطريقة المحددة
   */
  calculate(palette1: ColorPalette, palette2: ColorPalette): number {
    switch (this.method) {
      case PaletteDistanceMethod.HAUSDORFF:
        return this.calculateHausdorff(palette1, palette2);
      case PaletteDistanceMethod.BIDIRECTIONAL_HAUSDORFF:
        return this.calculateBidirectionalHausdorff(palette1, palette2);
      case PaletteDistanceMethod.AVERAGE_MIN:
        return this.calculateAverageMin(palette1, palette2);
      case PaletteDistanceMethod.WEIGHTED_AVERAGE:
        return this.calculateWeightedAverage(palette1, palette2);
      default:
        throw new Error(`Unknown distance method: ${this.method}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Harmonious Palette Generator - مولد الباليتات المتناسقة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * مولد باليتات متناسقة باستخدام نظرية التناسق اللوني
 */
class HarmoniousPaletteGenerator {
  private rng: SeededRandom;

  constructor(seed: number | null = null) {
    this.rng = new SeededRandom(seed);
  }

  /**
   * تغيير طفيف في التشبع والقيمة
   */
  private varySaturationValue(
    baseS: number,
    baseV: number,
    variation: number = 0.2
  ): [number, number] {
    const s = MathUtils.clamp(
      baseS + this.rng.uniform(-variation, variation),
      0.1,
      1.0
    );
    const v = MathUtils.clamp(
      baseV + this.rng.uniform(-variation, variation),
      0.2,
      1.0
    );
    return [s, v];
  }

  /**
   * توليد باليت تكميلي (Complementary)
   * لونان متقابلان على عجلة الألوان
   */
  generateComplementary(
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8
  ): ColorPalette {
    const colors: RGBColor[] = [];
    const complementHue = (baseHue + 180) % 360;

    const baseCount = Math.ceil(size / 2);
    for (let i = 0; i < baseCount; i++) {
      const [s, v] = this.varySaturationValue(saturation, value);
      const h = baseHue + this.rng.uniform(-15, 15);
      colors.push(RGBColor.fromHsv(h, s, v));
    }

    while (colors.length < size) {
      const [s, v] = this.varySaturationValue(saturation, value);
      const h = complementHue + this.rng.uniform(-15, 15);
      colors.push(RGBColor.fromHsv(h, s, v));
    }

    return new ColorPalette(colors, '', PaletteHarmonyType.COMPLEMENTARY);
  }

  /**
   * توليد باليت متجاور (Analogous)
   * ألوان متجاورة على عجلة الألوان
   */
  generateAnalogous(
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8,
    angleSpread: number = 30
  ): ColorPalette {
    const colors: RGBColor[] = [];
    const step = angleSpread / (size - 1);

    for (let i = 0; i < size; i++) {
      const h = (baseHue - angleSpread / 2 + i * step + 360) % 360;
      const [s, v] = this.varySaturationValue(saturation, value);
      colors.push(RGBColor.fromHsv(h + this.rng.uniform(-5, 5), s, v));
    }

    return new ColorPalette(colors, '', PaletteHarmonyType.ANALOGOUS);
  }

  /**
   * توليد باليت ثلاثي (Triadic)
   * ثلاثة ألوان متساوية البعد
   */
  generateTriadic(
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8
  ): ColorPalette {
    const colors: RGBColor[] = [];
    const hues = [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];

    const colorsPerHue = Math.floor(size / 3);
    const remainder = size % 3;

    hues.forEach((h, i) => {
      const count = colorsPerHue + (i < remainder ? 1 : 0);
      for (let j = 0; j < count; j++) {
        const [s, v] = this.varySaturationValue(saturation, value);
        const hVaried = h + this.rng.uniform(-10, 10);
        colors.push(RGBColor.fromHsv((hVaried + 360) % 360, s, v));
      }
    });

    return new ColorPalette(colors.slice(0, size), '', PaletteHarmonyType.TRIADIC);
  }

  /**
   * توليد باليت تكميلي منقسم (Split-Complementary)
   */
  generateSplitComplementary(
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8,
    splitAngle: number = 30
  ): ColorPalette {
    const colors: RGBColor[] = [];
    const complement = (baseHue + 180) % 360;
    const split1 = (complement - splitAngle + 360) % 360;
    const split2 = (complement + splitAngle) % 360;

    const hues = [baseHue, split1, split2];

    for (let i = 0; i < size; i++) {
      const h = hues[i % 3] + this.rng.uniform(-10, 10);
      const [s, v] = this.varySaturationValue(saturation, value);
      colors.push(RGBColor.fromHsv((h + 360) % 360, s, v));
    }

    return new ColorPalette(colors, '', PaletteHarmonyType.SPLIT_COMPLEMENTARY);
  }

  /**
   * توليد باليت رباعي (Tetradic)
   * أربعة ألوان تشكل مستطيلاً
   */
  generateTetradic(
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8
  ): ColorPalette {
    const colors: RGBColor[] = [];
    const hues = [
      baseHue,
      (baseHue + 60) % 360,
      (baseHue + 180) % 360,
      (baseHue + 240) % 360
    ];

    for (let i = 0; i < size; i++) {
      const h = hues[i % 4] + this.rng.uniform(-10, 10);
      const [s, v] = this.varySaturationValue(saturation, value);
      colors.push(RGBColor.fromHsv((h + 360) % 360, s, v));
    }

    return new ColorPalette(colors, '', PaletteHarmonyType.TETRADIC);
  }

  /**
   * توليد باليت مربع (Square)
   * أربعة ألوان متساوية البعد
   */
  generateSquare(
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8
  ): ColorPalette {
    const colors: RGBColor[] = [];
    const hues = [
      baseHue,
      (baseHue + 90) % 360,
      (baseHue + 180) % 360,
      (baseHue + 270) % 360
    ];

    for (let i = 0; i < size; i++) {
      const h = hues[i % 4] + this.rng.uniform(-10, 10);
      const [s, v] = this.varySaturationValue(saturation, value);
      colors.push(RGBColor.fromHsv((h + 360) % 360, s, v));
    }

    return new ColorPalette(colors, '', PaletteHarmonyType.SQUARE);
  }

  /**
   * توليد باليت أحادي اللون (Monochromatic)
   * تدرجات من لون واحد
   */
  generateMonochromatic(
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8
  ): ColorPalette {
    const colors: RGBColor[] = [];

    for (let i = 0; i < size; i++) {
      const ratio = i / (size - 1);
      const s = MathUtils.clamp(
        saturation * (0.3 + 0.7 * ratio) + this.rng.uniform(-0.1, 0.1),
        0.1,
        1.0
      );
      const v = MathUtils.clamp(
        value * (0.4 + 0.6 * (1 - ratio)) + this.rng.uniform(-0.1, 0.1),
        0.2,
        1.0
      );
      const h = baseHue + this.rng.uniform(-5, 5);
      colors.push(RGBColor.fromHsv((h + 360) % 360, s, v));
    }

    return new ColorPalette(colors, '', PaletteHarmonyType.MONOCHROMATIC);
  }

  /**
   * توليد باليت عشوائي متناسق
   */
  generateRandomHarmonious(
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8
  ): ColorPalette {
    const baseHue = this.rng.uniform(0, 360);
    const harmonyTypes = [
      PaletteHarmonyType.COMPLEMENTARY,
      PaletteHarmonyType.ANALOGOUS,
      PaletteHarmonyType.TRIADIC,
      PaletteHarmonyType.SPLIT_COMPLEMENTARY,
      PaletteHarmonyType.TETRADIC,
      PaletteHarmonyType.SQUARE,
      PaletteHarmonyType.MONOCHROMATIC,
    ];
    const harmonyType = this.rng.choice(harmonyTypes);
    return this.generate(harmonyType, baseHue, size, saturation, value);
  }

  /**
   * توليد باليت بنوع محدد
   */
  generate(
    harmonyType: PaletteHarmonyType,
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8
  ): ColorPalette {
    switch (harmonyType) {
      case PaletteHarmonyType.COMPLEMENTARY:
        return this.generateComplementary(baseHue, size, saturation, value);
      case PaletteHarmonyType.ANALOGOUS:
        return this.generateAnalogous(baseHue, size, saturation, value);
      case PaletteHarmonyType.TRIADIC:
        return this.generateTriadic(baseHue, size, saturation, value);
      case PaletteHarmonyType.SPLIT_COMPLEMENTARY:
        return this.generateSplitComplementary(baseHue, size, saturation, value);
      case PaletteHarmonyType.TETRADIC:
        return this.generateTetradic(baseHue, size, saturation, value);
      case PaletteHarmonyType.SQUARE:
        return this.generateSquare(baseHue, size, saturation, value);
      case PaletteHarmonyType.MONOCHROMATIC:
        return this.generateMonochromatic(baseHue, size, saturation, value);
      case PaletteHarmonyType.RANDOM_HARMONIOUS:
        return this.generateRandomHarmonious(size, saturation, value);
      default:
        throw new Error(`Unknown harmony type: ${harmonyType}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Disliked Color Generator - مولد الألوان الفردية المتباعدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * مولد الألوان الفردية المكروهة
 * يستخدم شبكة ألوان منتظمة للبحث عن الألوان الأبعد
 */
class DislikedColorGenerator {
  private readonly converter: ColorSpaceConverter;
  private readonly deltaE: IDeltaECalculator;
  private readonly rng: SeededRandom;
  private readonly logger: Logger;

  constructor(
    private readonly config: IColorConfig,
    converter: ColorSpaceConverter,
    logger: Logger
  ) {
    this.converter = converter;
    this.deltaE = DeltaEFactory.create(config.deltaEMethod);
    this.rng = new SeededRandom(config.randomSeed);
    this.logger = logger;
  }

  /**
   * توليد مرشحين من شبكة الألوان
   */
  private generateColorCandidates(): RGBColor[] {
    const candidates: RGBColor[] = [];
    const step = Math.floor(256 / this.config.colorSpaceDivisions);

    // شبكة منتظمة
    for (let r = 0; r < 256; r += step) {
      for (let g = 0; g < 256; g += step) {
        for (let b = 0; b < 256; b += step) {
          candidates.push(new RGBColor(r, g, b, false));
        }
      }
    }

    // إضافة عينات عشوائية لزيادة التنوع
    const randomCount = Math.floor(candidates.length / 4);
    for (let i = 0; i < randomCount; i++) {
      candidates.push(new RGBColor(
        this.rng.randint(0, 255),
        this.rng.randint(0, 255),
        this.rng.randint(0, 255),
        false
      ));
    }

    this.logger.info(`Generated ${candidates.length} color candidates`);
    return candidates;
  }

  /**
   * حساب أقل DeltaE من مجموعة ألوان مفضلة
   */
  private calculateMinDeltaE(color: RGBColor, preferredLabs: LABColor[]): number {
    const colorLab = this.converter.rgbToLab(color);
    let minDelta = Infinity;

    for (const prefLab of preferredLabs) {
      const delta = this.deltaE.calculate(colorLab, prefLab);
      if (delta < minDelta) {
        minDelta = delta;
      }
    }
    return minDelta;
  }

  /**
   * توليد الألوان المكروهة
   */
  generate(preferredColors: RGBColor[]): ColorGenerationResult {
    if (preferredColors.length === 0) {
      throw new Error('At least one preferred color is required');
    }

    this.logger.info(`Starting generation for ${preferredColors.length} preferred colors`);

    // تحويل المفضلة إلى LAB
    const preferredLabs = preferredColors.map(c => this.converter.rgbToLab(c));

    // توليد المرشحين
    const candidates = this.generateColorCandidates();

    // حساب المسافات وفلترة
    const candidateScores: Array<{ color: RGBColor; deltaE: number }> = [];

    for (const candidate of candidates) {
      const minDelta = this.calculateMinDeltaE(candidate, preferredLabs);

      if (
        minDelta >= this.config.minDeltaEThreshold &&
        minDelta <= this.config.maxDeltaEThreshold
      ) {
        candidateScores.push({ color: candidate, deltaE: minDelta });
      }
    }

    // ترتيب تنازلي (الأبعد أولاً)
    candidateScores.sort((a, b) => b.deltaE - a.deltaE);

    // اختيار العدد المطلوب
    const requiredDisliked = preferredColors.length * this.config.dislikeRatio;
    const selectedDisliked: ColorSample[] = candidateScores
      .slice(0, requiredDisliked)
      .map(item => ({
        color: item.color,
        isPreferred: false,
        deltaEFromNearestPreferred: item.deltaE,
        source: 'generated' as const,
      }));

    // تجهيز النتائج
    const preferredSamples: ColorSample[] = preferredColors.map(c => ({
      color: c,
      isPreferred: true,
      deltaEFromNearestPreferred: null,
      source: 'user' as const,
    }));

    const deltaEValues = selectedDisliked
      .map(s => s.deltaEFromNearestPreferred)
      .filter((d): d is number => d !== null);

    const statistics: ColorGenerationStatistics = {
      preferredCount: preferredColors.length,
      dislikedCount: selectedDisliked.length,
      ratio: `1:${Math.floor(selectedDisliked.length / Math.max(1, preferredColors.length))}`,
      deltaEMethod: this.config.deltaEMethod,
      minDeltaE: deltaEValues.length ? Math.min(...deltaEValues) : 0,
      maxDeltaE: deltaEValues.length ? Math.max(...deltaEValues) : 0,
      avgDeltaE: deltaEValues.length
        ? deltaEValues.reduce((a, b) => a + b, 0) / deltaEValues.length
        : 0,
      candidatesGenerated: candidates.length,
      candidatesFiltered: candidateScores.length,
    };

    this.logger.info('Color generation complete', statistics);

    return {
      preferredColors: preferredSamples,
      dislikedColors: selectedDisliked,
      statistics,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Disliked Palette Generator - مولد الباليتات المتباعدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * مولد الباليتات المكروهة
 * يولد باليتات متناسقة لكنها بعيدة عن الباليتات المفضلة
 */
class DislikedPaletteGenerator {
  private readonly converter: ColorSpaceConverter;
  private readonly deltaE: IDeltaECalculator;
  private readonly distanceCalculator: PaletteDistanceCalculator;
  private readonly paletteGenerator: HarmoniousPaletteGenerator;
  private readonly rng: SeededRandom;
  private readonly logger: Logger;

  constructor(
    private readonly config: IPaletteConfig,
    converter: ColorSpaceConverter,
    logger: Logger
  ) {
    this.converter = converter;
    this.deltaE = DeltaEFactory.create(config.deltaEMethod);
    this.distanceCalculator = new PaletteDistanceCalculator(
      this.deltaE,
      this.converter,
      config.paletteDistanceMethod
    );
    this.paletteGenerator = new HarmoniousPaletteGenerator(config.randomSeed);
    this.rng = new SeededRandom(config.randomSeed);
    this.logger = logger;
  }

  /**
   * حساب أقل مسافة من مجموعة باليتات مفضلة
   */
  private calculateMinDistanceToPreferred(
    candidate: ColorPalette,
    preferredPalettes: ColorPalette[]
  ): number {
    if (preferredPalettes.length === 0) return Infinity;

    return Math.min(
      ...preferredPalettes.map(pref =>
        this.distanceCalculator.calculate(candidate, pref)
      )
    );
  }

  /**
   * توليد باليت مرشح
   */
  private generateCandidatePalette(
    preferredPalettes: ColorPalette[],
    paletteSize: number
  ): { palette: ColorPalette; distance: number } | null {
    // اختيار نوع تناسق عشوائي
    const harmonyType = this.rng.choice(this.config.allowedHarmonies);

    // حساب الـ Hue الأبعد عن المفضل
    const preferredHues = preferredPalettes.map(p => p.getDominantHue());

    let bestHue = this.rng.uniform(0, 360);
    if (preferredHues.length > 0) {
      // محاولة إيجاد Hue بعيد
      for (let i = 0; i < 10; i++) {
        const testHue = this.rng.uniform(0, 360);
        const getMinDist = (h: number): number =>
          Math.min(
            ...preferredHues.map(ph => {
              const diff = Math.abs(h - ph);
              return Math.min(diff, 360 - diff);
            })
          );

        if (getMinDist(testHue) > getMinDist(bestHue)) {
          bestHue = testHue;
        }
      }
    }

    // تغيير التشبع والقيمة عشوائياً
    const saturation = this.rng.uniform(0.4, 0.9);
    const value = this.rng.uniform(0.4, 0.9);

    const candidate = this.paletteGenerator.generate(
      harmonyType,
      bestHue,
      paletteSize,
      saturation,
      value
    );

    const distance = this.calculateMinDistanceToPreferred(candidate, preferredPalettes);

    if (
      distance >= this.config.minPaletteDistance &&
      distance <= this.config.maxPaletteDistance
    ) {
      return { palette: candidate, distance };
    }

    return null;
  }

  /**
   * توليد الباليتات المكروهة
   */
  generate(preferredPalettes: ColorPalette[]): PaletteGenerationResult {
    if (preferredPalettes.length === 0) {
      throw new Error('At least one preferred palette is required');
    }

    this.logger.info(`Starting generation for ${preferredPalettes.length} preferred palettes`);

    const requiredCount = preferredPalettes.length * this.config.dislikeRatio;
    const avgSize = Math.floor(
      preferredPalettes.reduce((sum, p) => sum + p.length, 0) / preferredPalettes.length
    );
    const paletteSize = MathUtils.clamp(
      avgSize,
      this.config.minColorsPerPalette,
      this.config.maxColorsPerPalette
    );

    const candidates: Array<{ palette: ColorPalette; distance: number }> = [];
    let attempts = 0;

    while (candidates.length < requiredCount && attempts < this.config.generationAttempts) {
      attempts++;
      const result = this.generateCandidatePalette(preferredPalettes, paletteSize);
      if (result) {
        candidates.push(result);
      }
    }

    // ترتيب تنازلي (الأبعد أولاً)
    candidates.sort((a, b) => b.distance - a.distance);

    const selected = candidates.slice(0, requiredCount);

    // تجهيز النتائج
    const preferredSamples: PaletteSample[] = preferredPalettes.map(p => ({
      palette: p,
      isPreferred: true,
      distanceFromNearestPreferred: null,
      source: 'user' as const,
      generationMethod: p.harmonyType,
    }));

    const dislikedSamples: PaletteSample[] = selected.map(item => ({
      palette: item.palette,
      isPreferred: false,
      distanceFromNearestPreferred: item.distance,
      source: 'generated' as const,
      generationMethod: item.palette.harmonyType,
    }));

    const distances = dislikedSamples
      .map(s => s.distanceFromNearestPreferred)
      .filter((d): d is number => d !== null);

    const harmonyDistribution: Record<string, number> = {};
    dislikedSamples.forEach(s => {
      if (s.generationMethod) {
        const key = s.generationMethod;
        harmonyDistribution[key] = (harmonyDistribution[key] ?? 0) + 1;
      }
    });

    const statistics: PaletteGenerationStatistics = {
      preferredCount: preferredPalettes.length,
      dislikedCount: dislikedSamples.length,
      ratio: `1:${Math.floor(dislikedSamples.length / Math.max(1, preferredPalettes.length))}`,
      deltaEMethod: this.config.deltaEMethod,
      paletteDistanceMethod: this.config.paletteDistanceMethod,
      minDistance: distances.length ? Math.min(...distances) : 0,
      maxDistance: distances.length ? Math.max(...distances) : 0,
      avgDistance: distances.length
        ? distances.reduce((a, b) => a + b, 0) / distances.length
        : 0,
      generationAttempts: attempts,
      paletteSize,
      harmonyDistribution,
    };

    this.logger.info('Palette generation complete', statistics);

    return {
      preferredPalettes: preferredSamples,
      dislikedPalettes: dislikedSamples,
      statistics,
    };
  }

  /**
   * توليد Anti-Palette مبسط (للاستخدام في الواجهة)
   * يُرجع أفضل باليت مكروه واحد
   */
  generateAntiPalette(baseHexColors: string[]): AntiPaletteResult | null {
    if (baseHexColors.length === 0) return null;

    const preferredColors = baseHexColors.map(h => RGBColor.fromHex(h));
    const preferredPalette = new ColorPalette(preferredColors);
    const preferredHue = preferredPalette.getDominantHue();

    let bestCandidate: ColorPalette | null = null;
    let maxDistance = -1;

    for (let i = 0; i < this.config.generationAttempts; i++) {
      const harmonyType = this.rng.choice(this.config.allowedHarmonies);
      const candidateHue = (preferredHue + 180 + this.rng.uniform(-30, 30) + 360) % 360;
      const saturation = this.rng.uniform(0.4, 0.9);
      const value = this.rng.uniform(0.4, 0.9);

      const candidate = this.paletteGenerator.generate(
        harmonyType,
        candidateHue,
        this.config.minColorsPerPalette,
        saturation,
        value
      );

      const distance = this.distanceCalculator.calculate(candidate, preferredPalette);

      if (distance > maxDistance) {
        maxDistance = distance;
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) return null;

    return {
      palette: bestCandidate,
      distance: maxDistance,
      method: bestCandidate.harmonyType ?? 'random',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Unified Color Math Service - الخدمة الموحدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * الخدمة الموحدة لجميع عمليات الألوان
 * تدمج نظامي الألوان الفردية والباليتات
 */
@Injectable({
  providedIn: 'root'
})
export class ColorMathService {
  private config: IUnifiedConfig;
  private readonly converter: ColorSpaceConverter;
  private readonly logger: Logger;
  private colorGenerator: DislikedColorGenerator | null = null;
  private paletteGenerator: DislikedPaletteGenerator | null = null;

  constructor() {
    this.config = { ...DEFAULT_UNIFIED_CONFIG };
    this.converter = new ColorSpaceConverter(
      this.config.enableCache,
      this.config.cacheSize
    );
    this.logger = new Logger('ColorMathService', this.config.enableLogging);
    this.initializeGenerators();
  }

  /**
   * تهيئة المولدات
   */
  private initializeGenerators(): void {
    this.colorGenerator = new DislikedColorGenerator(
      this.config.color,
      this.converter,
      this.logger
    );
    this.paletteGenerator = new DislikedPaletteGenerator(
      this.config.palette,
      this.converter,
      this.logger
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Configuration Methods - طرق الإعدادات
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تحديث إعدادات الألوان الفردية
   */
  updateColorConfig(updates: Partial<IColorConfig>): void {
    this.config = {
      ...this.config,
      color: { ...this.config.color, ...updates },
    };
    this.initializeGenerators();
  }

  /**
   * تحديث إعدادات الباليتات
   */
  updatePaletteConfig(updates: Partial<IPaletteConfig>): void {
    this.config = {
      ...this.config,
      palette: { ...this.config.palette, ...updates },
    };
    this.initializeGenerators();
  }

  /**
   * تحديث الإعدادات العامة
   */
  updateConfig(updates: Partial<IUnifiedConfig>): void {
    this.config = { ...this.config, ...updates };
    this.initializeGenerators();
  }

  /**
   * الحصول على الإعدادات الحالية
   */
  getConfig(): Readonly<IUnifiedConfig> {
    return this.config;
  }

  /**
   * إعادة الإعدادات للافتراضي
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_UNIFIED_CONFIG };
    this.initializeGenerators();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Color Generation Methods - طرق توليد الألوان
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * توليد ألوان مكروهة من ألوان مفضلة (Hex)
   */
  generateDislikedColors(preferredHexColors: string[]): ColorGenerationResult {
    if (!this.colorGenerator) {
      throw new Error('Color generator not initialized');
    }
    const preferredColors = preferredHexColors.map(h => RGBColor.fromHex(h));
    return this.colorGenerator.generate(preferredColors);
  }

  /**
   * توليد ألوان مكروهة من كائنات RGBColor
   */
  generateDislikedColorsFromRGB(preferredColors: RGBColor[]): ColorGenerationResult {
    if (!this.colorGenerator) {
      throw new Error('Color generator not initialized');
    }
    return this.colorGenerator.generate(preferredColors);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Palette Generation Methods - طرق توليد الباليتات
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * توليد باليتات مكروهة من باليتات مفضلة
   */
  generateDislikedPalettes(preferredPalettes: ColorPalette[]): PaletteGenerationResult {
    if (!this.paletteGenerator) {
      throw new Error('Palette generator not initialized');
    }
    return this.paletteGenerator.generate(preferredPalettes);
  }

  /**
   * توليد Anti-Palette مبسط (للاستخدام في الواجهة)
   * هذه هي الدالة الرئيسية المستخدمة في التطبيق
   */
  generateDislikedPalette(baseHexColors: string[]): AntiPaletteResult | null {
    if (!this.paletteGenerator) {
      throw new Error('Palette generator not initialized');
    }
    return this.paletteGenerator.generateAntiPalette(baseHexColors);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Utility Methods - طرق مساعدة
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تحويل RGB إلى LAB
   */
  rgbToLab(rgb: RGBColor): LABColor {
    return this.converter.rgbToLab(rgb);
  }

  /**
   * تحويل Hex إلى LAB
   */
  hexToLab(hex: string): LABColor {
    return this.converter.rgbToLab(RGBColor.fromHex(hex));
  }

  /**
   * تحويل LAB إلى RGB
   */
  labToRgb(lab: LABColor): RGBColor {
    return this.converter.labToRgb(lab);
  }

  /**
   * حساب DeltaE بين لونين
   */
  calculateDeltaE(
    color1: RGBColor | string,
    color2: RGBColor | string,
    method: DeltaEMethod = DeltaEMethod.CIEDE2000
  ): number {
    const rgb1 = typeof color1 === 'string' ? RGBColor.fromHex(color1) : color1;
    const rgb2 = typeof color2 === 'string' ? RGBColor.fromHex(color2) : color2;

    const lab1 = this.converter.rgbToLab(rgb1);
    const lab2 = this.converter.rgbToLab(rgb2);

    const calculator = DeltaEFactory.create(method);
    return calculator.calculate(lab1, lab2);
  }

  /**
   * حساب المسافة بين باليتين
   */
  calculatePaletteDistance(
    palette1: ColorPalette,
    palette2: ColorPalette,
    method: PaletteDistanceMethod = PaletteDistanceMethod.AVERAGE_MIN
  ): number {
    const deltaE = DeltaEFactory.create(this.config.palette.deltaEMethod);
    const calculator = new PaletteDistanceCalculator(deltaE, this.converter, method);
    return calculator.calculate(palette1, palette2);
  }

  /**
   * إنشاء باليت من قائمة Hex
   */
  createPalette(
    hexColors: string[],
    name: string = '',
    harmonyType: PaletteHarmonyType | null = null
  ): ColorPalette {
    const colors = hexColors.map(h => RGBColor.fromHex(h));
    return new ColorPalette(colors, name, harmonyType);
  }

  /**
   * توليد باليت متناسق
   */
  generateHarmoniousPalette(
    harmonyType: PaletteHarmonyType,
    baseHue: number,
    size: number = 5,
    saturation: number = 0.7,
    value: number = 0.8
  ): ColorPalette {
    const generator = new HarmoniousPaletteGenerator(this.config.palette.randomSeed);
    return generator.generate(harmonyType, baseHue, size, saturation, value);
  }

  /**
   * مسح التخزين المؤقت
   */
  clearCache(): void {
    this.converter.clearCache();
  }

  /**
   * الحصول على حجم التخزين المؤقت
   */
  getCacheSize(): number {
    return this.converter.getCacheSize();
  }
}
