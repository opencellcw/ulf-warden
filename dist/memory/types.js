"use strict";
/**
 * Memory System Types
 *
 * Structured memory types for intelligent storage and retrieval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryType = void 0;
var MemoryType;
(function (MemoryType) {
    MemoryType["FACT"] = "fact";
    MemoryType["CONVERSATION"] = "conversation";
    MemoryType["LEARNING"] = "learning";
    MemoryType["CONTEXT"] = "context";
    MemoryType["INSIGHT"] = "insight";
    MemoryType["TOOL_USAGE"] = "tool_usage"; // How tools were used successfully
})(MemoryType || (exports.MemoryType = MemoryType = {}));
