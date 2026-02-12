import Anthropic from '@anthropic-ai/sdk';
import { getReplicateRegistry } from '../replicate/model-registry';
import { triggerManualSync } from '../replicate/auto-sync';
import { log } from '../logger';

/**
 * Search Replicate models
 */
export async function searchReplicateModels(input: any): Promise<string> {
  const { query, category, limit = 5 } = input;

  try {
    const registry = getReplicateRegistry();

    let results;
    
    if (category) {
      results = registry.getModelsByCategory(category, limit);
    } else if (query) {
      results = await registry.searchModels(query, limit);
    } else {
      results = registry.getTopModels(limit);
    }

    if (results.length === 0) {
      return `❌ Nenhum model encontrado.\n\nTente:\n- Outro termo de busca\n- Categoria diferente\n- Sync manual: use \`sync_replicate_models\``;
    }

    let response = `🎨 **Replicate Models** (${results.length}):\n\n`;

    for (const model of results) {
      response += `**${model.name}**\n`;
      response += `📝 ${model.description.substring(0, 100)}${model.description.length > 100 ? '...' : ''}\n`;
      response += `🏷️ Category: ${model.category}\n`;
      
      if (model.usageCount > 0) {
        response += `📊 Stats: ${model.usageCount} uses, ${(model.successRate * 100).toFixed(0)}% success\n`;
      }
      
      if (model.averageRunTime > 0) {
        response += `⚡ Avg time: ${model.averageRunTime.toFixed(1)}s\n`;
      }
      
      if (model.tags) {
        response += `🏷️ Tags: ${model.tags}\n`;
      }
      
      response += `🔗 \`${model.name}:${model.latestVersion.substring(0, 12)}\`\n\n`;
    }

    return response;
  } catch (error: any) {
    log.error('[ReplicateRegistry] Search failed', { error: error.message });
    return `❌ Erro ao buscar models: ${error.message}`;
  }
}

/**
 * Get model info
 */
export async function getReplicateModelInfo(input: any): Promise<string> {
  const { model_name } = input;

  if (!model_name) {
    return '❌ Parameter model_name required';
  }

  try {
    const registry = getReplicateRegistry();
    const model = registry.getModel(model_name);

    if (!model) {
      return `❌ Model \`${model_name}\` not found in registry.\n\nTry:\n- Search: \`search_replicate_models\`\n- Sync: \`sync_replicate_models\``;
    }

    let response = `🎨 **${model.name}**\n\n`;
    response += `📝 **Description:**\n${model.description}\n\n`;
    response += `🏷️ **Category:** ${model.category}\n`;
    
    if (model.tags) {
      response += `🏷️ **Tags:** ${model.tags}\n`;
    }
    
    response += `📦 **Latest Version:** \`${model.latestVersion}\`\n\n`;

    if (model.usageCount > 0) {
      response += `📊 **Usage Statistics:**\n`;
      response += `- Total uses: ${model.usageCount}\n`;
      response += `- Success rate: ${(model.successRate * 100).toFixed(1)}%\n`;
      response += `- Average runtime: ${model.averageRunTime.toFixed(1)}s\n`;
      response += `- Popularity score: ${model.popularityScore.toFixed(0)}\n`;
      
      if (model.lastUsed) {
        const lastUsedDate = new Date(model.lastUsed);
        response += `- Last used: ${lastUsedDate.toLocaleString('pt-BR')}\n`;
      }
      response += '\n';
    }

    response += `**Full name for replicate tool:**\n\`\`\`\n${model.name}:${model.latestVersion}\n\`\`\``;

    return response;
  } catch (error: any) {
    log.error('[ReplicateRegistry] Get model info failed', { error: error.message });
    return `❌ Erro ao buscar info: ${error.message}`;
  }
}

/**
 * List top models
 */
