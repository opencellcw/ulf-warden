/**
 * Replicate Message Enhancer
 * 
 * Detects when a message contains a Replicate-generated image
 * and adds interactive UI buttons
 */

import { ActionRowBuilder, ButtonBuilder } from 'discord.js';
import {
  createImageActionButtons,
  saveGenerationSession,
  generateSessionId
} from '../tools/replicate-ui';
import { log } from '../logger';

interface ReplicateImageInfo {
  url: string;
  model: string;
  cost: number;
  prompt?: string;
}

/**
 * Extract Replicate image info from bot response
 */
export function extractReplicateImageInfo(message: string): ReplicateImageInfo | null {
  // Pattern: ✅ Image generated! | ModelName | $0.0200
  // Next line: URL
  const pattern = /✅ Image generated! \| (.+?) \| \$(\d+\.\d+)\n\n(https:\/\/replicate\.delivery\/[^\s]+)/;
  const match = message.match(pattern);

  if (!match) {
    return null;
  }

  return {
    model: match[1],
    cost: parseFloat(match[2]),
    url: match[3]
  };
}

/**
 * Add Replicate UI buttons to message if it contains a generated image
 */
export async function enhanceReplicateMessage(
  message: string,
  userId: string,
  messageId: string
): Promise<{
  content: string;
  components?: ActionRowBuilder<ButtonBuilder>[];
}> {
  const imageInfo = extractReplicateImageInfo(message);

  if (!imageInfo) {
    // Not a Replicate image, return as-is
    return { content: message };
  }

  log.info('[ReplicateEnhancer] Adding UI buttons to generated image', {
    model: imageInfo.model,
    userId
  });

  // Create session for this generation
  const sessionId = generateSessionId();
  
  try {
    await saveGenerationSession({
      id: sessionId,
      userId,
      prompt: '', // We don't have the prompt in the message, that's ok
      model: imageInfo.model,
      imageUrl: imageInfo.url,
      aspectRatio: '1:1', // Default, user can change
      createdAt: Date.now(),
      messageId
    });

    // Create UI buttons
    const buttons = createImageActionButtons(sessionId);

    // Add instruction to message
    const enhancedMessage = `${message}

🎨 **Content Creation Studio:**
Use buttons below to enhance, remix, or animate!`;

    return {
      content: enhancedMessage,
      components: buttons
    };

  } catch (error: any) {
    log.error('[ReplicateEnhancer] Failed to add buttons', {
      error: error.message
    });
    
    // Return original message if enhancement fails
    return { content: message };
  }
}
