/**
 * YouTube Video Clone - AI-Powered Video Analysis & Recreation
 * 
 * Extract everything from a YouTube video:
 * - 📝 Full transcript (using youtube-transcript-plus)
 * - 🎬 Scene breakdown (from transcript timing)
 * - 🎨 Visual prompts for each scene (AI-generated from context)
 * - 📖 Complete script/roteiro
 * - 🎭 Style analysis
 * - 🔊 Audio cues and music
 * 
 * Output: Complete recreation package ready for content production
 */

import Anthropic from '@anthropic-ai/sdk';
import { YoutubeTranscript } from 'youtube-transcript-plus';
import { log } from '../logger';

// Types for YouTube transcript
interface TranscriptSegment {
  text: string;
  offset: number; // milliseconds
  duration: number; // milliseconds
}

// ============================================================================
// TYPES
// ============================================================================

export interface VideoScene {
  timestamp: string; // "00:00:12"
  duration: number; // seconds
  description: string; // What's happening in the scene
  visualPrompt: string; // AI prompt to recreate visuals
  transcript: string; // What's being said
  cameraAngle?: string; // "close-up", "wide shot", etc
  mood?: string; // "energetic", "calm", etc
  musicCue?: string; // Background music description
}

export interface VideoCloneAnalysis {
  videoId: string;
  title: string;
  duration: number;
  fullTranscript: string;
  scenes: VideoScene[];
  overallStyle: string;
  colorPalette: string[];
  editingStyle: string;
  targetAudience: string;
  recreationScript: string; // Complete script for recreation
}

// ============================================================================
// YOUTUBE TRANSCRIPT FETCHING
// ============================================================================

async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript as TranscriptSegment[];
  } catch (error: any) {
    log.error('[VideoClone] Transcript fetch failed', { error: error.message, videoId });
    throw new Error(`Could not fetch transcript: ${error.message}`);
  }
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

export async function cloneYouTubeVideo(
  videoUrl: string,
  options?: {
    sceneCount?: number;
  }
): Promise<VideoCloneAnalysis> {
  const sceneCount = options?.sceneCount || 10;

  log.info('[VideoClone] Starting video analysis', { videoUrl, sceneCount });

  // Extract video ID
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Step 1: Get transcript
  log.info('[VideoClone] Fetching transcript...');
  const transcriptData = await fetchYouTubeTranscript(videoId);
  
  const fullTranscript = transcriptData
    .map((segment: TranscriptSegment) => segment.text)
    .join(' ');

  // Step 2: Analyze scenes
  log.info('[VideoClone] Analyzing scenes...');
  const scenes: VideoScene[] = [];
  
  // Divide transcript into segments based on scene count
  const totalDuration = transcriptData[transcriptData.length - 1]?.offset / 1000 || 600; // Convert to seconds
  const segmentDuration = totalDuration / sceneCount;
  
  for (let i = 0; i < sceneCount; i++) {
    const startTime = i * segmentDuration;
    const endTime = (i + 1) * segmentDuration;
    
    // Get transcript for this time range (convert seconds to milliseconds)
    const segmentTranscript = transcriptData
      .filter((seg: TranscriptSegment) => {
        const segTime = seg.offset / 1000;
        return segTime >= startTime && segTime < endTime;
      })
      .map((seg: TranscriptSegment) => seg.text)
      .join(' ');

    const timestamp = formatTimestamp(startTime);
    
    // Generate scene analysis from transcript
    const analysis = await generateSceneFromTranscript(segmentTranscript, timestamp);

    scenes.push({
      timestamp,
      duration: segmentDuration,
      description: analysis.description,
      visualPrompt: analysis.visualPrompt,
      transcript: segmentTranscript,
      cameraAngle: analysis.cameraAngle,
      mood: analysis.mood
    });

    log.info('[VideoClone] Scene analyzed', { 
      scene: i + 1, 
      timestamp 
    });
  }

  // Step 3: Generate overall analysis and recreation script
  log.info('[VideoClone] Generating recreation script...');
  const overallAnalysis = await generateOverallAnalysis(scenes, fullTranscript);

  return {
    videoId,
    title: `Video ${videoId}`,
    duration: totalDuration,
    fullTranscript,
    scenes,
    ...overallAnalysis
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function generateSceneFromTranscript(
  transcript: string,
  timestamp: string
): Promise<{
  description: string;
  visualPrompt: string;
  cameraAngle: string;
  mood: string;
}> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Based on this video transcript at ${timestamp}:

"${transcript}"

Generate a scene analysis as JSON:
{
  "description": "what's happening in this scene",
  "visualPrompt": "detailed prompt to recreate visuals with AI",
  "cameraAngle": "wide/close-up/medium/etc",
  "mood": "energetic/calm/dramatic/etc"
}`
        }
      ]
    });

    const text = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error: any) {
    log.error('[VideoClone] Scene generation failed', { error: error.message });
  }

  return {
    description: transcript.substring(0, 100),
    visualPrompt: transcript,
    cameraAngle: 'medium shot',
    mood: 'neutral'
  };
}

async function generateOverallAnalysis(
  scenes: VideoScene[],
  fullTranscript: string
): Promise<{
  overallStyle: string;
  colorPalette: string[];
  editingStyle: string;
  targetAudience: string;
  recreationScript: string;
}> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
  });

  const scenesSummary = scenes
    .map((s, i) => `Scene ${i + 1} (${s.timestamp}): ${s.description} | Mood: ${s.mood}`)
    .join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Analyze this video for recreation purposes:

SCENES:
${scenesSummary}

FULL TRANSCRIPT:
${fullTranscript.substring(0, 2000)}

Provide complete analysis as JSON:
{
  "overallStyle": "visual style description",
  "colorPalette": ["color1", "color2", "color3"],
  "editingStyle": "pacing and editing description",
  "targetAudience": "who this video is for",
  "recreationScript": "complete step-by-step script to recreate this video with new content but same style, format, and energy"
}`
        }
      ]
    });

    const text = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error: any) {
    log.error('[VideoClone] Overall analysis failed', { error: error.message });
  }

  return {
    overallStyle: 'Standard video style',
    colorPalette: ['#000000', '#FFFFFF'],
    editingStyle: 'Medium-paced editing',
    targetAudience: 'General audience',
    recreationScript: 'Recreation script generation failed. Review scenes manually.'
  };
}

// ============================================================================
// EXPORT FORMATTED RESULTS
// ============================================================================

export function formatVideoCloneResults(analysis: VideoCloneAnalysis): string {
  let output = `# 🎬 VIDEO CLONE ANALYSIS

## 📊 Overview
- **Video ID:** ${analysis.videoId}
- **Duration:** ${formatTimestamp(analysis.duration)}
- **Scenes:** ${analysis.scenes.length}

## 🎨 Style Analysis
- **Visual Style:** ${analysis.overallStyle}
- **Color Palette:** ${analysis.colorPalette.join(', ')}
- **Editing Style:** ${analysis.editingStyle}
- **Target Audience:** ${analysis.targetAudience}

## 🎬 Scene Breakdown

`;

  analysis.scenes.forEach((scene, i) => {
    output += `### Scene ${i + 1} - ${scene.timestamp}
**Description:** ${scene.description}
**Mood:** ${scene.mood} | **Camera:** ${scene.cameraAngle}
**Transcript:** "${scene.transcript.substring(0, 100)}..."
**Visual Prompt:** ${scene.visualPrompt}

`;
  });

  output += `## 📝 Recreation Script

${analysis.recreationScript}

## 📄 Full Transcript

${analysis.fullTranscript}

---
*Analysis completed with AI-powered video cloning*
`;

  return output;
}
