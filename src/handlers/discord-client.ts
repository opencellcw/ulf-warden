/**
 * Discord Client Singleton
 * 
 * Provides access to Discord client for scheduled tasks and other modules
 */

import { Client } from 'discord.js';

let discordClient: Client | null = null;

export function setDiscordClient(client: Client): void {
  discordClient = client;
}

export function getDiscordClient(): Client | null {
  return discordClient;
}
