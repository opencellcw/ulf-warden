import { HealthMetrics } from './health-monitor';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';

export interface DegradationAlert {
  deployment: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  violations: string[];
  metrics: HealthMetrics;
  checkNumber: number;
}

export interface RollbackAlert {
  deployment: string;
  reason: string;
  violations: string[];
  metrics: HealthMetrics;
  automatic: boolean;
}

export interface SuccessAlert {
  deployment: string;
  duration: number;
  checks: number;
  metrics: HealthMetrics;
}

export class AlertManager {
  private discordClient?: Client;
  private adminChannelId?: string;
  private enabled: boolean;

  constructor() {
    this.enabled = !!process.env.DISCORD_BOT_TOKEN;
    this.adminChannelId = process.env.ADMIN_CHANNEL_ID;
  }

  /**
   * Initialize Discord client for alerts
   */
  async initialize(discordClient?: Client): Promise<void> {
    if (discordClient) {
      this.discordClient = discordClient;
      console.log('[AlertManager] ✅ Initialized with Discord client');
    } else {
      console.log('[AlertManager] ⚠️ No Discord client provided, alerts will be logged only');
    }
  }

  /**
   * Send degradation alert
   */
  async sendDegradationAlert(alert: DegradationAlert): Promise<void> {
    const emoji = this.getSeverityEmoji(alert.severity);
    const color = this.getSeverityColor(alert.severity);

    console.warn(`[AlertManager] ${emoji} DEGRADATION DETECTED (${alert.severity})`);
    console.warn(`[AlertManager] Deployment: ${alert.deployment}`);
    console.warn(`[AlertManager] Reason: ${alert.reason}`);
    console.warn(`[AlertManager] Violations: ${alert.violations.length}`);

    if (!this.enabled || !this.discordClient || !this.adminChannelId) {
      console.warn('[AlertManager] Discord alerts disabled or not configured');
      return;
    }

    try {
      const channel = await this.discordClient.channels.fetch(this.adminChannelId) as TextChannel;
      if (!channel) {
        console.error('[AlertManager] Admin channel not found');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Deployment Degradation Detected`)
        .setDescription(`**Severity:** ${alert.severity.toUpperCase()}`)
        .addFields(
          { name: '🚀 Deployment', value: alert.deployment, inline: true },
          { name: '🔢 Check #', value: alert.checkNumber.toString(), inline: true },
          { name: '📊 Reason', value: alert.reason, inline: false },
          {
            name: '⚠️ Violations',
            value: alert.violations.length > 0 
              ? alert.violations.map(v => `• ${v}`).join('\n')
              : 'None',
            inline: false
          },
          {
            name: '📈 Metrics',
            value: [
              `Error Rate: ${alert.metrics.errorRate.toFixed(1)}%`,
              `Response Time: ${alert.metrics.responseTime}ms`,
              `CPU: ${alert.metrics.cpuUsage.toFixed(1)}%`,
              `Memory: ${alert.metrics.memoryUsage.toFixed(1)}%`,
              `Pod Status: ${alert.metrics.podStatus}`,
              `Restarts: ${alert.metrics.restartCount}`
            ].join('\n'),
            inline: false
          }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      console.log('[AlertManager] ✅ Degradation alert sent to Discord');
    } catch (error: any) {
      console.error('[AlertManager] Failed to send degradation alert:', error.message);
    }
  }

  /**
   * Send rollback alert
   */
  async sendRollbackAlert(alert: RollbackAlert): Promise<void> {
    const emoji = alert.automatic ? '🔴' : '🔄';
    const type = alert.automatic ? 'AUTO-ROLLBACK' : 'MANUAL ROLLBACK';

    console.error(`[AlertManager] ${emoji} ${type} INITIATED`);
    console.error(`[AlertManager] Deployment: ${alert.deployment}`);
    console.error(`[AlertManager] Reason: ${alert.reason}`);

    if (!this.enabled || !this.discordClient || !this.adminChannelId) {
      console.error('[AlertManager] Discord alerts disabled or not configured');
      return;
    }

    try {
      const channel = await this.discordClient.channels.fetch(this.adminChannelId) as TextChannel;
      if (!channel) {
        console.error('[AlertManager] Admin channel not found');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF0000) // Red
        .setTitle(`${emoji} ${type} Initiated`)
        .setDescription(`**Deployment:** ${alert.deployment}`)
        .addFields(
          { name: '📊 Reason', value: alert.reason, inline: false },
          {
            name: '⚠️ Issues Found',
            value: alert.violations.length > 0
              ? alert.violations.map(v => `• ${v}`).join('\n')
              : 'Critical threshold exceeded',
            inline: false
          },
          {
            name: '📈 Final Metrics',
            value: [
              `Error Rate: ${alert.metrics.errorRate.toFixed(1)}%`,
              `Response Time: ${alert.metrics.responseTime}ms`,
              `CPU: ${alert.metrics.cpuUsage.toFixed(1)}%`,
              `Memory: ${alert.metrics.memoryUsage.toFixed(1)}%`,
              `Pod Status: ${alert.metrics.podStatus}`,
              `Restarts: ${alert.metrics.restartCount}`
            ].join('\n'),
            inline: false
          },
          {
            name: '🔄 Action',
            value: alert.automatic 
              ? '✅ Automatic rollback in progress...'
              : '✅ Manual rollback triggered',
            inline: false
          }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      
      // Send mention to admin
      const adminUserId = process.env.OWNER_USER_ID || '375567912706416642';
      await channel.send(`<@${adminUserId}> Rollback initiated on ${alert.deployment}`);
      
      console.log('[AlertManager] ✅ Rollback alert sent to Discord');
    } catch (error: any) {
      console.error('[AlertManager] Failed to send rollback alert:', error.message);
    }
  }

  /**
   * Send success alert (monitoring completed without issues)
   */
  async sendSuccessAlert(alert: SuccessAlert): Promise<void> {
    console.log(`[AlertManager] ✅ MONITORING COMPLETED SUCCESSFULLY`);
    console.log(`[AlertManager] Deployment: ${alert.deployment}`);
    console.log(`[AlertManager] Duration: ${alert.duration}s, Checks: ${alert.checks}`);

    if (!this.enabled || !this.discordClient || !this.adminChannelId) {
      return; // Don't log warning for success messages
    }

    try {
      const channel = await this.discordClient.channels.fetch(this.adminChannelId) as TextChannel;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x00FF00) // Green
        .setTitle('✅ Deployment Monitoring Completed')
        .setDescription(`**Deployment:** ${alert.deployment}`)
        .addFields(
          { name: '⏱️ Duration', value: `${alert.duration}s`, inline: true },
          { name: '🔢 Health Checks', value: alert.checks.toString(), inline: true },
          {
            name: '📈 Final Metrics',
            value: [
              `Error Rate: ${alert.metrics.errorRate.toFixed(1)}%`,
              `Response Time: ${alert.metrics.responseTime}ms`,
              `CPU: ${alert.metrics.cpuUsage.toFixed(1)}%`,
              `Memory: ${alert.metrics.memoryUsage.toFixed(1)}%`,
              `Pod Status: ${alert.metrics.podStatus}`
            ].join('\n'),
            inline: false
          },
          {
            name: '✅ Status',
            value: 'Deployment is healthy and stable',
            inline: false
          }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      console.log('[AlertManager] ✅ Success alert sent to Discord');
    } catch (error: any) {
      console.error('[AlertManager] Failed to send success alert:', error.message);
    }
  }

  /**
   * Send custom alert
   */
  async sendCustomAlert(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    console.log(`[AlertManager] ${title}: ${message}`);

    if (!this.enabled || !this.discordClient || !this.adminChannelId) {
      return;
    }

    try {
      const channel = await this.discordClient.channels.fetch(this.adminChannelId) as TextChannel;
      if (!channel) return;

      const color = severity === 'error' ? 0xFF0000 : severity === 'warning' ? 0xFFA500 : 0x0099FF;
      const emoji = severity === 'error' ? '🔴' : severity === 'warning' ? '⚠️' : 'ℹ️';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} ${title}`)
        .setDescription(message)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error: any) {
      console.error('[AlertManager] Failed to send custom alert:', error.message);
    }
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return 'ℹ️';
    }
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): number {
    switch (severity) {
      case 'critical': return 0xFF0000; // Red
      case 'high': return 0xFF6600; // Orange
      case 'medium': return 0xFFFF00; // Yellow
      case 'low': return 0x00FF00; // Green
      default: return 0x0099FF; // Blue
    }
  }

  /**
   * Test alerts (for debugging)
   */
  async testAlerts(): Promise<void> {
    console.log('[AlertManager] 🧪 Testing alerts...');

    const testMetrics: HealthMetrics = {
      timestamp: new Date(),
      errorRate: 5.2,
      responseTime: 250,
      cpuUsage: 45.3,
      memoryUsage: 62.1,
      requestCount: 150,
      activeConnections: 25,
      podStatus: 'Running',
      restartCount: 0
    };

    // Test degradation alert
    await this.sendDegradationAlert({
      deployment: 'test-deployment',
      severity: 'medium',
      reason: 'Test degradation alert',
      violations: ['Test violation 1', 'Test violation 2'],
      metrics: testMetrics,
      checkNumber: 5
    });

    await this.sleep(2000);

    // Test success alert
    await this.sendSuccessAlert({
      deployment: 'test-deployment',
      duration: 1800,
      checks: 30,
      metrics: testMetrics
    });

    console.log('[AlertManager] ✅ Test alerts sent');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
