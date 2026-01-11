/**
 * Unified Gemini API Client
 * Handles Gemini 2.0 Pro (text/vision) and Nano Banana Pro (image generation)
 */

import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Configuration
// ============================================================================

const MODELS = {
  /** Gemini 3 Pro for text and vision analysis */
  ANALYSIS: 'gemini-3-pro-preview',
  /** Nano Banana Pro for 4K image generation */
  IMAGE_GEN: 'gemini-3-pro-image-preview'
} as const;

export interface GeminiClientConfig {
  apiKey: string;
}

export interface ImageGenerationConfig {
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
}

export interface AnalysisResult {
  text: string;
  raw: GenerateContentResponse;
}

export interface ImageGenerationResult {
  imagePath: string;
  text?: string;
  raw: GenerateContentResponse;
}

// ============================================================================
// Gemini Client Class
// ============================================================================

export class GeminiClient {
  private ai: GoogleGenAI;

  constructor(config: GeminiClientConfig) {
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
  }

  /**
   * Analyze an image using Gemini 2.0 Pro Vision
   */
  async analyzeImage(
    imagePath: string,
    prompt: string
  ): Promise<AnalysisResult> {
    const imageData = await this.loadImageAsBase64(imagePath);
    const mimeType = this.getMimeType(imagePath);

    const response = await this.ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageData
              }
            },
            { text: prompt }
          ]
        }
      ]
    });

    const text = this.extractText(response);
    return { text, raw: response };
  }

  /**
   * Compare two images using Gemini 2.0 Pro Vision
   */
  async compareImages(
    image1Path: string,
    image2Path: string,
    prompt: string
  ): Promise<AnalysisResult> {
    const image1Data = await this.loadImageAsBase64(image1Path);
    const image2Data = await this.loadImageAsBase64(image2Path);
    const mime1 = this.getMimeType(image1Path);
    const mime2 = this.getMimeType(image2Path);

    const response = await this.ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mime1,
                data: image1Data
              }
            },
            {
              inlineData: {
                mimeType: mime2,
                data: image2Data
              }
            },
            { text: prompt }
          ]
        }
      ]
    });

    const text = this.extractText(response);
    return { text, raw: response };
  }

  /**
   * Generate text using Gemini 2.0 Pro
   */
  async generateText(prompt: string): Promise<AnalysisResult> {
    const response = await this.ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: prompt
    });

    const text = this.extractText(response);
    return { text, raw: response };
  }

  /**
   * Generate text with JSON mode for structured output
   */
  async generateJSON<T>(prompt: string): Promise<T> {
    const response = await this.ai.models.generateContent({
      model: MODELS.ANALYSIS,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = this.extractText(response);
    
    // Parse JSON from response
    try {
      return JSON.parse(text) as T;
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim()) as T;
      }
      throw new Error(`Failed to parse JSON response: ${text}`);
    }
  }

  /**
   * Generate an image using Nano Banana Pro
   */
  async generateImage(
    prompt: string,
    outputPath: string,
    config: ImageGenerationConfig = {}
  ): Promise<ImageGenerationResult> {
    const { aspectRatio = '1:1', imageSize = '4K' } = config;

    const response = await this.ai.models.generateContent({
      model: MODELS.IMAGE_GEN,
      contents: prompt,
      config: {
        responseModalities: ['image', 'text'],
        imageConfig: {
          aspectRatio,
          imageSize
        }
      }
    });

    let resultText: string | undefined;
    let imageSaved = false;

    // Process response parts
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ('text' in part && part.text) {
          resultText = part.text;
        } else if ('inlineData' in part && part.inlineData?.data) {
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          
          // Ensure output directory exists
          const outputDir = path.dirname(outputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          fs.writeFileSync(outputPath, imageBuffer);
          imageSaved = true;
        }
      }
    }

    if (!imageSaved) {
      throw new Error('No image was generated in the response');
    }

    return {
      imagePath: outputPath,
      text: resultText,
      raw: response
    };
  }

  /**
   * Generate an image with a reference image for style consistency
   */
  async generateImageWithReference(
    prompt: string,
    referenceImagePath: string,
    outputPath: string,
    config: ImageGenerationConfig = {}
  ): Promise<ImageGenerationResult> {
    const { aspectRatio = '1:1', imageSize = '4K' } = config;
    
    const referenceData = await this.loadImageAsBase64(referenceImagePath);
    const referenceMime = this.getMimeType(referenceImagePath);

    const response = await this.ai.models.generateContent({
      model: MODELS.IMAGE_GEN,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: referenceMime,
                data: referenceData
              }
            },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseModalities: ['image', 'text'],
        imageConfig: {
          aspectRatio,
          imageSize
        }
      }
    });

    let resultText: string | undefined;
    let imageSaved = false;

    // Process response parts
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ('text' in part && part.text) {
          resultText = part.text;
        } else if ('inlineData' in part && part.inlineData?.data) {
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          
          // Ensure output directory exists
          const outputDir = path.dirname(outputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          fs.writeFileSync(outputPath, imageBuffer);
          imageSaved = true;
        }
      }
    }

    if (!imageSaved) {
      throw new Error('No image was generated in the response');
    }

    return {
      imagePath: outputPath,
      text: resultText,
      raw: response
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async loadImageAsBase64(imagePath: string): Promise<string> {
    const absolutePath = path.resolve(imagePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Image file not found: ${absolutePath}`);
    }

    const imageBuffer = fs.readFileSync(absolutePath);
    return imageBuffer.toString('base64');
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/png';
  }

  private extractText(response: GenerateContentResponse): string {
    if (response.candidates?.[0]?.content?.parts) {
      const textParts = response.candidates[0].content.parts
        .filter((part): part is { text: string } => 'text' in part && !!part.text)
        .map(part => part.text);
      return textParts.join('\n');
    }
    return '';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let clientInstance: GeminiClient | null = null;

/**
 * Get or create a singleton Gemini client instance
 */
export function getGeminiClient(): GeminiClient {
  if (!clientInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    clientInstance = new GeminiClient({ apiKey });
  }
  return clientInstance;
}

/**
 * Create a new Gemini client instance with custom config
 */
export function createGeminiClient(config: GeminiClientConfig): GeminiClient {
  return new GeminiClient(config);
}
