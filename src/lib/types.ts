/** OpenRouter's router that picks a free model for each request. */
export const AUTO_MODEL = 'openrouter/free';

export type ErrorKind =
  | 'auth'
  | 'credits'
  | 'forbidden'
  | 'model'
  | 'context'
  | 'rate'
  | 'provider'
  | 'network'
  | 'empty'
  | 'unknown';

export interface ChatError {
  kind: ErrorKind;
  message: string;
  status?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  /** The model OpenRouter reports having used (assistant messages only). */
  model?: string;
  error?: ChatError;
  stopped?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  /** AUTO_MODEL, or a ":free" model id chosen by the user. */
  model: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength?: number;
}

export interface ApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
