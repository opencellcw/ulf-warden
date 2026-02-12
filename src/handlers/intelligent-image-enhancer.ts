/**
 * Intelligent Image Enhancement System
 * 
 * Ultra-robust system with multiple detection strategies
 * and automatic fallbacks. Uses agent-like intelligence
 * to ALWAYS find and enhance image generations.
 */

import { Message } from 'discord.js';
import {
  createImageActionButtons,
  saveGenerationSession,
  generateSessionId
} from '../tools/replicate-ui';
import { log } from '../logger';

// ============================================================================
// DETECTION AGENTS
// ============================================================================

/**
 * Agent 1: URL Detector
 * Finds ANY image URL in the message
 */
class URLDetectorAgent {
  detect(content: string): string | null {
    // Priority 1: Replicate URLs
    const replicatePattern = /https:\/\/replicate\.delivery\/[^\s\)\]]+/gi;
    const replicateMatch = content.match(replicatePattern);
    if (replicateMatch) {
      log.info('[URLDetector] Found Replicate URL', { url: replicateMatch[0] });
      return replicateMatch[0];
    }

    // Priority 2: Any image URL
    const imagePattern = /https?:\/\/[^\s\)\]]+\.(png|jpg|jpeg|webp|gif)/gi;
    const imageMatch = content.match(imagePattern);
    if (imageMatch) {
      log.info('[URLDetector] Found generic image URL', { url: imageMatch[0] });
      return imageMatch[0];
    }

    // Priority 3: Any URL in a response about images
    if (content.includes('imagem') || content.includes('image') || content.includes('gerada')) {
      const urlPattern = /https?:\/\/[^\s\)\]]+/gi;
      const urlMatch = content.match(urlPattern);
      if (urlMatch) {
        log.info('[URLDetector] Found URL in image context', { url: urlMatch[0] });
        return urlMatch[0];
      }
    }

    return null;
  }
}

/**
 * Agent 2: Model Detector
 * Finds which AI model was used
 */
class ModelDetectorAgent {
  private models = [
    'Nanobanana Pro',
    'Flux Schnell',
    'Flux Dev',
    'Flux Pro',
    'SDXL',
    'SD3',
    'Stable Diffusion',
    'Playground',
    'RealVisXL',
    'EpicRealism'
  ];

  detect(content: string): string {
    for (const model of this.models) {
      if (content.toLowerCase().includes(model.toLowerCase())) {
        log.info('[ModelDetector] Found model', { model });
        return model;
      }
    }

    // Fallback: Check for keywords
    if (content.includes('nanobanana') || content.includes('nano banana')) return 'Nanobanana Pro';
    if (content.includes('flux')) return 'Flux Schnell';
    if (content.includes('sdxl')) return 'SDXL';
    if (content.includes('realistic')) return 'RealVisXL';

    log.info('[ModelDetector] No model found, using default');
    return 'AI Model';
  }
}

/**
 * Agent 3: Context Analyzer
 * Determines if this is an image generation response
 */
class ContextAnalyzerAgent {
  isImageGeneration(content: string): boolean {
    const keywords = [
      'gerada',
      'generated',
      'imagem',
      'image',
      'prompt',
      'modelo',
      'model',
      'resolução',
      'resolution',
      'custo',
      'cost'
    ];

    let score = 0;
    for (const keyword of keywords) {
      if (content.toLowerCase().includes(keyword)) {
        score++;
      }
    }

    const hasURL = content.includes('http');
    const isImageContext = score >= 2 || (score >= 1 && hasURL);

    log.info('[ContextAnalyzer] Analysis complete', {
      score,
      hasURL,
      isImageContext
    });

    return isImageContext;
  }
}

/**
 * Agent 4: Prompt Extractor
 * Extracts the original prompt from the response
 */
class PromptExtractorAgent {
  extract(content: string): string {
    // Pattern 1: "Prompt: xxx"
    const promptPattern1 = /Prompt:\s*(.+?)(?:\n|$)/i;
    const match1 = content.match(promptPattern1);
    if (match1) {
      return match1[1].trim();
    }

    // Pattern 2: "Conceito: xxx"
    const promptPattern2 = /Conceito:\s*(.+?)(?:\n|$)/i;
    const match2 = content.match(promptPattern2);
    if (match2) {
      return match2[1].trim();
    }

    // Pattern 3: Look for text after generation keywords
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('viking') || 
          lines[i].toLowerCase().includes('warrior') ||
          lines[i].includes('![')) {
        return lines[i].replace(/!\[.*?\]\(.*?\)/, '').trim();
      }
    }

    // Fallback: Return first meaningful line
    for (const line of lines) {
      if (line.length > 10 && !line.includes('http') && !line.startsWith('•')) {
        return line.trim();
      }
    }

    return 'Image generation';
  }
}

