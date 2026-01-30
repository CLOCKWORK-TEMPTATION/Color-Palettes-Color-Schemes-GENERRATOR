import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  // Schema for a single palette object
  private paletteObjSchema = {
    type: Type.OBJECT,
    properties: {
      paletteName: { type: Type.STRING, description: "A creative and evocative name." },
      description: { type: Type.STRING, description: "Description of the vibe." },
      colors: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            hex: { type: Type.STRING, description: "Hex code e.g. #FF0000" },
            rgb: { type: Type.STRING, description: "RGB string e.g. rgb(255, 0, 0)" },
            hsl: { type: Type.STRING, description: "HSL string e.g. hsl(0, 100%, 50%)" },
            name: { type: Type.STRING, description: "Creative, unique name for the color (e.g., 'Midnight Void', 'Sunset Glow') that reflects the palette's theme." },
            description: { type: Type.STRING, description: "Role/Theory explanation" }
          },
          required: ["hex", "rgb", "hsl", "name", "description"]
        }
      }
    },
    required: ["paletteName", "description", "colors"]
  };

  async generatePalette(prompt: string): Promise<any> {
    const systemInstruction = `You are a world-class color theorist. 
    Generate cohesive, accessible color palettes.
    If the user asks for specific colors, respect that.
    Output RGB and HSL values strictly in valid CSS string format.
    
    IMPORTANT: For each color, generate a unique, creative name that fits the palette's theme and the color's role (e.g., instead of "Dark Blue", use "Abyssal Depth" or "Corporate Navy").`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: this.paletteObjSchema,
          temperature: 1.1,
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("AI Generation Error:", error);
      throw error;
    }
  }

  async generateHarmony(baseColorHex: string): Promise<any> {
    const prompt = `Create a harmonious color palette based on the color ${baseColorHex}. 
    Suggest 4-5 additional colors that work well with it.
    Explain the color theory used (e.g., Complementary, Triadic, Analogous, Split-Complementary).
    The 'paletteName' should mention the harmony type.
    The 'description' should explain the theoretical relationship between the base color and suggestions.`;

    return this.generatePalette(prompt);
  }

  async generateAntiPalette(baseColors: string[]): Promise<any> {
    const prompt = `
      I have a set of "Preferred Colors": ${baseColors.join(', ')}.
      
      Act as a "Disliked Color Generator" system using the CIEDE2000 (DeltaE) algorithm logic.
      
      Task:
      1. Analyze the preferred colors in the CIELAB color space.
      2. Find 5 colors that are mathematically distant (High DeltaE), clashing, or create visual tension against the preferred colors.
      3. These should NOT be harmonious. They should be the "Anti-Palette".
      
      Output:
      - 'paletteName': Something like "Anti-Palette", "Visual Tension", or "High DeltaE Contrast".
      - 'description': Explain why these colors clash with the input based on color theory (e.g., "High vibration", "Unpleasant temperature mix").
      - 'colors': The generated clashing colors. Provide names that sound discordant or intense if appropriate.
    `;

    return this.generatePalette(prompt);
  }

  async generateVariations(baseHex: string): Promise<any[]> {
    const prompt = `
      Based on the hex color ${baseHex}, generate exactly 4 distinct color palettes in this specific order:
      
      1. Corporate & Professional: Trustworthy, calm, professional, suitable for business.
      2. Monochromatic Gradient: A smooth gradient ("Tiffany" style or similar) using tints and shades of ${baseHex}.
      3. Modern & High Contrast: Bold, vibrant, high accessibility contrast, trendy.
      4. Luxury & Elegant: Sophisticated, rich, deep, potentially with gold/silver accent tones alongside ${baseHex}.

      Ensure the base color ${baseHex} is included and prominent in each palette.
    `;

    const arraySchema = {
      type: Type.ARRAY,
      items: this.paletteObjSchema
    };

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert color designer. Generate 4 distinct palettes as requested. For every color, invent a creative name that embodies the specific style of the palette.",
          responseMimeType: "application/json",
          responseSchema: arraySchema,
          temperature: 1.0,
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("AI Variation Generation Error:", error);
      throw error;
    }
  }
}