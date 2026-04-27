import { getTotalTokenCount, getMessageTokenCount } from "./utils.js";
import { generateText } from 'ai';

/**
 * Context Summarization Challenge
 * 
 * Your task is to implement the two functions splitForSummary
 * and generateSummary below.
 * 
 * Available utilities:
 * - getTotalTokenCount(messages) -> total token count for a messages array
 * - getMessageTokenCount(message) -> token count for a single message
 *
 * 💡 Check the hints folder if you're stuck.
 */

/**
 * Challenge 1: Implement splitForSummary
 * 
 * This function's goal is to split the `messages` array into two parts:
 * 
 * - messagesToSummarize: older messages that need to be summarized
 * - remainingMessages: recent messages to keep as-is
 * 
 * You need to find the "split point" (an index) where the number of
 * tokens in remainingMessages is within the tokenTarget.
 * 
 * 
 * (Total Tokens = 20,000)
 * [ M1, M2, M3, M4, M5, M6, M7 ]
 *
 * [ M1, M2, M3 ]  [ M4, M5, M6, M7 ]
 * ^               ^
 * To Summarize    To Keep (<= 10,000 tokens)
 * 
 * LOOP 1: (20,000 > 10,000 is true)
 * - We are at splitIndex 0.
 * - Subtract M1's tokens. remainingTokens = 17,000
 * 
 * [ M̶1̶ ][ M2 ][ M3 ][ M4 ][ M5 ][ M6 ][ M7 ]
 *       ^splitIndex = 1
 * 
 * LOOP 2: (17,000 > 10,000 is true)
 * - We are at splitIndex 1.
 * - Subtract M2's tokens. remainingTokens = 13,000
 * 
 * [ M̶1̶ ][ M̶2̶ ][ M3 ][ M4 ][ M5 ][ M6 ][ M7 ]
 *            ^splitIndex = 2
 * 
 * LOOP 3: (13,000 > 10,000 is true)
 * - We are at splitIndex 2.
 * - Subtract M3's tokens. remainingTokens = 9,500
 * 
 * [ M̶1̶ ][ M̶2̶ ][ M̶3̶ ][ M4 ][ M5 ][ M6 ][ M7 ]
 *                   ^splitIndex = 3
 * 
 * LOOP 4: (9,500 > 10,000 is false)
 * STOP
 *
 * The final 'splitIndex' is 3.
 * 
 */
export function splitForSummary(messages, tokenTarget) {
  let remainingTokens = getTotalTokenCount(messages);
  let splitIndex = 0;

  while (remainingTokens > tokenTarget && splitIndex < messages.length - 1) {
    remainingTokens -= getMessageTokenCount(messages[splitIndex]);
    splitIndex++;
  }

  const messagesToSummarize = messages.slice(0, splitIndex);
  const remainingMessages = messages.slice(splitIndex);
  
  return {
    messagesToSummarize,
    remainingMessages
  };
}

/**
 * Challenge 2: Implement generateSummary
 * 
 * This function takes an array of messages and uses the AI model
 * to create a condensed summary.
 * 
 * Remember, you must add a new message to the array to explicitly
 * ask the AI to create a summary.
 * 
 * Return a final message object containing the summary.
 */
export async function generateSummary(messages, model) {
  const summaryPrompt = {
    role: 'user',
    content: `Create a summary of the conversation so far to preserve
    important context. Focusing on key user information, important 
    decisions, and technical details that might be referenced later.` 
  }

  const summaryMessages = [ ...messages ];
  summaryMessages.push(summaryPrompt);

  const response = await generateText({
    model,
    system: `You are an expert at summarizing AI conversations to preserve
    important context for future messages. When asked to summarize, do not
    generate any preamble or conclusion. Only output a summary.`,
    messages: summaryMessages
  })

  const summaryContent = response.text

  return { 
    role: "system", 
    content: `${summaryContent}` 
  };
}