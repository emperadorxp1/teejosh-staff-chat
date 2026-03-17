'use client';

import type { ChatMessage } from '@/lib/types';

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  const bgClass = isUser
    ? 'bg-primary/20 ml-12'
    : message.type === 'success'
      ? 'bg-green-500/10 border border-green-500/20 mr-12'
      : message.type === 'error'
        ? 'bg-red-500/10 border border-red-500/20 mr-12'
        : 'bg-surface-50 mr-12';

  const textClass = message.type === 'success'
    ? 'text-green-300'
    : message.type === 'error'
      ? 'text-red-300'
      : 'text-gray-200';

  const icon = message.type === 'success' ? '✅ ' : message.type === 'error' ? '❌ ' : '';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${bgClass}`}>
        <p className={`text-sm whitespace-pre-wrap break-words ${textClass}`}>
          {icon}{message.content}
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
