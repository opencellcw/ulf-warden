"use strict";
/**
 * Heartbeat Types
 *
 * Defines types for autonomous periodic checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HEARTBEAT_CONFIG = void 0;
exports.DEFAULT_HEARTBEAT_CONFIG = {
    enabled: false,
    intervalMinutes: 30,
    slackChannel: process.env.SLACK_HEARTBEAT_CHANNEL || 'ulf-heartbeat',
    quietHoursStart: 23, // 11 PM
    quietHoursEnd: 7 // 7 AM
};
