import { App } from '@slack/bolt';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { log } from './logger';

/**
 * Media metadata interface for tool responses
 */
export interface MediaMetadata {
  type: 'image' | 'video' | 'audio';
  url?: string;      // Remote URL (Replicate, OpenAI)
  filePath?: string; // Local file path (ElevenLabs)
  title?: string;    // Optional title
}

/**
 * Extract media metadata from tool response
 */
export function extractMediaMetadata(response: string): MediaMetadata | null {
  // Check for image URLs
  const imageMatch = response.match(/(?:Image URL|URL|image):\s*(https?:\/\/[^\s\n]+\.(?:jpg|jpeg|png|gif|webp))/i);
  if (imageMatch) {
    return {
      type: 'image',
      url: imageMatch[1]
    };
  }

  // Check for video URLs
  const videoMatch = response.match(/(?:Video URL|URL|video):\s*(https?:\/\/[^\s\n]+\.(?:mp4|webm|mov))/i);
  if (videoMatch) {
    return {
      type: 'video',
      url: videoMatch[1]
    };
  }

  // Check for audio files
  const audioMatch = response.match(/File:\s*([^\s\n]+\.mp3)/i);
  if (audioMatch) {
    return {
      type: 'audio',
      filePath: audioMatch[1]
    };
  }

  // Check for Replicate output format
  const replicateMatch = response.match(/URL:\s*(https?:\/\/[^\s\n]+)/i);
  if (replicateMatch) {
    const url = replicateMatch[1];
    if (url.includes('.mp4') || url.includes('.webm')) {
      return { type: 'video', url };
    }
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) {
      return { type: 'image', url };
    }
  }

  return null;
}

/**
 * Clean response text by removing file paths and URLs
 */
export function cleanResponseText(response: string, media: MediaMetadata): string {
  let cleaned = response;

  // Remove URL lines
  if (media.url) {
    cleaned = cleaned.replace(/URL:\s*https?:\/\/[^\s\n]+/gi, '');
  }

  // Remove file path lines
  if (media.filePath) {
    cleaned = cleaned.replace(/File:\s*[^\s\n]+\.mp3/gi, '');
    cleaned = cleaned.replace(/Size:\s*[^\n]+/gi, '');
  }

  // Clean up extra newlines and trim
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Upload media to Slack
 */
export async function uploadMediaToSlack(
  app: App,
  channel: string,
  media: MediaMetadata,
  text?: string
): Promise<void> {
  try {
    log.info('[MediaHandler] Uploading media to Slack', {
      type: media.type,
      hasUrl: !!media.url,
      hasFilePath: !!media.filePath
    });

    let fileBuffer: Buffer;
    let filename: string;

    // Get file buffer
    if (media.filePath) {
      // Local file (ElevenLabs audio)
      fileBuffer = fs.readFileSync(media.filePath);
      filename = path.basename(media.filePath);
    } else if (media.url) {
      // Remote URL (Replicate, OpenAI)
      log.info('[MediaHandler] Downloading from URL', { url: media.url });
      const response = await axios.get(media.url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      fileBuffer = Buffer.from(response.data);

      // Generate filename from URL or use default
      const urlParts = media.url.split('/');
      filename = urlParts[urlParts.length - 1].split('?')[0] || `${media.type}.${getExtension(media.type)}`;
    } else {
      throw new Error('No file path or URL provided');
    }

    // Upload to Slack using filesUploadV2
    const result = await app.client.files.uploadV2({
      channel_id: channel,
      file: fileBuffer,
      filename: filename,
      title: media.title || `Generated ${media.type}`,
      initial_comment: text || undefined
    });

    log.info('[MediaHandler] Media uploaded successfully', {
      type: media.type,
      filename,
      size: `${(fileBuffer.length / 1024).toFixed(2)}KB`
    });
  } catch (error: any) {
    log.error('[MediaHandler] Failed to upload media', {
      error: error.message,
      type: media.type
    });
    throw error;
  }
}

/**
 * Get file extension for media type
 */
function getExtension(type: string): string {
  switch (type) {
    case 'image': return 'png';
    case 'video': return 'mp4';
    case 'audio': return 'mp3';
    default: return 'bin';
  }
}
