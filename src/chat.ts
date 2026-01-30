import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { workspace } from './workspace';
import { getRouter, toLLMMessages } from './llm';
import { log } from './logger';

// Router will intelligently choose between Claude and local model
const router = getRouter();

export interface ChatOptions {
  userId: string;
  userMessage: string;
  history: MessageParam[];
}

export async function chat(options: ChatOptions): Promise<string> {
  const { userId, userMessage, history } = options;

  try {
    const systemPrompt = workspace.getSystemPrompt();

    // Build message history
    const messages: MessageParam[] = [
      ...history,
      {
        role: 'user',
        content: userMessage,
      },
    ];

    log.info('[Chat] Processing message', {
      userId,
      preview: userMessage.substring(0, 50)
    });

    // Convert to LLM format
    const llmMessages = toLLMMessages(messages);

    // Use router for intelligent model selection
    const response = await router.generate(llmMessages, {
      maxTokens: 4096,
      systemPrompt,
      temperature: 0.7
    });

    log.info('[Chat] Response generated', {
      userId,
      model: response.model,
      preview: response.content.substring(0, 50),
      processingTime: response.processingTime
    });

    return response.content;
  } catch (error) {
    log.error('[Chat] Error generating response', { error });
    throw error;
  }
}
