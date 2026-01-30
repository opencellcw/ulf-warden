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
            hasFilePath: !!media.filePath
        });
        let fileBuffer;
        let filename;
        // Get file buffer
        if (media.filePath) {
            // Local file (ElevenLabs audio)
            fileBuffer = fs_1.default.readFileSync(media.filePath);
            filename = path_1.default.basename(media.filePath);
        }
        else if (media.url) {
            // Remote URL (Replicate, OpenAI)
            logger_1.log.info('[MediaHandler] Downloading from URL', { url: media.url });
            const response = await axios_1.default.get(media.url, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            fileBuffer = Buffer.from(response.data);
            // Generate filename from URL or use default
            const urlParts = media.url.split('/');
            filename = urlParts[urlParts.length - 1].split('?')[0] || `${media.type}.${getExtension(media.type)}`;
        }
        else {
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
        logger_1.log.info('[MediaHandler] Media uploaded successfully', {
            type: media.type,
            filename,
            size: `${(fileBuffer.length / 1024).toFixed(2)}KB`
        });
    }
    catch (error) {
        logger_1.log.error('[MediaHandler] Failed to upload media', {
            error: error.message,
            type: media.type
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
