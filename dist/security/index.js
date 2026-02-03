"use strict";
/**
 * Security Integration Layer
 *
 * Exports all security components:
 * - Sanitizer: Content firewall for external data
 * - Vetter: Tool execution gate
 * - Self-Defense: Rate limiting and attack detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfDefenseSystem = exports.SelfDefenseSystem = exports.formatConfirmationPrompt = exports.validateToolArgs = exports.isInDenylist = exports.isInAllowlist = exports.vetToolCall = exports.formatForAgent = exports.requiresSanitization = exports.sanitizeContent = void 0;
var sanitizer_1 = require("./sanitizer");
Object.defineProperty(exports, "sanitizeContent", { enumerable: true, get: function () { return sanitizer_1.sanitizeContent; } });
Object.defineProperty(exports, "requiresSanitization", { enumerable: true, get: function () { return sanitizer_1.requiresSanitization; } });
Object.defineProperty(exports, "formatForAgent", { enumerable: true, get: function () { return sanitizer_1.formatForAgent; } });
var vetter_1 = require("./vetter");
Object.defineProperty(exports, "vetToolCall", { enumerable: true, get: function () { return vetter_1.vetToolCall; } });
Object.defineProperty(exports, "isInAllowlist", { enumerable: true, get: function () { return vetter_1.isInAllowlist; } });
Object.defineProperty(exports, "isInDenylist", { enumerable: true, get: function () { return vetter_1.isInDenylist; } });
Object.defineProperty(exports, "validateToolArgs", { enumerable: true, get: function () { return vetter_1.validateToolArgs; } });
Object.defineProperty(exports, "formatConfirmationPrompt", { enumerable: true, get: function () { return vetter_1.formatConfirmationPrompt; } });
var self_defense_1 = require("./self-defense");
Object.defineProperty(exports, "SelfDefenseSystem", { enumerable: true, get: function () { return self_defense_1.SelfDefenseSystem; } });
Object.defineProperty(exports, "selfDefenseSystem", { enumerable: true, get: function () { return self_defense_1.selfDefenseSystem; } });
