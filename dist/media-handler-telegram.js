"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMediaToTelegram = uploadMediaToTelegram;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
/**
 * Upload media to Telegram
 */
async function uploadMediaToTelegram(bot, chatId, media, text) {
    try {
        logger_1.log.info('[MediaHandler] Uploading media to Telegram', {
            type: media.type,
            hasUrl: !!media.url,
            hasFilePath: !!media.filePath,
            chatId
        });
        const caption = text || `✨ Generated ${media.type}`;
        let fileSource;
        // Get file source (Buffer or local path)
        if (media.filePath) {
            // Local file (ElevenLabs audio)
            logger_1.log.info('[MediaHandler] Using local file', { path: media.filePath });
            fileSource = {
                source: fs_1.default.readFileSync(media.filePath),
                filename: path_1.default.basename(media.filePath)
            };
        }
        else if (media.url) {
            // Remote URL - download it
            logger_1.log.info('[MediaHandler] Downloading from URL', { url: media.url.substring(0, 100) });
            const response = await axios_1.default.get(media.url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: 50 * 1024 * 1024, // 50MB limit for videos/audio
                headers: {
                    'User-Agent': 'Ulfberht-Warden/1.0'
                }
            });
            const fileBuffer = Buffer.from(response.data);
            // Generate filename
            const urlParts = media.url.split('/');
            const urlFilename = urlParts[urlParts.length - 1].split('?')[0];
            const filename = urlFilename && urlFilename.includes('.')
                ? urlFilename
                : `${media.type}_${Date.now()}.${getExtension(media.type)}`;
            fileSource = {
                source: fileBuffer,
                filename
            };
            logger_1.log.info('[MediaHandler] Downloaded file', {
                size: `${(fileBuffer.length / 1024).toFixed(2)}KB`,
                filename
            });
        }
        else {
            throw new Error('No file path or URL provided');
        }
        // Send based on media type
        switch (media.type) {
            case 'image':
                await bot.telegram.sendPhoto(chatId, fileSource, {
                    caption
                });
                logger_1.log.info('[MediaHandler] Image sent to Telegram');
                break;
            case 'video':
                await bot.telegram.sendVideo(chatId, fileSource, {
                    caption,
                    supports_streaming: true // Enable inline playback
                });
                logger_1.log.info('[MediaHandler] Video sent to Telegram (streaming enabled)');
                break;
            case 'audio':
                // Check if it should be sent as voice note or audio file
                // Voice notes: short clips, usually < 1 minute
                // Audio files: longer content, music, etc.
                // For ElevenLabs (usually voice), send as voice note
                if (media.filePath && media.filePath.includes('elevenlabs')) {
                    await bot.telegram.sendVoice(chatId, fileSource, {
                        caption
                    });
                    logger_1.log.info('[MediaHandler] Audio sent as voice note to Telegram');
                }
                else {
                    // For other audio (music, etc), send as audio file
                    await bot.telegram.sendAudio(chatId, fileSource, {
                        caption,
                        title: media.title || 'Generated Audio',
                        performer: 'Ulfberht'
                    });
                    logger_1.log.info('[MediaHandler] Audio sent as file to Telegram');
                }
                break;
            default:
                throw new Error(`Unsupported media type: ${media.type}`);
        }
    }
    catch (error) {
        logger_1.log.error('[MediaHandler] Failed to upload media to Telegram', {
            error: error.message,
            stack: error.stack,
            type: media.type,
            chatId
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
