"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStore = void 0;
exports.getVectorStore = getVectorStore;
const chromadb_1 = require("chromadb");
const openai_1 = __importDefault(require("openai"));
const uuid_1 = require("uuid");
const logger_1 = require("../logger");
const path_1 = __importDefault(require("path"));
/**
 * Vector Store for semantic memory storage and retrieval
 *
 * Uses ChromaDB for vector database and OpenAI embeddings
 */
class VectorStore {
    client;
    collection = null;
    openai;
    collectionName = 'ulf_memory';
    embeddingModel = 'text-embedding-3-small';
    constructor() {
        // Initialize ChromaDB client
        const dbPath = path_1.default.join(process.env.DATA_DIR || './data', 'memory_db');
        this.client = new chromadb_1.ChromaClient({
            path: dbPath
        });
        // Initialize OpenAI for embeddings
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            logger_1.log.warn('[VectorStore] OpenAI API key not found, embeddings will be disabled');
        }
        this.openai = new openai_1.default({ apiKey });
        logger_1.log.info('[VectorStore] Initialized', { dbPath });
    }
    async init() {
        try {
            // Get or create collection
            this.collection = await this.client.getOrCreateCollection({
                name: this.collectionName,
                metadata: { description: 'Ulf AI persistent memory' }
            });
            const count = await this.collection.count();
            logger_1.log.info('[VectorStore] Collection ready', {
                name: this.collectionName,
                count
            });
        }
        catch (error) {
            logger_1.log.error('[VectorStore] Failed to initialize', { error: error.message });
            throw error;
        }
    }
    /**
     * Generate embedding for text using OpenAI
     */
    async generateEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: text
            });
            return response.data[0].embedding;
        }
        catch (error) {
            logger_1.log.error('[VectorStore] Failed to generate embedding', {
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Store a memory with semantic embedding
     */
    async store(content, metadata) {
        if (!this.collection) {
            throw new Error('VectorStore not initialized');
        }
        const id = (0, uuid_1.v4)();
        try {
            logger_1.log.info('[VectorStore] Storing memory', {
                id,
                type: metadata.type,
                contentLength: content.length
            });
            // Generate embedding
            const embedding = await this.generateEmbedding(content);
            // Store in ChromaDB (convert arrays to JSON strings)
            const chromaMetadata = {
                ...metadata,
                id,
                createdAt: new Date().toISOString(),
                accessCount: 0
            };
            // Convert arrays to JSON strings (ChromaDB limitation)
            if (chromaMetadata.tags) {
                chromaMetadata.tags = JSON.stringify(chromaMetadata.tags);
            }
            if (chromaMetadata.relatedTo) {
                chromaMetadata.relatedTo = JSON.stringify(chromaMetadata.relatedTo);
            }
            await this.collection.add({
                ids: [id],
                embeddings: [embedding],
                documents: [content],
                metadatas: [chromaMetadata]
            });
            logger_1.log.info('[VectorStore] Memory stored successfully', { id });
            return id;
        }
        catch (error) {
            logger_1.log.error('[VectorStore] Failed to store memory', {
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Semantic search for memories
     */
    async recall(query, limit = 5, filter) {
        if (!this.collection) {
            throw new Error('VectorStore not initialized');
        }
        try {
            logger_1.log.info('[VectorStore] Searching memories', {
                query: query.substring(0, 50),
                limit,
                filter
            });
            // Generate query embedding
            const queryEmbedding = await this.generateEmbedding(query);
            // Search in ChromaDB
            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: limit,
                where: filter
            });
            // Transform results
            const searchResults = [];
            if (results.documents[0]) {
                for (let i = 0; i < results.documents[0].length; i++) {
                    const doc = results.documents[0][i];
                    const metadata = results.metadatas[0]?.[i];
                    const distance = results.distances?.[0]?.[i];
                    if (doc && metadata) {
                        // Parse JSON strings back to arrays
                        const parsedMetadata = { ...metadata };
                        if (typeof parsedMetadata.tags === 'string') {
                            try {
                                parsedMetadata.tags = JSON.parse(parsedMetadata.tags);
                            }
                            catch (e) { }
                        }
                        if (typeof parsedMetadata.relatedTo === 'string') {
                            try {
                                parsedMetadata.relatedTo = JSON.parse(parsedMetadata.relatedTo);
                            }
                            catch (e) { }
                        }
                        searchResults.push({
                            memory: {
                                id: metadata.id || results.ids[0][i],
                                content: doc,
                                metadata: parsedMetadata,
                                createdAt: metadata.createdAt,
                                lastAccessed: metadata.lastAccessed,
                                accessCount: metadata.accessCount || 0
                            },
                            similarity: distance ? 1 - distance : 0, // Convert distance to similarity
                            context: undefined
                        });
                    }
                }
            }
            logger_1.log.info('[VectorStore] Search complete', {
                resultsFound: searchResults.length
            });
            // Update access stats
            for (const result of searchResults) {
                await this.updateAccessStats(result.memory.id);
            }
            return searchResults;
        }
        catch (error) {
            logger_1.log.error('[VectorStore] Search failed', {
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Get memory by ID
     */
    async get(id) {
        if (!this.collection) {
            throw new Error('VectorStore not initialized');
        }
        try {
            const results = await this.collection.get({
                ids: [id]
            });
            if (results.documents[0] && results.metadatas[0]) {
                const metadata = results.metadatas[0];
                return {
                    id,
                    content: results.documents[0],
                    metadata,
                    createdAt: metadata.createdAt,
                    lastAccessed: metadata.lastAccessed,
                    accessCount: metadata.accessCount || 0
                };
            }
            return null;
        }
        catch (error) {
            logger_1.log.error('[VectorStore] Failed to get memory', {
                id,
                error: error.message
            });
            return null;
        }
    }
    /**
     * Update memory access statistics
     */
    async updateAccessStats(id) {
        if (!this.collection)
            return;
        try {
            const memory = await this.get(id);
            if (!memory)
                return;
            const updatedMetadata = {
                ...memory.metadata,
                lastAccessed: new Date().toISOString(),
                accessCount: (memory.accessCount || 0) + 1
            };
            // Convert arrays to JSON strings
            if (updatedMetadata.tags && Array.isArray(updatedMetadata.tags)) {
                updatedMetadata.tags = JSON.stringify(updatedMetadata.tags);
            }
            if (updatedMetadata.relatedTo && Array.isArray(updatedMetadata.relatedTo)) {
                updatedMetadata.relatedTo = JSON.stringify(updatedMetadata.relatedTo);
            }
            await this.collection.update({
                ids: [id],
                metadatas: [updatedMetadata]
            });
        }
        catch (error) {
            // Silently fail, not critical
            logger_1.log.debug('[VectorStore] Failed to update access stats', {
                id,
                error: error.message
            });
        }
    }
    /**
     * Delete a memory
     */
    async delete(id) {
        if (!this.collection) {
            throw new Error('VectorStore not initialized');
        }
        try {
            await this.collection.delete({
                ids: [id]
            });
            logger_1.log.info('[VectorStore] Memory deleted', { id });
        }
        catch (error) {
            logger_1.log.error('[VectorStore] Failed to delete memory', {
                id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Get collection statistics
     */
    async getStats() {
        if (!this.collection) {
            throw new Error('VectorStore not initialized');
        }
        try {
            const count = await this.collection.count();
            // Get all memories to count by type
            const all = await this.collection.get({});
            const byType = {};
            if (all.metadatas) {
                for (const metadata of all.metadatas) {
                    const type = metadata?.type || 'unknown';
                    byType[type] = (byType[type] || 0) + 1;
                }
            }
            return {
                totalMemories: count,
                byType
            };
        }
        catch (error) {
            logger_1.log.error('[VectorStore] Failed to get stats', {
                error: error.message
            });
            return { totalMemories: 0, byType: {} };
        }
    }
}
exports.VectorStore = VectorStore;
// Export singleton instance
let vectorStoreInstance = null;
function getVectorStore() {
    if (!vectorStoreInstance) {
        vectorStoreInstance = new VectorStore();
    }
    return vectorStoreInstance;
}
