import { NextRequest, NextResponse } from 'next/server';
import { TelegramService } from '@/lib/services/telegram-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const botToken = body.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = body.chatId || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Se requiere botToken y chatId' },
        { status: 400 }
      );
    }

    const result = await TelegramService.sendTestMessage(botToken, chatId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'TELEGRAM_ERROR', message: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Mensaje de prueba enviado a Telegram con éxito' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
  }
}
