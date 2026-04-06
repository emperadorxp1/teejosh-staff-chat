'use client';

import type { ChatMessage } from '@/lib/types';

interface Props {
  message: ChatMessage;
}

function renderInlineMarkdown(text: string) {
  const parts: (string | JSX.Element)[] = [];
  const regex = /\*\*(.+?)\*\*|_(.+?)_/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={match.index} className="italic text-gray-400">{match[2]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
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
          {icon}{renderInlineMarkdown(message.content)}
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
