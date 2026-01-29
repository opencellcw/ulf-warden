import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { workspace } from './workspace';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

export interface ChatOptions {
  userId: string;
  userMessage: string;
  history: MessageParam[];
  onThinking?: () => void;
  onMessage?: (text: string) => void;
}

export async function chat(options: ChatOptions): Promise<string> {
  const { userId, userMessage, history, onThinking, onMessage } = options;

  try {
    if (onThinking) {
      onThinking();
    }

    const systemPrompt = workspace.getSystemPrompt();

    const messages: MessageParam[] = [
      ...history,
      {
        role: 'user',
        content: userMessage,
      },
    ];

    console.log(`[Chat] User ${userId}: ${userMessage.substring(0, 50)}...`);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    const assistantMessage = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');

    console.log(`[Chat] Warden: ${assistantMessage.substring(0, 50)}...`);

    if (onMessage) {
      onMessage(assistantMessage);
    }

    return assistantMessage;
  } catch (error) {
    console.error('[Chat] Error:', error);
    throw error;
  }
}
