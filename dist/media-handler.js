"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMediaMetadata = extractMediaMetadata;
exports.cleanResponseText = cleanResponseText;
exports.uploadMediaToSlack = uploadMediaToSlack;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
/**
 * Extract media metadata from tool response
 */
function extractMediaMetadata(response) {
    logger_1.log.info('[MediaHandler] Extracting metadata from response', {
        responseLength: response.length,
        preview: response.substring(0, 200)
    });
    // Check for audio files (ElevenLabs format: "File: /path/to/file.mp3")
    const audioMatch = response.match(/File:\s*([^\s\n]+\.mp3)/i);
    if (audioMatch) {
        logger_1.log.info('[MediaHandler] Detected audio file', { path: audioMatch[1] });
        return {
            type: 'audio',
            filePath: audioMatch[1]
        };
    }
    // Check for URL format (used by Replicate and OpenAI)
    // Format: "URL: https://..."
    const urlMatch = response.match(/URL:\s*(https?:\/\/[^\s\n]+)/i);
    if (urlMatch) {
        const url = urlMatch[1];
        logger_1.log.info('[MediaHandler] Detected URL', { url: url.substring(0, 100) });
        // Determine type by extension or domain
        if (url.match(/\.(mp4|webm|mov|avi)(\?|$)/i) || url.includes('video')) {
            logger_1.log.info('[MediaHandler] Identified as video');
            return { type: 'video', url };
        }
        if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i) || url.includes('image') || url.includes('replicate.delivery')) {
            logger_1.log.info('[MediaHandler] Identified as image');
            return { type: 'image', url };
        }
        if (url.match(/\.(mp3|wav|m4a|ogg)(\?|$)/i) || url.includes('audio')) {
            logger_1.log.info('[MediaHandler] Identified as audio');
            return { type: 'audio', url };
        }
        // Default to image if from known image services
        if (url.includes('replicate.delivery') || url.includes('oaidalleapiprodscus')) {
            logger_1.log.info('[MediaHandler] Defaulting to image (known service)');
            return { type: 'image', url };
        }
    }
    logger_1.log.info('[MediaHandler] No media detected in response');
    return null;
}
/**
 * Clean response text by removing file paths and URLs
 */
function cleanResponseText(response, media) {
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
async function uploadMediaToSlack(app, channel, media, text) {
    try {
        logger_1.log.info('[MediaHandler] Uploading media to Slack', {
            type: media.type,
            hasUrl: !!media.url,
            hasFilePath: !!media.filePath,
            channel
        });
        let fileBuffer;
        let filename;
        let filetype;
        // Get file buffer
        if (media.filePath) {
            // Local file (ElevenLabs audio)
            logger_1.log.info('[MediaHandler] Reading local file', { path: media.filePath });
            fileBuffer = fs_1.default.readFileSync(media.filePath);
            filename = path_1.default.basename(media.filePath);
            filetype = getFileType(media.filePath);
        }
        else if (media.url) {
            // Remote URL (Replicate, OpenAI)
            logger_1.log.info('[MediaHandler] Downloading from URL', { url: media.url.substring(0, 100) });
            const response = await axios_1.default.get(media.url, {
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
            }
            else {
                filename = `${media.type}_${Date.now()}.${getExtension(media.type)}`;
            }
            filetype = getFileTypeFromExtension(filename);
            logger_1.log.info('[MediaHandler] Downloaded file', {
                size: `${(fileBuffer.length / 1024).toFixed(2)}KB`,
                filename,
                filetype
            });
        }
        else {
            throw new Error('No file path or URL provided');
        }
        // Upload to Slack using filesUploadV2
        logger_1.log.info('[MediaHandler] Uploading to Slack', { filename, filetype, channel });
        const result = await app.client.files.uploadV2({
            channel_id: channel,
            file: fileBuffer,
            filename: filename,
            filetype: filetype,
            title: media.title || `Generated ${media.type}`,
            initial_comment: text || '✨ Generated content'
        });
        logger_1.log.info('[MediaHandler] Media uploaded successfully', {
            type: media.type,
            filename,
            filetype,
            size: `${(fileBuffer.length / 1024).toFixed(2)}KB`,
            ok: result.ok
        });
    }
    catch (error) {
        logger_1.log.error('[MediaHandler] Failed to upload media', {
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
function getExtension(type) {
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
function getFileType(filepath) {
    const ext = path_1.default.extname(filepath).toLowerCase();
    return getFileTypeFromExtension(filepath);
}
/**
 * Get Slack filetype from extension
 */
function getFileTypeFromExtension(filename) {
    const ext = path_1.default.extname(filename).toLowerCase();
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
