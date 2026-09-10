/**
 * Channel-agnostic messaging adapter.
 *
 * Q-Not's promise is a WhatsApp-native experience. In v1 we ship a WebAdapter
 * that mimics WhatsApp in the browser. When Meta approves the WhatsApp Business
 * API, we swap in WhatsAppAdapter. Business logic does not change.
 *
 * See DECISIONS.md ADR-001.
 */

export type InboundMessage = {
  channel: "web" | "whatsapp" | "sms";
  from: string; // phone number
  text: string;
  receivedAt: Date;
  raw?: unknown;
};

export type OutboundMessage = {
  channel: "web" | "whatsapp" | "sms";
  to: string; // phone number
  text: string;
  quickReplies?: string[];
  attachments?: Array<{ type: "qr"; payload: string } | { type: "image"; url: string }>;
};

export interface MessageAdapter {
  readonly channel: InboundMessage["channel"];
  /** Turn a channel-specific inbound payload into our standard shape. */
  parseInbound(raw: unknown): InboundMessage;
  /** Send an outbound message on this channel. */
  send(message: OutboundMessage): Promise<{ ok: boolean; providerId?: string }>;
}
