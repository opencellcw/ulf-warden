/**
 * Smart Reaction System
 * 
 * Determines when bot should REPLY vs REACT intelligently
 * 
 * RULES:
 * 1. Questions → ALWAYS reply with text
 * 2. Requests for info → ALWAYS reply with text
 * 3. Commands → ALWAYS reply with text
 * 4. Acknowledgments → Can react with emoji
 * 5. Casual chat → Can react with emoji
 */

export interface MessageAnalysis {
  isQuestion: boolean;
  isRequest: boolean;
  isCommand: boolean;
  isAcknowledgment: boolean;
  needsDetailedResponse: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

/**
 * Analyze message to determine if it needs a text response
 */
export function analyzeMessage(text: string): MessageAnalysis {
  const lower = text.toLowerCase().trim();
  
  // Question indicators
  const questionWords = [
    'o que', 'como', 'quando', 'onde', 'por que', 'porque', 'qual', 'quais', 'quanto', 'quantos',
    'what', 'how', 'when', 'where', 'why', 'which', 'who', 'whom', 'whose',
    '?'
  ];
  
  const isQuestion = 
    lower.includes('?') ||
    questionWords.some(q => lower.includes(q));
  
  // Request indicators (pede informação/ação)
  const requestWords = [
    'me', 'manda', 'envia', 'passa', 'mostra', 'explica', 'fala', 'conta', 'diz',
    'send', 'show', 'tell', 'give', 'explain', 'describe', 'list', 'get',
    'pode', 'consegue', 'sabe'
  ];
  
  const isRequest = requestWords.some(r => lower.includes(r));
  
  // Command indicators
  const commandWords = [
    '!', '/', '@', 'execute', 'run', 'criar', 'deletar', 'atualizar', 'buscar'
  ];
  
  const isCommand = commandWords.some(c => lower.includes(c));
  
  // Acknowledgment indicators (só confirma algo)
  const ackWords = [
    'ok', 'okay', 'beleza', 'valeu', 'obrigado', 'thanks', 'nice', 'legal',
    'entendi', 'got it', 'perfeito', 'show', 'massa', 'top'
  ];
  
  const isAcknowledgment = 
    ackWords.some(a => lower === a || lower === a + '!' || lower === a + '!!') &&
    text.length < 15; // Só acknowledgments curtos
  
  // Needs detailed response
  const needsDetailedResponse = 
    isQuestion ||
    isRequest ||
    isCommand ||
    (text.length > 50 && !isAcknowledgment); // Mensagens longas precisam resposta
  
  // Sentiment analysis (básico)
  const positiveWords = ['bom', 'ótimo', 'legal', 'show', 'massa', 'good', 'great', 'nice', 'awesome'];
  const negativeWords = ['ruim', 'bad', 'erro', 'error', 'problema', 'issue', 'bug'];
  
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (positiveWords.some(w => lower.includes(w))) sentiment = 'positive';
  if (negativeWords.some(w => lower.includes(w))) sentiment = 'negative';
  
  // Confidence calculation
  let confidence = 0.5;
  if (isQuestion) confidence += 0.3;
  if (isRequest) confidence += 0.2;
  if (isCommand) confidence += 0.4;
  if (isAcknowledgment) confidence += 0.3;
  confidence = Math.min(confidence, 1.0);
  
  return {
    isQuestion,
    isRequest,
    isCommand,
    isAcknowledgment,
    needsDetailedResponse,
    sentiment,
    confidence
  };
}

/**
 * Determine if bot should react or reply based on analysis
 */
export function shouldReactOnly(analysis: MessageAnalysis): boolean {
  // NEVER react only if it's a question, request, or command
  if (analysis.isQuestion || analysis.isRequest || analysis.isCommand) {
    return false;
  }
  
  // Can react only if it's a simple acknowledgment
  if (analysis.isAcknowledgment && !analysis.needsDetailedResponse) {
    return true;
  }
  
  // Default: reply with text
  return false;
}

/**
 * Get recommended emoji for reaction (if reacting)
 */
export function getRecommendedEmoji(analysis: MessageAnalysis): string {
  if (analysis.sentiment === 'positive') {
    return ['👍', '✅', '😊', '🔥', '⭐'][Math.floor(Math.random() * 5)];
  }
  
  if (analysis.sentiment === 'negative') {
    return ['👀', '🤔', '😬'][Math.floor(Math.random() * 3)];
  }
  
  // Neutral
  return ['👍', '👀', '✅'][Math.floor(Math.random() * 3)];
}

/**
 * Build improved system prompt with smart reaction rules
 */
export function buildSmartReactionPrompt(): string {
  return `
**CRITICAL RULES FOR RESPONSES:**

1. **QUESTIONS** → ALWAYS reply with detailed text answer
   - Examples: "qual o preço?", "como funciona?", "o que é?"
   - NEVER just react with emoji!

2. **REQUESTS FOR INFO** → ALWAYS reply with the requested information
   - Examples: "me passa o valor", "mostra o preço", "me explica"
   - NEVER just react with emoji!

3. **COMMANDS** → ALWAYS execute and reply with result
   - Examples: "!help", "@bot", "/command"
   - NEVER just react with emoji!

4. **ONLY REACT** with emoji when:
   - Simple acknowledgments: "ok", "valeu", "obrigado"
   - Casual statements that don't need response: "legal", "show"
   - Message is NOT a question, request, or command

**EXAMPLES:**

User: "qual o preço do bitcoin?"
Bot: [MUST REPLY] "O Bitcoin está cotado em $67,050 USD agora..."
❌ WRONG: REACT:👍

User: "me passa o valor"
Bot: [MUST REPLY] "O valor atual é..."
❌ WRONG: REACT:👍

User: "valeu!"
Bot: [CAN REACT] REACT:👍
✅ CORRECT

User: "show"
Bot: [CAN REACT] REACT:🔥
✅ CORRECT

**REMEMBER:** When in doubt, REPLY with text! It's better to over-respond than under-respond.
`;
}

/**
 * Enhanced parseAgentResponse with validation
 */
export function validateAgentDecision(
  userMessage: string,
  agentResponse: string
): {
  valid: boolean;
  correctedResponse?: string;
  reason?: string;
} {
  const analysis = analyzeMessage(userMessage);
  
  // If agent tried to react to a question/request
  if (agentResponse.startsWith('REACT:') && analysis.needsDetailedResponse) {
    return {
      valid: false,
      correctedResponse: undefined, // Force re-generation
      reason: `Cannot react to ${
        analysis.isQuestion ? 'question' : 
        analysis.isRequest ? 'request' : 
        'command'
      }. Must provide text response.`
    };
  }
  
  // Response is valid
  return { valid: true };
}