export async function listTopReplicateModels(input: any): Promise<string> {
  const { category, limit = 10 } = input;

  try {
    const registry = getReplicateRegistry();
    const stats = registry.getStats();

    let response = `🎨 **Replicate Model Registry**\n\n`;
    response += `📊 **Stats:**\n`;
    response += `- Total models: ${stats.totalModels}\n`;
    response += `- Categories: ${Object.keys(stats.categories).length}\n\n`;

    if (category) {
      const models = registry.getModelsByCategory(category, limit);
      response += `🏆 **Top ${category} Models:**\n\n`;
      
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        response += `${i + 1}. **${model.name}**\n`;
        response += `   ${model.description.substring(0, 80)}...\n`;
        response += `   Uses: ${model.usageCount}, Success: ${(model.successRate * 100).toFixed(0)}%\n\n`;
      }
    } else {
      response += `🏆 **Top Models Overall:**\n\n`;
      
      for (let i = 0; i < stats.topModels.length; i++) {
        const model = stats.topModels[i];
        response += `${i + 1}. **${model.name}**\n`;
        response += `   Category: ${model.category}\n`;
        response += `   Uses: ${model.usageCount}, Popularity: ${model.popularityScore.toFixed(0)}\n\n`;
      }

      if (stats.recentlyUsed.length > 0) {
        response += `⏱️ **Recently Used:**\n\n`;
        for (const model of stats.recentlyUsed) {
          response += `- ${model.name} (${model.category})\n`;
        }
      }
    }

    response += `\n💡 **Tip:** Use \`search_replicate_models\` to find specific models`;

    return response;
  } catch (error: any) {
    log.error('[ReplicateRegistry] List top failed', { error: error.message });
    return `❌ Erro ao listar: ${error.message}`;
  }
}

/**
 * Sync models now
 */
export async function syncReplicateModelsNow(): Promise<string> {
  try {
    log.info('[ReplicateRegistry] Manual sync requested');

    const result = await triggerManualSync();

    if (result.success) {
      return result.message;
    } else {
      return result.message;
    }
  } catch (error: any) {
    log.error('[ReplicateRegistry] Manual sync failed', { error: error.message });
    return `❌ Falha no sync: ${error.message}`;
  }
}

/**
 * Tool definitions
 */
export const REPLICATE_REGISTRY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_replicate_models',
    description: `Search Replicate models with semantic search.

**Use when:**
- User asks "qual model usar para X?"
- "me recomenda um model de image generation"
- "models de video"
- "flux pro ou stable diffusion?"

**Categories available:**
- text-to-image
- image-to-image
- video
- audio
- text
- image-enhancement
- image-control
- other

**Returns:** Models matching query with stats (usage, success rate, runtime)`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "realistic image generation", "video from text", "upscaling")',
        },
        category: {
          type: 'string',
          description: 'Filter by category (optional)',
          enum: ['text-to-image', 'image-to-image', 'video', 'audio', 'text', 'image-enhancement', 'image-control', 'other'],
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 5)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_replicate_model_info',
    description: `Get detailed info about a specific Replicate model.

Shows:
- Description
- Latest version
- Parameters
- Usage statistics
- Success rate
- Average runtime

**Use when:**
- User asks about specific model
- "info sobre stability-ai/sdxl"
- "como usar flux-pro?"`,
    input_schema: {
      type: 'object',
      properties: {
        model_name: {
          type: 'string',
          description: 'Full model name (owner/model-name, e.g., "stability-ai/sdxl")',
        },
      },
      required: ['model_name'],
    },
  },
  {
    name: 'list_top_replicate_models',
    description: `List top Replicate models by popularity and usage.

Shows registry stats and:
- Top models overall (by popularity score)
- Recently used models
- Breakdown by category (if specified)

**Use when:**
- "quais os melhores models?"
- "models mais usados"
- "me mostra o que tem disponível"`,
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (optional)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'sync_replicate_models',
    description: `Manually trigger model registry sync.

Fetches latest models from Replicate API:
- Discovers new models
- Updates existing models
- Refreshes versions
- Updates embeddings

**Use when:**
- "atualiza os models"
- "sync replicate"
- User mentions new model that's not in registry`,
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
