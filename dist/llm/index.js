"use strict";
/**
 * LLM Module - Dual-model architecture with intelligent routing
 *
 * Supports:
 * - Claude API (primary, full-featured)
 * - Local models (secondary, lightweight tasks)
 *
 * Usage:
 *   import { getRouter } from './llm';
 *   const router = getRouter();
 *   const response = await router.generate(messages, options);
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalProvider = exports.getClaudeProvider = exports.getRouter = void 0;
__exportStar(require("./interface"), exports);
__exportStar(require("./claude"), exports);
__exportStar(require("./local"), exports);
__exportStar(require("./router"), exports);
var router_1 = require("./router");
Object.defineProperty(exports, "getRouter", { enumerable: true, get: function () { return router_1.getRouter; } });
var claude_1 = require("./claude");
Object.defineProperty(exports, "getClaudeProvider", { enumerable: true, get: function () { return claude_1.getClaudeProvider; } });
var local_1 = require("./local");
Object.defineProperty(exports, "getLocalProvider", { enumerable: true, get: function () { return local_1.getLocalProvider; } });
