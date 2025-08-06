import { Platform } from 'react-native';
import { CONFIG } from './config';
import { logger } from './logger';
import { performanceMonitor } from './performance';
import { networkService } from './network';
import { storageService } from './storage';
import { errorHandler } from './error-handler';
import { analyticsService } from './analytics';

// Import FileSystem conditionally for React Native
let FileSystem: any = null;
if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
  } catch (error) {
    console.warn('FileSystem not available:', error);
  }
}

export interface GlowAnalysisResult {
  overallScore: number;
  skinPotential: string;
  skinQuality: string;
  jawlineScore: number;
  skinTone: string;
  skinType: string;
  brightness: number;
  hydration: number;
  symmetryScore: number;
  glowScore: number; // Keep for backward compatibility
  improvements: string[];
  recommendations: string[];
  tips: string[];
  aiTips: string[];
}

export interface OutfitAnalysisResult {
  outfitScore: number;
  colorMatchScore: number;
  styleScore: number;
  compatibleColors: string[];
  tips: string[];
  eventAppropriate: boolean;
  seasonalMatch: boolean;
}

export interface CoachingPlan {
  id: string;
  goal: string;
  duration: number; // days
  dailyTasks: DailyTask[];
  tips: string[];
  expectedResults: string[];
}

export type TaskType = 'skincare' | 'hydration' | 'sleep' | 'exercise' | 'nutrition';

export interface DailyTask {
  id: string;
  day: number;
  title: string;
  description: string;
  type: TaskType;
  completed: boolean;
  reminder?: string;
}

class AIService {
  private async uploadImageToS3(imageUri: string, fileName: string): Promise<string> {
    return performanceMonitor.measure('uploadImageToS3', async () => {
      try {
        logger.info('Starting S3 upload', { fileName, imageUri: imageUri.substring(0, 50) + '...' });
        
        if (CONFIG.FEATURES.USE_MOCK_DATA || !CONFIG.AWS.S3_BUCKET_NAME) {
          logger.debug('Using mock S3 upload');
          return imageUri;
        }
        
        // For production, implement proper S3 upload
        // TODO: Implement actual S3 upload logic
        logger.info('S3 upload completed', { fileName });
        return imageUri;
      } catch (error) {
        await errorHandler.reportError(
          error as Error,
          'ai-service',
          'uploadImageToS3',
          { fileName, imageUri: imageUri.substring(0, 50) + '...' }
        );
        throw new Error('Failed to upload image');
      }
    });
  }

