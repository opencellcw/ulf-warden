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
  log.info('[MediaHandler] Extracting metadata from response', {
    responseLength: response.length,
    preview: response.substring(0, 200)
  });

  // Check for audio files (ElevenLabs format: "File: /path/to/file.mp3")
  const audioMatch = response.match(/File:\s*([^\s\n]+\.mp3)/i);
  if (audioMatch) {
    log.info('[MediaHandler] Detected audio file', { path: audioMatch[1] });
    return {
      type: 'audio',
      filePath: audioMatch[1]
    };
  }

  // Check for URL format (flexible patterns)
  // Patterns: "URL: https://...", "tá em: https://", or any replicate/openai URL
  const urlPatterns = [
    /URL:\s*(https?:\/\/[^\s\n]+)/i,                           // "URL: https://..."
    /(?:tá em|está em|imagem):\s*(https?:\/\/[^\s\n]+)/i,      // Portuguese: "tá em: https://..."
    /(https?:\/\/replicate\.delivery\/[^\s\n]+)/i,             // Direct replicate.delivery URL
    /(https?:\/\/oaidalleapiprodscus[^\s\n]+)/i,               // Direct OpenAI DALL-E URL
    /(?:video|áudio|audio):\s*(https?:\/\/[^\s\n]+)/i          // "video: https://..." or "áudio: https://..."
  ];

  for (const pattern of urlPatterns) {
    const urlMatch = response.match(pattern);
    if (urlMatch) {
      const url = urlMatch[1] || urlMatch[0];
      log.info('[MediaHandler] Detected URL', { url: url.substring(0, 100), pattern: pattern.source });

      // Determine type by extension or domain
      if (url.match(/\.(mp4|webm|mov|avi)(\?|$)/i) || url.includes('video')) {
        log.info('[MediaHandler] Identified as video');
        return { type: 'video', url };
      }

      if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i) || url.includes('image') || url.includes('replicate.delivery')) {
        log.info('[MediaHandler] Identified as image');
        return { type: 'image', url };
      }

      if (url.match(/\.(mp3|wav|m4a|ogg)(\?|$)/i) || url.includes('audio')) {
        log.info('[MediaHandler] Identified as audio');
        return { type: 'audio', url };
      }

      // Default to image if from known image services
      if (url.includes('replicate.delivery') || url.includes('oaidalleapiprodscus')) {
        log.info('[MediaHandler] Defaulting to image (known service)');
        return { type: 'image', url };
      }

      break; // Found a URL, stop searching
    }
  }

  log.info('[MediaHandler] No media detected in response');
  return null;
}

/**
 * Clean response text by removing file paths and URLs
 */
export function cleanResponseText(response: string, media: MediaMetadata): string {
  let cleaned = response;

  // Remove URL lines (multiple patterns)
  if (media.url) {
    // Match various URL introduction patterns
    cleaned = cleaned.replace(/(?:URL|tá em|está em|imagem|video|áudio|audio):\s*https?:\/\/[^\s\n]+/gi, '');
    // Remove standalone URLs (replicate.delivery, openai, etc)
    cleaned = cleaned.replace(/https?:\/\/(?:replicate\.delivery|oaidalleapiprodscus)[^\s\n]+/gi, '');
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
      hasFilePath: !!media.filePath,
      channel
    });

    let fileBuffer: Buffer;
    let filename: string;
    let filetype: string;

    // Get file buffer
    if (media.filePath) {
      // Local file (ElevenLabs audio)
      log.info('[MediaHandler] Reading local file', { path: media.filePath });
      fileBuffer = fs.readFileSync(media.filePath);
      filename = path.basename(media.filePath);
      filetype = getFileType(media.filePath);
    } else if (media.url) {
      // Remote URL (Replicate, OpenAI)
      log.info('[MediaHandler] Downloading from URL', { url: media.url.substring(0, 100) });

      const response = await axios.get(media.url, {
        responseType: 'arraybuffer',
        timeout: 60000, // Increased timeout for videos
        maxContentLength: 100 * 1024 * 1024, // 100MB max
        headers: {
          'User-Agent': 'Ulfberht-Warden/1.0'
        }
      });

      fileBuffer = Buffer.from(response.data);

      // Generate filename with proper extension
      const urlParts = media.url.split('/');
      const urlFilename = urlParts[urlParts.length - 1].split('?')[0];

      if (urlFilename && urlFilename.includes('.')) {
        filename = urlFilename;
      } else {
        filename = `${media.type}_${Date.now()}.${getExtension(media.type)}`;
      }

      filetype = getFileTypeFromExtension(filename);

      log.info('[MediaHandler] Downloaded file', {
        size: `${(fileBuffer.length / 1024).toFixed(2)}KB`,
        filename,
        filetype
      });
    } else {
      throw new Error('No file path or URL provided');
    }

    // Upload to Slack using filesUploadV2
    log.info('[MediaHandler] Uploading to Slack', { filename, filetype, channel });

    const result = await app.client.files.uploadV2({
      channel_id: channel,
      file: fileBuffer,
      filename: filename,
      filetype: filetype,
      title: media.title || `Generated ${media.type}`,
      initial_comment: text || '✨ Generated content'
    });

    log.info('[MediaHandler] Media uploaded successfully', {
      type: media.type,
      filename,
      filetype,
      size: `${(fileBuffer.length / 1024).toFixed(2)}KB`,
      ok: result.ok
    });
  } catch (error: any) {
    log.error('[MediaHandler] Failed to upload media', {
      error: error.message,
      stack: error.stack,
      type: media.type,
      channel
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

/**
 * Get Slack filetype from file path
 */
function getFileType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  return getFileTypeFromExtension(filepath);
}

/**
 * Get Slack filetype from extension
 */
function getFileTypeFromExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  // Image types
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) {
    return ext.substring(1); // Remove dot
  }

  // Video types
  if (['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes(ext)) {
    return 'mp4';
  }

  // Audio types
  if (['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(ext)) {
    return 'mp3';
  }

  return 'auto';
}
