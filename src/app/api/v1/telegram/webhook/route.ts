import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // Handle Callback Queries (Button clicks: ACK / DECLINE)
    if (update.callback_query && token) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data; // e.g. "ack:EMG-2026-000184"
      const fromUser = callbackQuery.from;
      const responderName = fromUser.first_name + (fromUser.last_name ? ` ${fromUser.last_name}` : '');
      const callbackQueryId = callbackQuery.id;

      let alertText = '';
      if (callbackData?.startsWith('ack:')) {
        const incNum = callbackData.replace('ack:', '');
        alertText = `✅ ¡Respuesta confirmada! Central informada de tu asistencia para ${incNum}.`;
      } else if (callbackData?.startsWith('dec:')) {
        const incNum = callbackData.replace('dec:', '');
        alertText = `🔴 No disponible registrado para ${incNum}.`;
      }

      // 1. Answer Callback Query popup in Telegram
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: alertText,
          show_alert: true,
        }),
      });

      // 2. Post a confirmation note in the chat
      if (callbackQuery.message?.chat?.id && callbackData?.startsWith('ack:')) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: callbackQuery.message.chat.id,
            text: `🚒 *CONFIRMACIÓN ACK:* *${responderName}* va en camino al cuartel.`,
            parse_mode: 'Markdown',
          }),
        });
      }

      return NextResponse.json({ ok: true });
    }

    // Handle Text Commands (e.g. /start, /status)
    if (update.message?.text && token) {
      const text = update.message.text.trim();
      const chatId = update.message.chat.id;

      if (text === '/start' || text === '/help') {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🚨 *RESPONDE — Bot de Despacho y Avisos*\n\nEste bot envía automáticamente las alertas de despacho, ubicación y botones de respuesta para los respondedores de emergencia.\n\n*Tu Chat ID es:* \`${chatId}\`\n\n_Copia este Chat ID y pégalo en la configuración de la app RESPONDE._`,
            parse_mode: 'Markdown',
          }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[Telegram Webhook Error]:', err);
    return NextResponse.json({ ok: true });
  }
}
