import { encode } from "gpt-tokenizer";
import { marked } from "marked";
import DOMPurify from "dompurify";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export function verifyEnv() {
  const hasOpenRouterKey =
    !!process.env.OPENROUTER_KEY || !!process.env.OPENROUTER_API_KEY;

  if (!hasOpenRouterKey) {
    console.error(
      "❌ OPENROUTER_KEY or OPENROUTER_API_KEY env variable is not set",
    );
  }
  if (!process.env.MODEL_ID) {
    console.error("❌ MODEL_ID env variable is not set");
  }
  if (hasOpenRouterKey && process.env.MODEL_ID) {
    console.log("✅ OpenRouter key and MODEL_ID env variables are set");
  }
}

export function getTotalTokenCount(messages: ChatMessage[]): number {
  // Combine all message content
  const allContent = messages.map((m) => m.content).join();

  // Use gpt-tokenizer to get token count
  const tokensArray = encode(allContent);
  return tokensArray.length;
}

export function getMessageTokenCount(message: ChatMessage): number {
  const tokensArray = encode(message.content);
  return tokensArray.length;
}

export class ChatView {
  chatContainer: HTMLElement;
  messagesContainer: HTMLElement;
  messageCount: number;
  maxMessages: number;
  totalTokensCounter: HTMLElement;
  contextTokensCounter: HTMLElement;
  summaryCard: HTMLElement | null;
  summaryHeader: HTMLElement | null;
  summaryContent: HTMLElement | null;
  summaryToggle: HTMLElement | null;

  constructor(chatContainer: HTMLElement, messagesContainer: HTMLElement) {
    this.chatContainer = chatContainer;
    this.messagesContainer = messagesContainer;
    this.messageCount = 0;
    this.maxMessages = 20;

    // Get counter elements from the chat container
    this.totalTokensCounter = chatContainer.querySelector(
      "#total-tokens-counter",
    ) as HTMLElement;
    this.contextTokensCounter = chatContainer.querySelector(
      "#context-tokens-counter",
    ) as HTMLElement;

    // Get summary card elements
    this.summaryCard = chatContainer.querySelector("#summary-card");
    this.summaryHeader = chatContainer.querySelector("#summary-header");
    this.summaryContent = chatContainer.querySelector("#summary-content");
    this.summaryToggle = chatContainer.querySelector("#summary-toggle");

    // Set up summary card toggle
    if (this.summaryHeader) {
      this.summaryHeader.addEventListener("click", () => this.toggleSummary());
    }
  }

  addMessage(message: ChatMessage): HTMLElement {
    const messageElement = this.createMessageElement(message);
    this.messagesContainer.appendChild(messageElement);
    this.messageCount++;

    this.trimOldMessages();
    this.scrollToBottom();

    return messageElement;
  }

  updateLatestMessage(content: string) {
    const lastMessage = this.messagesContainer.lastElementChild;
    if (lastMessage) {
      const contentDiv = lastMessage.querySelector(".message-content");
      if (contentDiv) {
        contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
      } else {
        // Fallback if no content div exists
        lastMessage.innerHTML = DOMPurify.sanitize(marked.parse(content));
      }
    }
  }

  createMessageElement(message: ChatMessage): HTMLElement {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${message.role}`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    if (message.role === "assistant" && !message.content) {
      // Loading state
      contentDiv.innerHTML = `
        <div class="loading-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      `;
    } else {
      contentDiv.innerHTML = DOMPurify.sanitize(
        marked.parse(message.content || ""),
      );
    }

    messageElement.appendChild(contentDiv);
    return messageElement;
  }

  addSummarizingIndicator() {
    const indicatorElement = document.createElement("div");
    indicatorElement.className = "message system";
    indicatorElement.id = "summarizing-indicator";

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.innerHTML = `
      <div class="loading-indicator">
        <span>Summarizing conversation</span>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    `;

    indicatorElement.appendChild(contentDiv);
    this.messagesContainer.appendChild(indicatorElement);
    this.scrollToBottom();
  }

  removeSummarizingIndicator() {
    const indicator = document.getElementById("summarizing-indicator");
    if (indicator) {
      indicator.remove();
    }
  }

  trimOldMessages() {
    while (this.messagesContainer.children.length > this.maxMessages) {
      this.messagesContainer.removeChild(this.messagesContainer.firstChild);
      this.messageCount--;
    }
  }

  scrollToBottom() {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  updateCounters(
    allMessages: ChatMessage[],
    contextMessages: ChatMessage[] | null = null,
  ) {
    const totalTokens = getTotalTokenCount(allMessages);
    const contextTokens = contextMessages
      ? getTotalTokenCount(contextMessages)
      : totalTokens;

    this.totalTokensCounter.textContent = `${totalTokens} total tokens`;
    this.contextTokensCounter.textContent = `${contextTokens} context tokens`;
  }

  showSummary(summaryContent: string) {
    if (!this.summaryCard) return;

    // Show the card
    this.summaryCard.classList.remove("hidden");

    // Update content with proper markdown rendering
    this.summaryContent.innerHTML = DOMPurify.sanitize(
      marked.parse(summaryContent),
    );

    // Start collapsed - let students click to expand
    this.summaryContent.classList.add("collapsed");
    this.summaryToggle.textContent = "▼";
  }

  toggleSummary() {
    if (!this.summaryContent) return;

    const isCollapsed = this.summaryContent.classList.contains("collapsed");

    if (isCollapsed) {
      this.summaryContent.classList.remove("collapsed");
      this.summaryToggle.textContent = "▲";
    } else {
      this.summaryContent.classList.add("collapsed");
      this.summaryToggle.textContent = "▼";
    }
  }
}
