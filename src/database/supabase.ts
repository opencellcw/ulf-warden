import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { log } from '../logger';

/**
 * Supabase Integration for OpenCell
 * 
 * Provides:
 * - PostgreSQL database (scalable, managed)
 * - Authentication (OAuth, JWT, Magic Links)
 * - Storage (avatars, logs, files)
 * - Realtime subscriptions (WebSocket)
 * 
 * Setup:
 * 1. Sign up at https://supabase.com
 * 2. Create a project
 * 3. Copy URL and anon key to .env:
 *    SUPABASE_URL=https://xxx.supabase.co
 *    SUPABASE_ANON_KEY=eyJxxx...
 * 4. Run migrations: npm run migrate:supabase
 * 
 * ROI: ~$5,000/year (managed DB + auth + storage + realtime)
 */

export class OpenCellSupabase {
  private client: SupabaseClient | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.SUPABASE_ENABLED === 'true';

    if (!this.enabled) {
      log.info('[Supabase] Disabled via config');
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      log.warn('[Supabase] URL or key not configured, disabling');
      this.enabled = false;
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });

      log.info('[Supabase] Initialized successfully', {
        url: supabaseUrl.substring(0, 30) + '...',
      });
    } catch (error: any) {
      log.error('[Supabase] Initialization failed', { error: error.message });
      this.enabled = false;
    }
  }

  /**
   * Get Supabase client
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  // ============================================================================
  // BOTS CRUD
  // ============================================================================

  /**
   * Create a new bot
   */
  async createBot(bot: {
    name: string;
    type: 'conversational' | 'agent';
    owner_id: string;
    tools?: string[];
    config?: Record<string, any>;
    avatar_url?: string;
  }): Promise<any> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('bots')
      .insert({
        name: bot.name,
        type: bot.type,
        owner_id: bot.owner_id,
        tools: bot.tools || [],
        config: bot.config || {},
        avatar_url: bot.avatar_url,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all bots for a user
   */
  async getBots(userId: string): Promise<any[]> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('bots')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get bot by name
   */
  async getBotByName(name: string): Promise<any> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('bots')
      .select('*')
      .eq('name', name)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update bot
   */
  async updateBot(name: string, updates: Partial<{
    type: string;
    tools: string[];
    config: Record<string, any>;
    avatar_url: string;
    status: string;
  }>): Promise<any> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('bots')
      .update(updates)
      .eq('name', name)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete bot
   */
  async deleteBot(name: string): Promise<void> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { error } = await this.client
      .from('bots')
      .delete()
      .eq('name', name);

    if (error) throw error;
  }

  // ============================================================================
  // CONVERSATIONS
  // ============================================================================

  /**
   * Store conversation
   */
  async storeConversation(conversation: {
    bot_id?: string;
    user_id: string;
    platform: string;
    messages: any[];
    metadata?: Record<string, any>;
  }): Promise<any> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get conversations for a user
   */
  async getConversations(userId: string, limit: number = 50): Promise<any[]> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Store bot analytics
   */
  async storeBotAnalytics(analytics: {
    bot_id: string;
    date: string;
    requests_count: number;
    total_cost: number;
    avg_latency_ms: number;
    error_count: number;
  }): Promise<void> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { error } = await this.client
      .from('bot_analytics')
      .upsert(analytics, {
        onConflict: 'bot_id,date',
      });

    if (error) throw error;
  }

  /**
   * Get bot analytics
   */
  async getBotAnalytics(botId: string, days: number = 30): Promise<any[]> {
    if (!this.client) throw new Error('Supabase not initialized');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.client
      .from('bot_analytics')
      .select('*')
      .eq('bot_id', botId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Sign up with email/password
   */
  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in with email/password
   */
  async signIn(email: string, password: string) {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in with OAuth (Google, GitHub, Discord)
   */
  async signInWithOAuth(provider: 'google' | 'github' | 'discord') {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client.auth.signInWithOAuth({
      provider,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign out
   */
  async signOut() {
    if (!this.client) throw new Error('Supabase not initialized');

    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data: { user }, error } = await this.client.auth.getUser();
    if (error) throw error;
    return user;
  }

  /**
   * Verify user from token
   */
  async verifyUser(token: string) {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data: { user }, error } = await this.client.auth.getUser(token);
    if (error) throw error;
    return user;
  }

  // ============================================================================
  // STORAGE
  // ============================================================================

  /**
   * Upload file to storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File | Buffer,
    options?: {
      contentType?: string;
      cacheControl?: string;
      upsert?: boolean;
    }
  ): Promise<string> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: options?.contentType,
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = this.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  }

  /**
   * Upload bot avatar
   */
  async uploadBotAvatar(botName: string, file: File | Buffer): Promise<string> {
    const publicUrl = await this.uploadFile(
      'bot-avatars',
      `${botName}.png`,
      file,
      {
        contentType: 'image/png',
        upsert: true,
      }
    );

    return publicUrl;
  }

  /**
   * Get file URL
   */
  getFileUrl(bucket: string, path: string): string {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data: { publicUrl } } = this.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  }

  /**
   * Delete file
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { error } = await this.client.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to table changes
   */
  subscribeToTable(
    table: string,
    callback: (payload: any) => void,
    filter?: { column: string; value: any }
  ) {
    if (!this.client) throw new Error('Supabase not initialized');

    const channel = this.client
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        callback
      )
      .subscribe();

    return channel;
  }

  /**
   * Subscribe to bot changes for a user
   */
  subscribeToBots(userId: string, callback: (payload: any) => void) {
    return this.subscribeToTable('bots', callback, {
      column: 'owner_id',
      value: userId,
    });
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: any): Promise<void> {
    if (!this.client) throw new Error('Supabase not initialized');
    await this.client.removeChannel(channel);
  }
}

// Singleton instance
let supabaseInstance: OpenCellSupabase | null = null;

export function getSupabase(): OpenCellSupabase {
  if (!supabaseInstance) {
    supabaseInstance = new OpenCellSupabase();
  }
  return supabaseInstance;
}

export const supabase = getSupabase();
