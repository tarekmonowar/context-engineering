import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import initialMessages from './conversation.js'
import { getTotalTokenCount, ChatView, verifyEnv } from './utils.js';
import { splitForSummary, generateSummary } from "./summary.js"

// Verify that environment variables are set
verifyEnv();
// Initialize OpenRouter client with API key
const openRouter = createOpenRouter({ apiKey: process.env.OPENROUTER_KEY });
// Get current model and convert it to AI SDK compatible model
const openRouterModel = openRouter(process.env.MODEL_ID);
// Set maximum token limit for context
const MAX_TOKENS = 20000;

// Get UI Elements
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const chatContainer = document.getElementById("chat-container");
const messagesContainer = document.getElementById("messages-container");

const messages = [...initialMessages];
let contextMessages = [...initialMessages];

const chatView = new ChatView(chatContainer, messagesContainer);

function start() {
  // Display initial conversation
  messages.forEach(message => {
    chatView.addMessage(message);
  });

  // Update initial counters
  chatView.updateCounters(messages, contextMessages);

  // Handle user's message to the AI
  chatForm.addEventListener("submit", handleUserMessage);
  chatView.scrollToBottom();
}

async function handleUserMessage(event) {
  event.preventDefault();

  // Exit if message is empty, otherwise disable input while loading
  const userInput = messageInput.value.trim();
  if (!userInput) return;
  messageInput.value = "";
  disableInputWhileLoading(true);

  // Add user message to both arrays
  const userMessage = { role: "user", content: userInput };
  messages.push(userMessage);
  chatView.addMessage(userMessage);

  contextMessages.push(userMessage);

  // Check if we need a summary
  let contextTokens = getTotalTokenCount(contextMessages);
  if (contextTokens > MAX_TOKENS) {    
    // Summarize context if token limit exceeded
    chatView.addSummarizingIndicator();

    // Set token target to summarize enough messages to get under half the limit
    let tokenTarget = MAX_TOKENS * 0.5
  
    // Split messages into old (to summarize) and recent (to keep)
    const { messagesToSummarize, remainingMessages } = 
    splitForSummary(contextMessages, tokenTarget);
    
    // Generate a Message object with an AI summary of older messages
    const summaryMessage = await generateSummary(messagesToSummarize, openRouterModel);
    
    // Replace context with summary + recent messages
    contextMessages = [ summaryMessage, ...remainingMessages ];
  
    chatView.removeSummarizingIndicator();
    chatView.showSummary(summaryMessage.content);
  }

  // Add assistant message placeholder
  const assistantMessage = { role: "assistant", content: "" };
  messages.push(assistantMessage);
  chatView.addMessage(assistantMessage);

  // Update counters before AI response to show context management
  chatView.updateCounters(messages, contextMessages);
  
  // Try to send user message and stream LLM response, catch any errors
  try {
    const response = await streamText({
      model: openRouterModel,
      messages: contextMessages
    });

    // Update the assistant message as text arrives and check for error events
    // Unlike textStream, fullStream includes error events
    for await (const event of response.fullStream) {
      if (event.type === 'error') {
        throw event.error;
      } else if (event.type === 'text-delta') {
        assistantMessage.content += event.text;
        chatView.updateLatestMessage(assistantMessage.content);
      }
    }

    // Update context messages with the completed assistant response
    contextMessages.push({ role: "assistant", content: assistantMessage.content });

  } catch (err) {
    assistantMessage.content = `**Error:** ${err.message}`;
    chatView.updateLatestMessage(assistantMessage.content);
  }
  
  // Update counters after AI response is complete
  chatView.updateCounters(messages, contextMessages);
  
  disableInputWhileLoading(false);
}

function disableInputWhileLoading(shouldDisable) {
  messageInput.disabled = shouldDisable;
  sendButton.disabled = shouldDisable;
}

// Start the application
start();