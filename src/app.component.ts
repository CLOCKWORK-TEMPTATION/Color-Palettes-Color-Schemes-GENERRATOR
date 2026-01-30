import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from './services/ai.service';
import { AuthService } from './services/auth.service';
import { ExportService } from './services/export.service';
import { ColorMathService, RGBColor } from './services/color-math.service';
import { PreferenceLearningService } from './services/preference-learning.service';
import { Palette, Color, HistoryItem } from './types';
import { LoaderComponent } from './components/loader.component';
import { CopyIconComponent } from './components/copy-icon.component';
import { AuthModalComponent } from './components/auth-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, CopyIconComponent, AuthModalComponent],
  templateUrl: './app.component.html',
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent implements OnInit {
  // ═══════════════════════════════════════════════════════════════════════════
  // Dependency Injection
  // ═══════════════════════════════════════════════════════════════════════════
  
  private aiService = inject(AiService);
  private mathService = inject(ColorMathService);
  private exportService = inject(ExportService);
  
  // Public services for template access
  authService = inject(AuthService);
  preferenceLearning = inject(PreferenceLearningService);

  // ═══════════════════════════════════════════════════════════════════════════
  // UI State Signals
  // ═══════════════════════════════════════════════════════════════════════════
  
  prompt = signal('');
  isLoading = signal(false);
  isTraining = signal(false);
  
  // Palette state
  currentPalette = signal<Palette | null>(null);
  variations = signal<Palette[]>([]);
  history = signal<HistoryItem[]>([]);
  
  // UI state
  error = signal<string | null>(null);
  toastMessage = signal<string | null>(null);
  showAuthModal = signal(false);
  viewMode = signal<'generator' | 'profile'>('generator');

  // ═══════════════════════════════════════════════════════════════════════════
  // Computed Properties
  // ═══════════════════════════════════════════════════════════════════════════
  
  hasPalette = computed(() => !!this.currentPalette());
  
  isCurrentSaved = computed(() => {
    const p = this.currentPalette();
    return p ? this.authService.isSaved(p.id) : false;
  });

  // ML Learning State
  learningState = computed(() => this.preferenceLearning.modelState());
  learningConfidence = computed(() => this.preferenceLearning.confidence());
  isModelReady = computed(() => this.preferenceLearning.isReady());
  
  // Progress for UI (percentage)
  learningProgress = computed(() => {
    const samples = this.learningState().samplesCount;
    const minRequired = 20;
    return Math.min(100, (samples / minRequired) * 100);
  });

  // Can train?
  canTrain = computed(() => this.learningState().samplesCount >= 20);

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  constructor() {
    // Load history from localStorage
    const saved = localStorage.getItem('chromagen_history');
    if (saved) {
      try {
        this.history.set(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }

  ngOnInit() {
    this.checkSharedUrl();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Core Generation Logic
  // ═══════════════════════════════════════════════════════════════════════════

  async generate() {
    const input = this.prompt().trim();
    if (!input) return;
    
    // Reset states
    this.isLoading.set(true);
    this.error.set(null);
    this.viewMode.set('generator');
    this.currentPalette.set(null);
    this.variations.set([]);

    // Check if input is a Hex code
    const isHex = /^#?([0-9A-F]{3}){1,2}$/i.test(input);

    try {
      if (isHex) {
        // Handle Hex Variation Generation
        const hex = input.startsWith('#') ? input : `#${input}`;
        const dataArray = await this.aiService.generateVariations(hex);
        
        const newPalettes: Palette[] = dataArray.map((data: any) => ({
          id: crypto.randomUUID(),
          paletteName: data.paletteName,
          description: data.description,
          colors: data.colors.map((c: any) => {
            const { textColor, luminance } = this.getContrastColor(c.hex);
            return { ...c, textColor, luminance };
          }),
          createdAt: Date.now()
        }));

        this.variations.set(newPalettes);
        
      } else {
        // Handle Text Prompt Generation
        const data = await this.aiService.generatePalette(input);
        
        const newPalette: Palette = {
          id: crypto.randomUUID(),
          paletteName: data.paletteName,
          description: data.description,
          colors: data.colors.map((c: any) => {
            const { textColor, luminance } = this.getContrastColor(c.hex);
            return { ...c, textColor, luminance };
          }),
          createdAt: Date.now()
        };

        this.currentPalette.set(newPalette);
        this.addToHistory(input, newPalette);
      }

    } catch (err) {
      this.error.set('Failed to generate. Please try again.');
      console.error(err);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectVariation(palette: Palette) {
    this.currentPalette.set(palette);
    this.addToHistory(`Variation: ${palette.paletteName}`, palette);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToVariations() {
    this.currentPalette.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async generateHarmony(baseColor: string) {
    this.prompt.set(`Harmony based on ${baseColor}`);
    
    this.isLoading.set(true);
    this.error.set(null);
    this.viewMode.set('generator');
    this.variations.set([]);

    try {
      const data = await this.aiService.generateHarmony(baseColor);
      
      const newPalette: Palette = {
        id: crypto.randomUUID(),
        paletteName: data.paletteName,
        description: data.description,
        colors: data.colors.map((c: any) => {
          const { textColor, luminance } = this.getContrastColor(c.hex);
          return { ...c, textColor, luminance };
        }),
        createdAt: Date.now()
      };

      this.currentPalette.set(newPalette);
      this.addToHistory(this.prompt(), newPalette);
    } catch (err) {
      this.error.set('Failed to generate harmony.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Anti-Palette Generation (Enhanced with ML)
  // ═══════════════════════════════════════════════════════════════════════════

  async generateAntiPalette() {
    const current = this.currentPalette();
    if (!current) return;

    const baseColors = current.colors.map(c => c.hex);
    this.prompt.set(`Anti-Palette for: ${current.paletteName}`);

    this.isLoading.set(true);
    this.error.set(null);
    this.variations.set([]); 
    this.currentPalette.set(null);

    // Give UI a moment to show loader
    setTimeout(async () => {
      try {
        // Use mathematical generation locally
        const result = this.mathService.generateDislikedPalette(baseColors);

        if (!result) {
          throw new Error('Could not calculate anti-palette');
        }

        // Get candidate colors from math service
        let candidateHexColors = result.palette.colors.map((rgb: RGBColor) => rgb.toHex());

        // ═══════════════════════════════════════════════════════════════════
        // ML Enhancement: Sort by learned dislike probability
        // ═══════════════════════════════════════════════════════════════════
        let enhancementNote = '';
        if (this.isModelReady()) {
          // ترتيب الألوان حسب احتمال أن تكون مكروهة (الأقل تفضيلاً أولاً)
          candidateHexColors = this.preferenceLearning.enhanceAntiPaletteGeneration(candidateHexColors);
          enhancementNote = ` | AI Confidence: ${(this.learningConfidence() * 100).toFixed(0)}%`;
        }

        // Convert to App Colors
        const generatedColors = candidateHexColors.map((hex: string, index: number) => {
          const { textColor, luminance } = this.getContrastColor(hex);
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          
          return {
            hex: hex,
            rgb: `rgb(${r}, ${g}, ${b})`,
            hsl: '',
            name: `Anti-Color #${index + 1}`,
            description: this.isModelReady() 
              ? `Mathematically & perceptually distant (ML enhanced)`
              : `Mathematically distant color (DeltaE metric)`,
            textColor,
            luminance
          };
        });

        const newPalette: Palette = {
          id: crypto.randomUUID(),
          paletteName: this.isModelReady() ? `Anti-Palette (ML Enhanced)` : `Anti-Palette (Math Generated)`,
          description: `Generated using CIEDE2000 algorithm. Avg Distance: ${result.distance.toFixed(2)}. Method: ${result.method}${enhancementNote}`,
          colors: generatedColors,
          createdAt: Date.now()
        };

        this.currentPalette.set(newPalette);
        this.addToHistory(`Anti-Palette: ${current.paletteName}`, newPalette);

        // ═══════════════════════════════════════════════════════════════════
        // ML Learning: Record these colors as disliked
        // ═══════════════════════════════════════════════════════════════════
        this.preferenceLearning.addDislikedColors(candidateHexColors, 'antiPalette');

      } catch (err) {
        this.error.set('Failed to generate anti-palette.');
        console.error(err);
      } finally {
        this.isLoading.set(false);
      }
    }, 100);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sharing & URL
  // ═══════════════════════════════════════════════════════════════════════════

  checkSharedUrl() {
    if (typeof window === 'undefined') return;
    
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      try {
        const encoded = hash.replace('#share=', '');
        const jsonStr = atob(encoded);
        const palette = JSON.parse(jsonStr);
        
        palette.colors = palette.colors.map((c: any) => {
          const { textColor, luminance } = this.getContrastColor(c.hex);
          return { ...c, textColor, luminance };
        });

        this.currentPalette.set(palette);
        this.prompt.set(`Shared: ${palette.paletteName}`);
        this.showToast('Shared palette loaded!');
        
        history.replaceState(null, '', window.location.pathname);
      } catch (e) {
        this.error.set('Invalid shared link.');
        console.error('Share parse error', e);
      }
    }
  }

  sharePalette() {
    const p = this.currentPalette();
    if (!p) return;
    
    const jsonStr = JSON.stringify(p);
    const encoded = btoa(jsonStr);
    const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Share link copied to clipboard!');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Export
  // ═══════════════════════════════════════════════════════════════════════════

  export(format: 'css' | 'json' | 'png') {
    const p = this.currentPalette();
    if (!p) return;

    if (format === 'css') this.exportService.exportCss(p);
    if (format === 'json') this.exportService.exportJson(p);
    if (format === 'png') this.exportService.exportPng(p);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Auth & Persistence (with ML Learning Integration)
  // ═══════════════════════════════════════════════════════════════════════════

  handleAuthSubmit(username: string) {
    this.authService.login(username);
    this.showAuthModal.set(false);
    this.showToast(`Welcome, ${username}!`);
  }

  toggleSavePalette() {
    const p = this.currentPalette();
    if (!p) return;

    if (!this.authService.currentUser()) {
      this.showAuthModal.set(true);
      return;
    }

    if (this.isCurrentSaved()) {
      this.authService.removePalette(p.id);
      this.showToast('Palette removed from profile');
    } else {
      this.authService.savePalette(p);
      this.showToast('Palette saved to profile');
      
      // ═══════════════════════════════════════════════════════════════════
      // ML Learning: Record saved colors as preferred
      // ═══════════════════════════════════════════════════════════════════
      const hexColors = p.colors.map(c => c.hex);
      this.preferenceLearning.addPreferredColors(hexColors, 'saved');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ML Learning Controls
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تسجيل تفاعل المستخدم مع لون (نقرة = تفضيل ضمني)
   */
  trackColorInteraction(hex: string) {
    this.preferenceLearning.recordInteraction(hex, true);
  }

  /**
   * الحصول على تنبؤ ML للون
   */
  getColorPreference(hex: string): number {
    return this.preferenceLearning.predictPreference(hex);
  }

  /**
   * تصنيف اللون بناءً على ML
   */
  getColorClassification(hex: string): 'preferred' | 'neutral' | 'disliked' {
    return this.preferenceLearning.classifyColor(hex);
  }

  /**
   * تدريب النموذج يدوياً
   */
  async trainModel() {
    if (!this.canTrain()) {
      this.showToast(`Need at least 20 samples. Currently have ${this.learningState().samplesCount}.`);
      return;
    }

    this.isTraining.set(true);
    
    try {
      const history = await this.preferenceLearning.train(false);
      const lastEpoch = history[history.length - 1];
      
      if (lastEpoch) {
        this.showToast(`Model trained! Accuracy: ${(lastEpoch.valAccuracy * 100).toFixed(1)}%`);
      } else {
        this.showToast('Model trained successfully!');
      }
    } catch (error) {
      this.showToast(`Training failed: ${(error as Error).message}`);
      console.error('Training error:', error);
    } finally {
      this.isTraining.set(false);
    }
  }

  /**
   * إعادة ضبط بيانات التعلم
   */
  resetLearning() {
    if (confirm('This will reset all learned preferences. Are you sure?')) {
      this.preferenceLearning.reset();
      this.showToast('Learning data has been reset');
    }
  }

  /**
   * تصدير بيانات التعلم
   */
  exportLearningData() {
    const data = this.preferenceLearning.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chromagen-preferences.json';
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('Preferences exported!');
  }

  /**
   * استيراد بيانات التعلم
   */
  importLearningData(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        this.preferenceLearning.import(data);
        this.showToast('Preferences imported successfully!');
      } catch (error) {
        this.showToast('Failed to import preferences');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    input.value = '';
  }

  /**
   * إضافة تقييم صريح للون
   */
  rateColor(hex: string, isPreferred: boolean) {
    if (isPreferred) {
      this.preferenceLearning.addPreferredColor(hex, 'explicit');
      this.showToast(`Marked ${hex} as preferred`);
    } else {
      this.preferenceLearning.addDislikedColor(hex, 'explicit');
      this.showToast(`Marked ${hex} as disliked`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // History & Utilities
  // ═══════════════════════════════════════════════════════════════════════════

  addToHistory(prompt: string, palette: Palette) {
    this.history.update(prev => {
      const newItem = { prompt, palette };
      const newHistory = [newItem, ...prev].slice(0, 10);
      localStorage.setItem('chromagen_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }

  loadFromHistory(item: HistoryItem) {
    this.currentPalette.set(item.palette);
    this.prompt.set(item.prompt);
    this.variations.set([]);
    this.viewMode.set('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  loadSavedPalette(palette: Palette) {
    this.currentPalette.set(palette);
    this.variations.set([]);
    this.viewMode.set('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteHistoryItem(e: Event, index: number) {
    e.stopPropagation();
    this.history.update(prev => {
      const newHistory = prev.filter((_, i) => i !== index);
      localStorage.setItem('chromagen_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`Copied ${text}`);
    });
  }

  /**
   * نسخ اللون مع تسجيل التفاعل
   */
  copyColorWithTracking(hex: string) {
    this.trackColorInteraction(hex);
    this.copyToClipboard(hex);
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  getContrastColor(hex: string): { textColor: string; luminance: number } {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return {
      textColor: (yiq >= 128) ? '#1e293b' : '#f8fafc',
      luminance: yiq
    };
  }

  // Helper for template
  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }
}