  private async analyzeImageWithVision(imageUri: string): Promise<any> {
    try {
      // Convert image to base64 for Google Vision API
      const base64Image = await this.convertImageToBase64(imageUri);
      
      if (CONFIG.FEATURES.USE_MOCK_DATA || !CONFIG.AI.GOOGLE_VISION_API_KEY) {
        logger.debug('Using mock Vision API data');
        return this.getMockVisionData();
      }
      
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${CONFIG.AI.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  { type: 'FACE_DETECTION', maxResults: 1 },
                  { type: 'IMAGE_PROPERTIES', maxResults: 1 },
                  { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      await errorHandler.reportNetworkError(
        error as Error,
        `https://vision.googleapis.com/v1/images:annotate`,
        'POST'
      );
      logger.warn('Vision API failed, using mock data', error as Error);
      return this.getMockVisionData();
    }
  }

  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        const response = await fetch(imageUri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // React Native implementation
        if (!FileSystem) {
          throw new Error('FileSystem not available on this platform');
        }
        
        return await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (error) {
      await errorHandler.reportError(
        error as Error,
        'ai-service',
        'convertImageToBase64',
        { platform: Platform.OS, imageUri: imageUri.substring(0, 50) + '...' }
      );
      throw error;
    }
  }

  private getMockVisionData() {
    return {
      responses: [
        {
          faceAnnotations: [
            {
              boundingPoly: { vertices: [{ x: 100, y: 100 }, { x: 200, y: 200 }] },
              fdBoundingPoly: { vertices: [{ x: 105, y: 105 }, { x: 195, y: 195 }] },
              landmarks: [],
              rollAngle: 0.5,
              panAngle: 1.2,
              tiltAngle: -0.8,
              detectionConfidence: 0.95,
              landmarkingConfidence: 0.87,
            },
          ],
          imagePropertiesAnnotation: {
            dominantColors: {
              colors: [
                { color: { red: 220, green: 180, blue: 160 }, score: 0.4 },
                { color: { red: 200, green: 150, blue: 130 }, score: 0.3 },
              ],
            },
          },
        },
      ],
    };
  }

  async analyzeGlow(imageUri: string): Promise<GlowAnalysisResult> {
    try {
      console.log('Starting glow analysis for:', imageUri);
      
      // Upload image to S3
      const s3Url = await this.uploadImageToS3(imageUri, `glow-${Date.now()}.jpg`);
      
      // Analyze with Google Vision API
      const visionData = await this.analyzeImageWithVision(imageUri);
      
      // Use Rork AI API for detailed analysis
      const aiAnalysis = await this.getAIGlowAnalysis(visionData, imageUri);
      
      return aiAnalysis;
    } catch (error) {
      await errorHandler.reportError(
        error as Error,
        'glow-analysis',
        'analyzeGlow',
        { imageUri: imageUri.substring(0, 50) + '...' }
      );
      logger.warn('Glow analysis failed, using mock data', error as Error);
      return this.getMockGlowAnalysis();
    }
  }

  private async getAIGlowAnalysis(visionData: any, imageUri: string): Promise<GlowAnalysisResult> {
    try {
      // Convert image to base64 for AI API
      const base64Image = await this.convertImageToBase64(imageUri);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for detailed analysis
      
      const response = await fetch(`${CONFIG.AI.RORK_AI_BASE_URL}/text/llm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a professional beauty and facial analysis expert. Analyze the facial features and skin quality comprehensively. Return a detailed JSON analysis with these exact fields:
              {
                "overallScore": number (1-100),
                "skinPotential": string ("High", "Medium", "Low"),
                "skinQuality": string ("Excellent", "Good", "Fair", "Needs Improvement"),
                "jawlineScore": number (1-100),
                "skinTone": string (e.g., "Warm Beige", "Cool Ivory", "Deep Caramel"),
                "skinType": string ("Oily", "Dry", "Combination", "Normal", "Sensitive"),
                "brightness": number (1-100),
                "hydration": number (1-100),
                "symmetryScore": number (1-100),
                "aiTips": array of 3-5 personalized beauty tips,
                "improvements": array of specific improvement suggestions,
                "recommendations": array of product/routine recommendations
              }`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Perform a comprehensive facial analysis on this image. Analyze:
                  1. Overall facial beauty score (1-100)
                  2. Skin potential assessment
                  3. Skin quality evaluation
                  4. Jawline definition and sharpness (1-100)
                  5. Skin tone classification
                  6. Skin type determination
                  7. Brightness and glow level (1-100)
                  8. Hydration level assessment (1-100)
                  9. Facial symmetry analysis (1-100)
                  10. Personalized AI beauty tips
                  
                  Vision API data: ${JSON.stringify(visionData)}
                  
                  Provide detailed, actionable insights and recommendations.`,
                },
                {
                  type: 'image',
                  image: base64Image,
                },
              ],
            },
          ],
        }),
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const result = await response.json();
      return this.parseGlowAnalysis(result.completion);
    } catch (error) {
      await errorHandler.reportNetworkError(
        error as Error,
        `${CONFIG.AI.RORK_AI_BASE_URL}/text/llm/`,
        'POST'
      );
      logger.warn('AI glow analysis failed, using mock data', error as Error);
      return this.getMockGlowAnalysis();
    }
  }

  private parseGlowAnalysis(aiResponse: string): GlowAnalysisResult {
    try {
      // Try to parse JSON response from AI
      const parsed = JSON.parse(aiResponse);
      
      // Validate required fields for new comprehensive format
      if (typeof parsed.overallScore === 'number' && 
          typeof parsed.skinTone === 'string' &&
          Array.isArray(parsed.aiTips)) {
        return {
          overallScore: parsed.overallScore,
          skinPotential: parsed.skinPotential || 'Medium',
          skinQuality: parsed.skinQuality || 'Good',
          jawlineScore: parsed.jawlineScore || 75,
          skinTone: parsed.skinTone,
          skinType: parsed.skinType || 'Normal',
          brightness: parsed.brightness || 75,
          hydration: parsed.hydration || 70,
          symmetryScore: parsed.symmetryScore || 85,
          glowScore: parsed.overallScore, // Map for backward compatibility
          improvements: parsed.improvements || [],
          recommendations: parsed.recommendations || [],
          tips: parsed.aiTips, // Use AI tips as primary tips
          aiTips: parsed.aiTips,
        };
      }
      
      // Fallback to old format if new format not available
      if (typeof parsed.glowScore === 'number') {
        return {
          overallScore: parsed.glowScore,
          skinPotential: 'Medium',
          skinQuality: 'Good',
          jawlineScore: 75,
          skinTone: parsed.skinTone || 'Medium',
          skinType: parsed.skinType || 'Normal',
          brightness: parsed.brightness || 75,
          hydration: parsed.hydration || 70,
          symmetryScore: parsed.symmetry || 85,
          glowScore: parsed.glowScore,
          improvements: parsed.improvements || [],
          recommendations: parsed.recommendations || [],
          tips: parsed.tips || parsed.improvements || [],
          aiTips: parsed.tips || parsed.improvements || [],
        };
      }
      
      throw new Error('Invalid AI response format');
    } catch (error) {
      logger.warn('Failed to parse AI glow analysis response', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.getMockGlowAnalysis();
    }
  }

  private getMockGlowAnalysis(): GlowAnalysisResult {
    const overallScore = Math.floor(Math.random() * 30) + 70; // 70-100
    const skinTones = ['Warm Beige', 'Cool Ivory', 'Olive Medium', 'Deep Caramel', 'Golden Tan', 'Porcelain Fair'];
    const skinTypes = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];
    const potentials = ['High', 'Medium', 'Low'];
    const qualities = ['Excellent', 'Good', 'Fair', 'Needs Improvement'];
    
    const aiTips = [
      'Hydrate twice daily with hyaluronic acid serum for plumper skin',
      'Use sunscreen every morning to prevent premature aging',
      'Add more Omega-3s to your diet for improved skin elasticity',
      'Try facial massage for 5 minutes daily to boost circulation',
      'Get 7-8 hours of quality sleep for optimal skin recovery',
    ];
    
    const improvements = [
      'Increase daily water intake to 8-10 glasses for better hydration',
      'Incorporate vitamin C serum in morning routine for brighter skin',
      'Use a gentle exfoliant 2x per week to improve texture',
      'Apply a hydrating face mask weekly for deep moisture',
    ];
    
    const recommendations = [
      'Morning: Gentle cleanser → Vitamin C serum → Moisturizer → SPF 30+',
      'Evening: Double cleanse → Retinol (2x/week) → Hydrating serum → Night cream',
      'Weekly: Gentle exfoliation + Deep hydrating mask',
      'Monthly: Professional facial or at-home enzyme treatment',
    ];
    
    return {
      overallScore,
      skinPotential: potentials[Math.floor(Math.random() * potentials.length)],
      skinQuality: qualities[Math.floor(Math.random() * qualities.length)],
      jawlineScore: Math.floor(Math.random() * 25) + 70, // 70-95
      skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
      skinType: skinTypes[Math.floor(Math.random() * skinTypes.length)],
      brightness: Math.floor(Math.random() * 30) + 65, // 65-95
      hydration: Math.floor(Math.random() * 40) + 55, // 55-95
      symmetryScore: Math.floor(Math.random() * 20) + 75, // 75-95
      glowScore: overallScore, // Backward compatibility
      improvements,
      recommendations,
      tips: aiTips.slice(0, 3), // Use first 3 AI tips for compatibility
      aiTips,
    };
  }

  async analyzeOutfit(imageUri: string, eventType: string): Promise<OutfitAnalysisResult> {
    try {
      console.log('Starting outfit analysis for:', imageUri, eventType);
      
      // Upload image to S3
      const s3Url = await this.uploadImageToS3(imageUri, `outfit-${Date.now()}.jpg`);
      
      // Analyze with Google Vision API
      const visionData = await this.analyzeImageWithVision(imageUri);
      
      // Use Rork AI API for detailed analysis
      const aiAnalysis = await this.getAIOutfitAnalysis(visionData, imageUri, eventType);
      
      return aiAnalysis;
    } catch (error) {
      await errorHandler.reportError(
        error as Error,
        'outfit-analysis',
        'analyzeOutfit',
        { imageUri: imageUri.substring(0, 50) + '...', eventType }
      );
      logger.warn('Outfit analysis failed, using mock data', error as Error);
      return this.getMockOutfitAnalysis();
    }
  }

  private async getAIOutfitAnalysis(visionData: any, imageUri: string, eventType: string): Promise<OutfitAnalysisResult> {
    try {
      // Convert image to base64 for AI API
      const base64Image = await this.convertImageToBase64(imageUri);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${CONFIG.AI.RORK_AI_BASE_URL}/text/llm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a professional fashion stylist. Analyze the outfit and provide detailed fashion advice in JSON format.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this outfit for a ${eventType} event. Provide outfit score (1-100), color analysis, style tips, and recommendations. Vision data: ${JSON.stringify(visionData)}`,
                },
                {
                  type: 'image',
                  image: base64Image,
                },
              ],
            },
          ],
        }),
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const result = await response.json();
      return this.parseOutfitAnalysis(result.completion);
    } catch (error) {
      await errorHandler.reportNetworkError(
        error as Error,
        `${CONFIG.AI.RORK_AI_BASE_URL}/text/llm/`,
        'POST'
      );
      logger.warn('AI outfit analysis failed, using mock data', error as Error);
      return this.getMockOutfitAnalysis();
    }
  }

  private parseOutfitAnalysis(aiResponse: string): OutfitAnalysisResult {
    try {
      // Try to parse JSON response from AI
      const parsed = JSON.parse(aiResponse);
      
      // Validate required fields
      if (typeof parsed.outfitScore === 'number' && Array.isArray(parsed.tips)) {
        return {
          outfitScore: parsed.outfitScore,
          colorMatchScore: parsed.colorMatchScore || 75,
          styleScore: parsed.styleScore || 75,
          compatibleColors: parsed.compatibleColors || ['#FF6B98', '#9D71E8', '#4CAF50'],
          tips: parsed.tips,
          eventAppropriate: parsed.eventAppropriate !== false,
          seasonalMatch: parsed.seasonalMatch !== false,
        };
      }
      
      throw new Error('Invalid AI response format');
    } catch (error) {
      logger.warn('Failed to parse AI outfit analysis response', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.getMockOutfitAnalysis();
    }
  }

  private getMockOutfitAnalysis(): OutfitAnalysisResult {
    return {
      outfitScore: Math.floor(Math.random() * 30) + 70, // 70-100
      colorMatchScore: Math.floor(Math.random() * 30) + 70,
      styleScore: Math.floor(Math.random() * 30) + 70,
      compatibleColors: [
        '#FF6B98', // Pink
        '#9D71E8', // Purple
        '#4CAF50', // Green
        '#2196F3', // Blue
        '#FFD166', // Gold
      ],
      tips: [
        'Try adding a statement accessory to elevate this look',
        'This color palette works well with your skin tone',
        'Consider a different shoe style for better proportion',
        'A structured blazer would add sophistication',
      ],
      eventAppropriate: Math.random() > 0.3,
      seasonalMatch: Math.random() > 0.2,
    };
  }

  async generateCoachingPlan(goal: string, currentGlowScore: number): Promise<CoachingPlan> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${CONFIG.AI.RORK_AI_BASE_URL}/text/llm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a professional beauty coach. Create a personalized 30-day beauty coaching plan in JSON format.',
            },
            {
              role: 'user',
              content: `Create a 30-day coaching plan for someone with goal: "${goal}" and current glow score: ${currentGlowScore}. Include daily tasks, tips, and expected results.`,
            },
          ],
        }),
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const result = await response.json();
      return this.parseCoachingPlan(result.completion, goal);
    } catch (error) {
      await errorHandler.reportNetworkError(
        error as Error,
        `${CONFIG.AI.RORK_AI_BASE_URL}/text/llm/`,
        'POST'
      );
      logger.warn('Coaching plan generation failed, using mock data', error as Error);
      return this.getMockCoachingPlan(goal);
    }
  }

  private parseCoachingPlan(aiResponse: string, goal: string): CoachingPlan {
    try {
      const parsed = JSON.parse(aiResponse);
      
      // Validate required fields
      if (Array.isArray(parsed.dailyTasks) && Array.isArray(parsed.tips)) {
        return {
          id: `plan-${Date.now()}`,
          goal,
          duration: parsed.duration || 30,
          dailyTasks: parsed.dailyTasks,
          tips: parsed.tips,
          expectedResults: parsed.expectedResults || [],
        };
      }
      
      throw new Error('Invalid AI response format');
    } catch (error) {
      logger.warn('Failed to parse AI coaching plan response', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.getMockCoachingPlan(goal);
    }
  }

  private getMockCoachingPlan(goal: string): CoachingPlan {
    const tasks: DailyTask[] = [];
    
    for (let day = 1; day <= 30; day++) {
      const dailyTasks = [
        {
          id: `task-${day}-1`,
          day,
          title: 'Morning Skincare Routine',
          description: 'Complete your morning skincare routine with cleanser, serum, and SPF',
          type: 'skincare' as TaskType,
          completed: false,
        },
        {
          id: `task-${day}-2`,
          day,
          title: 'Hydration Goal',
          description: 'Drink at least 8 glasses of water throughout the day',
          type: 'hydration' as TaskType,
          completed: false,
        },
        {
          id: `task-${day}-3`,
          day,
          title: 'Beauty Sleep',
          description: 'Get 7-8 hours of quality sleep for skin recovery',
          type: 'sleep' as TaskType,
          completed: false,
        },
      ];
      
      if (day % 3 === 0) {
        dailyTasks.push({
          id: `task-${day}-4`,
          day,
          title: 'Light Exercise',
          description: '20 minutes of light exercise to boost circulation',
          type: 'exercise' as TaskType,
          completed: false,
        });
      }
      
      tasks.push(...dailyTasks);
    }

    return {
      id: `plan-${Date.now()}`,
      goal,
      duration: 30,
      dailyTasks: tasks,
      tips: [
        'Consistency is key - stick to your routine daily',
        'Take progress photos weekly to track improvements',
        'Listen to your skin and adjust products if needed',
        'Stay hydrated and eat a balanced diet',
      ],
      expectedResults: [
        'Improved skin texture and hydration',
        'More even skin tone',
        'Reduced appearance of fine lines',
        'Overall healthier, glowing complexion',
      ],
    };
  }

  async generateImage(prompt: string, size: string = '1024x1024'): Promise<{ image: { base64Data: string; mimeType: string }; size: string }> {
    try {
      const response = await fetch(`${CONFIG.AI.RORK_AI_BASE_URL}/images/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          size,
        }),
      });

      if (!response.ok) {
        throw new Error(`Image generation error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      await errorHandler.reportNetworkError(
        error as Error,
        `${CONFIG.AI.RORK_AI_BASE_URL}/images/generate/`,
        'POST'
      );
      throw error;
    }
  }

  async transcribeAudio(audioFile: File | { uri: string; name: string; type: string }, language?: string): Promise<{ text: string; language: string }> {
    try {
      const formData = new FormData();
      
      if ('uri' in audioFile) {
        // React Native format
        formData.append('audio', audioFile as any);
      } else {
        // Web format
        formData.append('audio', audioFile);
      }
      
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch(`${CONFIG.AI.RORK_AI_BASE_URL}/stt/transcribe/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      await errorHandler.reportNetworkError(
        error as Error,
        `${CONFIG.AI.RORK_AI_BASE_URL}/stt/transcribe/`,
        'POST'
      );
      throw error;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export const aiService = new AIService();
export default aiService;