import { Router } from 'express';
import { supabase } from '../database/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { log } from '../logger';

/**
 * Bots API endpoints with Supabase authentication
 * 
 * Endpoints:
 * - GET    /api/bots           - List user's bots
 * - POST   /api/bots           - Create new bot
 * - GET    /api/bots/:name     - Get bot details
 * - PUT    /api/bots/:name     - Update bot
 * - DELETE /api/bots/:name     - Delete bot
 * - GET    /api/bots/:name/analytics - Get bot analytics
 */

export const botsRouter = Router();

/**
 * List user's bots
 */
botsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bots = await supabase.getBots(req.user.id);
    
    res.json({
      success: true,
      data: bots,
      count: bots.length,
    });
  } catch (error: any) {
    log.error('[BotsAPI] Failed to list bots', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bots',
    });
  }
});

/**
 * Create new bot
 */
botsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, tools, config } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type',
      });
    }

    // Validate type
    if (!['conversational', 'agent'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be "conversational" or "agent"',
      });
    }

    // Create bot
    const bot = await supabase.createBot({
      name,
      type,
      owner_id: req.user.id,
      tools: tools || [],
      config: config || {},
    });

    log.info('[BotsAPI] Bot created', {
      botName: name,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: bot,
    });
  } catch (error: any) {
    log.error('[BotsAPI] Failed to create bot', { error: error.message });
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Bot with this name already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create bot',
    });
  }
});

/**
 * Get bot details
 */
botsRouter.get('/:name', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.params;
    const bot = await supabase.getBotByName(name);

    // Check ownership
    if (bot.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    res.json({
      success: true,
      data: bot,
    });
  } catch (error: any) {
    log.error('[BotsAPI] Failed to get bot', { error: error.message });
    
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Bot not found',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot',
    });
  }
});

/**
 * Update bot
 */
botsRouter.put('/:name', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.params;
    const updates = req.body;

    // Get bot to check ownership
    const bot = await supabase.getBotByName(name);
    if (bot.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    // Update bot
    const updatedBot = await supabase.updateBot(name, updates);

    log.info('[BotsAPI] Bot updated', {
      botName: name,
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: updatedBot,
    });
  } catch (error: any) {
    log.error('[BotsAPI] Failed to update bot', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update bot',
    });
  }
});

/**
 * Delete bot
 */
botsRouter.delete('/:name', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.params;

    // Get bot to check ownership
    const bot = await supabase.getBotByName(name);
    if (bot.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    // Delete bot
    await supabase.deleteBot(name);

    log.info('[BotsAPI] Bot deleted', {
      botName: name,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Bot deleted successfully',
    });
  } catch (error: any) {
    log.error('[BotsAPI] Failed to delete bot', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete bot',
    });
  }
});

/**
 * Get bot analytics
 */
botsRouter.get('/:name/analytics', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    // Get bot to check ownership
    const bot = await supabase.getBotByName(name);
    if (bot.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    // Get analytics
    const analytics = await supabase.getBotAnalytics(bot.id, days);

    res.json({
      success: true,
      data: analytics,
      count: analytics.length,
    });
  } catch (error: any) {
    log.error('[BotsAPI] Failed to get analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});
