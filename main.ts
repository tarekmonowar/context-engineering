import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import initialMessages from "./conversation";
import {
  getTotalTokenCount,
  ChatView,
  verifyEnv,
  type ChatMessage,
} from "./utils";
import { splitForSummary, generateSummary } from "./summary";

// Verify that environment variables are set
verifyEnv();
const OPENROUTER_API_KEY =
  process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY;
// Initialize OpenRouter client with API key
const openRouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });
// Get current model and convert it to AI SDK compatible model
const openRouterModel = openRouter(process.env.MODEL_ID);
// Set maximum token limit for context
const MAX_TOKENS = 20000;

// Get UI Elements
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const messageInput = document.getElementById(
  "message-input",
) as HTMLInputElement;
const sendButton = document.getElementById("send-button") as HTMLButtonElement;
const chatContainer = document.getElementById("chat-container") as HTMLElement;
const messagesContainer = document.getElementById(
  "messages-container",
) as HTMLElement;

const messages: ChatMessage[] = [...initialMessages];
let contextMessages: ChatMessage[] = [...initialMessages];

const chatView = new ChatView(chatContainer, messagesContainer);

function start() {
  // Display initial conversation
  messages.forEach((message) => {
    chatView.addMessage(message);
  });

  // Update initial counters
  chatView.updateCounters(messages, contextMessages);

  // Handle user's message to the AI
  chatForm.addEventListener("submit", handleUserMessage);
  chatView.scrollToBottom();
}

async function handleUserMessage(event: Event) {
  event.preventDefault();

  // Exit if message is empty, otherwise disable input while loading
  const userInput = messageInput.value.trim();
  if (!userInput) return;
  messageInput.value = "";
  disableInputWhileLoading(true);

  let assistantMessage: ChatMessage | null = null;

  try {
    // Add user message to both arrays
    const userMessage = { role: "user", content: userInput };
    messages.push(userMessage);
    chatView.addMessage(userMessage);

    contextMessages.push(userMessage);

    // Check if we need a summary
    const contextTokens = getTotalTokenCount(contextMessages);
    if (contextTokens > MAX_TOKENS) {
      // Summarize context if token limit exceeded
      chatView.addSummarizingIndicator();

      // Set token target to summarize enough messages to get under half the limit
      const tokenTarget = MAX_TOKENS * 0.5;

      // Split messages into old (to summarize) and recent (to keep)
      const { messagesToSummarize, remainingMessages } = splitForSummary(
        contextMessages,
        tokenTarget,
      );

      // Generate a Message object with an AI summary of older messages
      const summaryMessage = await generateSummary(
        messagesToSummarize,
        openRouterModel,
      );

      // Replace context with summary + recent messages
      contextMessages = [summaryMessage, ...remainingMessages];

      chatView.showSummary(summaryMessage.content);
    }

    // Add assistant message placeholder
    assistantMessage = { role: "assistant", content: "" };
    messages.push(assistantMessage);
    chatView.addMessage(assistantMessage);

    // Update counters before AI response to show context management
    chatView.updateCounters(messages, contextMessages);

    const response = await streamText({
      model: openRouterModel,
      messages: contextMessages,
    });

    // Update the assistant message as text arrives and check for error events
    // Unlike textStream, fullStream includes error events
    for await (const event of response.fullStream) {
      if (event.type === "error") {
        throw event.error;
      } else if (event.type === "text-delta") {
        assistantMessage.content += event.text;
        chatView.updateLatestMessage(assistantMessage.content);
      }
    }

    // Update context messages with the completed assistant response
    contextMessages.push({
      role: "assistant",
      content: assistantMessage.content,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorContent = `**Error:** ${errorMessage}`;

    if (assistantMessage) {
      assistantMessage.content = errorContent;
      chatView.updateLatestMessage(assistantMessage.content);
    } else {
      const fallbackAssistantMessage = {
        role: "assistant",
        content: errorContent,
      };
      messages.push(fallbackAssistantMessage);
      chatView.addMessage(fallbackAssistantMessage);
    }
  } finally {
    chatView.removeSummarizingIndicator();
    chatView.updateCounters(messages, contextMessages);
    disableInputWhileLoading(false);
  }
}

function disableInputWhileLoading(shouldDisable: boolean) {
  messageInput.disabled = shouldDisable;
  sendButton.disabled = shouldDisable;
}

// Start the application
start();
