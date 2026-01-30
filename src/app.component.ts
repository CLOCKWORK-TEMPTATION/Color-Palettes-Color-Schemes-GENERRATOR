import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from './services/ai.service';
import { AuthService } from './services/auth.service';
import { ExportService } from './services/export.service';
import { ColorMathService, RGBColor } from './services/color-math.service';
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
  private aiService = inject(AiService);
  private mathService = inject(ColorMathService);
  authService = inject(AuthService); // Public for template
  private exportService = inject(ExportService);

  // UI State
  prompt = signal('');
  isLoading = signal(false);
  
  // Single palette view
  currentPalette = signal<Palette | null>(null);
  
  // Variations view (when Hex is entered)
  variations = signal<Palette[]>([]);

  history = signal<HistoryItem[]>([]);
  error = signal<string | null>(null);
  toastMessage = signal<string | null>(null);
  showAuthModal = signal(false);
  
  // View mode: 'generator' or 'profile'
  viewMode = signal<'generator' | 'profile'>('generator');

  // Derived state
  hasPalette = computed(() => !!this.currentPalette());
  isCurrentSaved = computed(() => {
    const p = this.currentPalette();
    return p ? this.authService.isSaved(p.id) : false;
  });

  constructor() {
    // Load history
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

  // --- Core Logic ---

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
        // We don't auto-add to history here, maybe only when they select one? 
        // Or we can add the input to history but that's complex with multiple results.
        
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
    // Add to history when selected
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

  // Uses the local mathematical service to generate the anti-palette
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

        // Convert Math RGB colors to App Colors
        const generatedColors = result.palette.colors.map((rgb: RGBColor, index: number) => {
           const hex = rgb.toHex();
           const { textColor, luminance } = this.getContrastColor(hex);
           return {
             hex: hex,
             rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
             hsl: '', // Optional
             name: `DeltaE Match #${index + 1}`, // Temporary name
             description: `Mathematically distant color (DeltaE metric)`,
             textColor,
             luminance
           };
        });

        // Use AI only to "Enhance" the names if needed, or just display raw math results.
        // For speed and robustness of the "merge", we display the math results directly.
        const newPalette: Palette = {
          id: crypto.randomUUID(),
          paletteName: `Anti-Palette (Math Generated)`,
          description: `Generated using CIEDE2000 algorithm. Avg Distance: ${result.distance.toFixed(2)}. Method: ${result.method}.`,
          colors: generatedColors,
          createdAt: Date.now()
        };

        this.currentPalette.set(newPalette);
        this.addToHistory(`Anti-Palette: ${current.paletteName}`, newPalette);
      } catch (err) {
        this.error.set('Failed to generate anti-palette.');
        console.error(err);
      } finally {
        this.isLoading.set(false);
      }
    }, 100);
  }

  // --- Sharing & URL ---

  checkSharedUrl() {
    if (typeof window === 'undefined') return;
    
    // Check for #share=BASE64_JSON
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      try {
        const encoded = hash.replace('#share=', '');
        const jsonStr = atob(encoded);
        const palette = JSON.parse(jsonStr);
        
        // Recalculate text contrast to be safe
        palette.colors = palette.colors.map((c: any) => {
          const { textColor, luminance } = this.getContrastColor(c.hex);
          return { ...c, textColor, luminance };
        });

        this.currentPalette.set(palette);
        this.prompt.set(`Shared: ${palette.paletteName}`);
        this.showToast('Shared palette loaded!');
        
        // Clear hash to clean up URL
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

  // --- Export ---

  export(format: 'css' | 'json' | 'png') {
    const p = this.currentPalette();
    if (!p) return;

    if (format === 'css') this.exportService.exportCss(p);
    if (format === 'json') this.exportService.exportJson(p);
    if (format === 'png') this.exportService.exportPng(p);
  }

  // --- Auth & Persistence ---

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
    }
  }

  // --- Utilities ---

  addToHistory(prompt: string, palette: Palette) {
    this.history.update(prev => {
      // Avoid duplicates if possible
      const newItem = { prompt, palette };
      const newHistory = [newItem, ...prev].slice(0, 10);
      localStorage.setItem('chromagen_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }

  loadFromHistory(item: HistoryItem) {
    this.currentPalette.set(item.palette);
    this.prompt.set(item.prompt);
    this.variations.set([]); // clear variations view
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
}