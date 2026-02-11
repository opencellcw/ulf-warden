import 'dotenv/config';
import express from 'express';
import Replicate from 'replicate';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!
});

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    service: 'image-gen-agent',
    status: 'online',
    version: '1.0.0'
  });
});

/**
 * Generate image from prompt
 */
app.post('/generate', async (req, res) => {
  try {
    const { prompt, userId, style = 'realistic' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log(`[ImageGen] Generating for user ${userId}: "${prompt}"`);

    // Escolhe modelo baseado no style
    let model = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';

    if (style === 'anime') {
      model = 'cjwbw/anything-v3.0:f410ed4c6a0c3bf8b76747860b3a3c9e4c8b5a827a16eac9dd5ad9642edce9a2';
    }

    // Gera imagem
    const output = await replicate.run(model as any, {
      input: {
        prompt,
        negative_prompt: 'ugly, blurry, low quality',
        num_outputs: 1,
        guidance_scale: 7.5,
        num_inference_steps: 30
      }
    }) as string[];

    const imageUrl = output[0];

    console.log(`[ImageGen] Success! Image URL: ${imageUrl}`);

    res.json({
      success: true,
      imageUrl,
      prompt,
      style,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[ImageGen] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Enhance existing image
 */
app.post('/enhance', async (req, res) => {
  try {
    const { imageUrl, userId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing imageUrl' });
    }

    console.log(`[ImageGen] Enhancing for user ${userId}`);

    // Upscale com Real-ESRGAN
    const output = await replicate.run(
      'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b' as any,
      {
        input: {
          image: imageUrl,
          scale: 2,
          face_enhance: true
        }
      }
    ) as unknown as string;

    console.log(`[ImageGen] Enhanced! URL: ${output}`);

    res.json({
      success: true,
      enhancedUrl: output,
      originalUrl: imageUrl,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[ImageGen] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[ImageGen] Agent listening on port ${PORT}`);
  console.log(`[ImageGen] Replicate API: ${process.env.REPLICATE_API_TOKEN ? 'Configured ✓' : 'Missing ✗'}`);
});
