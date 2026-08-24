// ============================================================================
// RESPONDE — Telegram Bot Integration Service
// Broadcasts tactical dispatches to Telegram Groups/Channels with Inline ACK buttons
// ============================================================================

import { Incident } from '@/types/database';

export interface TelegramConfig {
  botToken?: string;
  defaultChatId?: string; // Group ID or Channel ID (e.g. -100xxxxxxxxxx)
}

export class TelegramService {
  private static getBotToken(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN;
  }

  private static getDefaultChatId(): string | undefined {
    return process.env.TELEGRAM_CHAT_ID;
  }

  /**
   * Sends a tactical emergency alert with interactive inline buttons to Telegram.
   */
  static async sendDispatchAlert(
    incident: {
      incident_number: string;
      location_name: string;
      address: string;
      description: string;
      priority: string;
      protocol_name?: string;
      units_dispatched?: string[];
    },
    targetChatId?: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const token = this.getBotToken();
    const chatId = targetChatId || this.getDefaultChatId();

    if (!token || !chatId) {
      console.log('[TelegramService] Telegram bot token or chat ID not configured, skipping.');
      return { success: false, error: 'TELEGRAM_NOT_CONFIGURED' };
    }

    const priorityEmoji = incident.priority === 'P1' ? '🔴' : incident.priority === 'P2' ? '🟠' : '🟡';
    const unitsText = incident.units_dispatched && incident.units_dispatched.length > 0
      ? incident.units_dispatched.map((u) => `🚒 *[${u}]*`).join(' ')
      : '🚒 *B-1* 🚒 *Q-4*';

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(incident.address)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://responde.vercel.app';
    const responderUrl = `${appUrl}/responder`;

    const messageText = `
🚨 *¡DESPACHO DE EMERGENCIA ACTIVO!* 🚨
${priorityEmoji} *PRIORIDAD:* ${incident.priority} • *INCIDENTE:* \`${incident.incident_number}\`

🔥 *TIPO:* ${incident.protocol_name || 'Incendio / Rescate'}
📍 *DIRECCIÓN:* ${incident.address}
🏢 *REFERENCIA:* ${incident.location_name}
📝 *DETALLE:* ${incident.description}

🚒 *MATERIAL MAYOR DESPACHADO:*
${unitsText}

⏰ *HORA:* ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
━━━━━━━━━━━━━━━━━━━━━
_Confirma tu asistencia con los botones inferiores:_
`.trim();

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '🟢 VOY AL CUARTEL (ACK)', callback_data: `ack:${incident.incident_number}` },
          { text: '🔴 NO DISPONIBLE', callback_data: `dec:${incident.incident_number}` },
        ],
        [
          { text: '📍 ABRIR MAPA GPS', url: mapsUrl },
          { text: '📟 ABRIR PAGER MÓVIL', url: responderUrl },
        ],
      ],
    };

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        console.error('[TelegramService] Telegram API error:', data);
        return { success: false, error: data.description || 'API_ERROR' };
      }

      return { success: true, messageId: data.result.message_id };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown network error';
      console.error('[TelegramService] Fetch exception:', err);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Sends a test ping message to verify Telegram Bot configuration.
   */
  static async sendTestMessage(token: string, chatId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🟢 *RESPONDE — Test de Conexión Exitoso*\n\nEl sistema de despacho y avisos de emergencias está enlazado correctamente con este chat de Telegram.\n\n⏰ *Fecha/Hora:* ${new Date().toLocaleString('es-CL')}`,
          parse_mode: 'Markdown',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return { success: false, error: data.description || 'Error en credenciales de Telegram' };
      }

      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error de conexión';
      return { success: false, error: errorMsg };
    }
  }
}
