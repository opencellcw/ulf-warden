/**
 * Video Clone Tool Definition
 * 
 * Anthropic tool for YouTube video cloning/analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { cloneYouTubeVideo, formatVideoCloneResults } from './video-clone';
import { log } from '../logger';

export const VIDEO_CLONE_TOOL: Anthropic.Tool = {
  name: 'youtube_video_clone',
  description: `Analyze and clone a YouTube video using AI.

This powerful tool extracts everything from a YouTube video:
- 📝 Complete transcript with timestamps
- 🎬 Scene-by-scene breakdown
- 🎨 AI-generated visual prompts for each scene
- 📖 Complete recreation script/roteiro
- 🎭 Style analysis (colors, editing, mood)
- 🎯 Target audience identification

Perfect for:
- Content creators wanting to recreate video format/style
- Understanding video structure and pacing
- Generating new content based on successful videos
- Learning from competitors
- Creating similar content in different niches

Example: "Clone this video: https://youtube.com/watch?v=xxx"

The tool will analyze the video and provide a complete package for recreation.`,
  
  input_schema: {
    type: 'object',
    properties: {
      video_url: {
        type: 'string',
        description: 'YouTube video URL (e.g., https://youtube.com/watch?v=xxx or https://youtu.be/xxx)'
      },
      scene_count: {
        type: 'number',
        description: 'Number of scenes to extract (default: 10). More scenes = more detailed but slower.',
        minimum: 3,
        maximum: 30
      }
    },
    required: ['video_url']
  }
};

export async function executeVideoCloneTool(input: any): Promise<string> {
  const { video_url, scene_count = 10 } = input;

  log.info('[VideoCloneTool] Starting video clone', {
    url: video_url,
    sceneCount: scene_count
  });

  try {
    // Perform analysis
    const analysis = await cloneYouTubeVideo(video_url, {
      sceneCount: scene_count
    });

    // Format results
    const formatted = formatVideoCloneResults(analysis);

    log.info('[VideoCloneTool] Analysis complete', {
      scenes: analysis.scenes.length,
      duration: analysis.duration
    });

    return formatted;
    
  } catch (error: any) {
    log.error('[VideoCloneTool] Failed to clone video', {
      error: error.message,
      url: video_url
    });

    return `❌ Failed to clone video: ${error.message}

Make sure:
1. The YouTube URL is valid
2. The video has captions/transcript available
3. The video is not private or age-restricted

Try again with a different video or use include_frames: false for faster analysis.`;
  }
}