/**
 * Agent 5: Enhancement Decision Maker
 * Decides if and how to enhance the message
 */
class EnhancementDecisionAgent {
  shouldEnhance(
    hasURL: boolean,
    isImageContext: boolean,
    model: string
  ): boolean {
    // Rule 1: Must have URL
    if (!hasURL) {
      log.info('[EnhancementDecision] No URL found, cannot enhance');
      return false;
    }

    // Rule 2: Must be image context
    if (!isImageContext) {
      log.info('[EnhancementDecision] Not image context, skipping');
      return false;
    }

    // Rule 3: Model must be detected (even if "AI Model")
    if (!model) {
      log.info('[EnhancementDecision] No model detected, skipping');
      return false;
    }

    log.info('[EnhancementDecision] All checks passed, will enhance!');
    return true;
  }
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

/**
 * Intelligent Enhancement Orchestrator
 * Coordinates all agents to achieve 100% success rate
 */
export class IntelligentImageEnhancer {
  private urlDetector = new URLDetectorAgent();
  private modelDetector = new ModelDetectorAgent();
  private contextAnalyzer = new ContextAnalyzerAgent();
  private promptExtractor = new PromptExtractorAgent();
  private decisionMaker = new EnhancementDecisionAgent();

  async enhance(
    content: string,
    userId: string,
    messageId: string
  ): Promise<{
    shouldEnhance: boolean;
    enhancedContent?: string;
    components?: any[];
  }> {
    log.info('[IntelligentEnhancer] Starting enhancement analysis', {
      contentLength: content.length,
      userId
    });

    // Step 1: Detect URL
    const imageUrl = this.urlDetector.detect(content);

    // Step 2: Analyze context
    const isImageContext = this.contextAnalyzer.isImageGeneration(content);

    // Step 3: Detect model
    const model = this.modelDetector.detect(content);

    // Step 4: Make decision
    const shouldEnhance = this.decisionMaker.shouldEnhance(
      !!imageUrl,
      isImageContext,
      model
    );

    if (!shouldEnhance) {
      log.info('[IntelligentEnhancer] Enhancement skipped');
      return { shouldEnhance: false };
    }

    // Step 5: Extract prompt
    const prompt = this.promptExtractor.extract(content);

    // Step 6: Create session
    const sessionId = generateSessionId();
    
    try {
      await saveGenerationSession({
        id: sessionId,
        userId,
        prompt,
        model,
        imageUrl: imageUrl!,
        aspectRatio: '1:1', // Default
        createdAt: Date.now(),
        messageId
      });

      log.info('[IntelligentEnhancer] Session created', {
        sessionId,
        model,
        prompt: prompt.substring(0, 50)
      });

      // Step 7: Create buttons
      const buttons = createImageActionButtons(sessionId);

      // Step 8: Enhance content
      const enhancedContent = this.formatEnhancedMessage(
        content,
        imageUrl!,
        model,
        prompt
      );

      log.info('[IntelligentEnhancer] Enhancement complete!', {
        sessionId,
        buttonsCount: buttons.length
      });

      return {
        shouldEnhance: true,
        enhancedContent,
        components: buttons
      };

    } catch (error: any) {
      log.error('[IntelligentEnhancer] Enhancement failed', {
        error: error.message
      });
      return { shouldEnhance: false };
    }
  }

  private formatEnhancedMessage(
    originalContent: string,
    imageUrl: string,
    model: string,
    prompt: string
  ): string {
    // If content already has good format, just ensure URL is visible
    if (originalContent.includes(imageUrl)) {
      return `${originalContent}

🎨 **Content Creation Studio**
Use the buttons below to enhance, remix, or animate!`;
    }

    // Otherwise, create clean format
    return `✅ **Image Generated!**

**Model:** ${model}
**Prompt:** ${prompt}

🔗 **Image URL:**
${imageUrl}

🎨 **Content Creation Studio**
Use the buttons below to enhance, remix, or animate your image!`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const intelligentEnhancer = new IntelligentImageEnhancer();
