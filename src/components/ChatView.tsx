'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, StaffUser } from '@/lib/types';
import MessageBubble from './MessageBubble';
import ConfirmationCard from './ConfirmationCard';
import QuickActions from './QuickActions';
import CashSessionBanner from './CashSessionBanner';
import VoiceRecorder from './VoiceRecorder';

interface ChatViewProps {
  user: StaffUser;
}

export default function ChatView({ user }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hola ${user.full_name || user.email}! Soy tu asistente de ventas. Escribe o graba un audio para registrar ventas, aperturas, movimientos de caja y mas.`,
      timestamp: new Date(),
      type: 'text',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
  const [cashRefresh, setCashRefresh] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
    ]);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    addMessage({ role: 'user', content: text, type: 'text' });
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data.confirmation) {
        setPendingConfirmation(data.confirmation);
        addMessage({
          role: 'assistant',
          content: '',
          type: 'confirmation',
          confirmationType: data.confirmation.type,
          confirmationData: data.confirmation.data,
        });
      } else if (data.result?.type === 'success') {
        addMessage({ role: 'assistant', content: data.result.message, type: 'success' });
        setCashRefresh((c) => c + 1);
      } else if (data.result?.type === 'error') {
        addMessage({ role: 'assistant', content: data.result.message, type: 'error' });
      } else if (data.result?.type === 'info') {
        addMessage({ role: 'assistant', content: data.result.message, type: 'text' });
      } else {
        addMessage({ role: 'assistant', content: 'No pude entender tu mensaje. Intenta de otra forma.', type: 'error' });
      }
    } catch {
      addMessage({ role: 'assistant', content: 'Error de conexion. Intenta de nuevo.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pendingConfirmation) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingConfirmation),
      });

      const data = await res.json();

      // Remove confirmation message and add result
      setMessages((prev) => prev.filter((m) => m.type !== 'confirmation'));
      setPendingConfirmation(null);

      if (data.success) {
        addMessage({ role: 'assistant', content: data.message, type: 'success' });
        setCashRefresh((c) => c + 1);
      } else {
        addMessage({ role: 'assistant', content: data.error || 'Error al procesar', type: 'error' });
      }
    } catch {
      addMessage({ role: 'assistant', content: 'Error de conexion.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    setMessages((prev) => prev.filter((m) => m.type !== 'confirmation'));
    setPendingConfirmation(null);
    addMessage({ role: 'assistant', content: 'Operacion cancelada.', type: 'text' });
  }

  async function handleVoiceResult(transcription: string) {
    addMessage({ role: 'user', content: `🎤 "${transcription}"`, type: 'text' });
    await sendMessage(transcription);
  }

  function handleQuickAction(msg: string) {
    addMessage({ role: 'assistant', content: msg, type: msg.startsWith('Error') ? 'error' : 'success' });
    setCashRefresh((c) => c + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Header */}
      <header className="flex-shrink-0 bg-surface-50 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TeeJosh POS
          </h1>
          <p className="text-xs text-gray-400">
            {user.full_name || user.email}
            <span className="ml-2 px-1.5 py-0.5 bg-primary/20 text-primary-300 rounded text-[10px] uppercase">
              {user.role}
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Cerrar sesion?')) {
              document.cookie.split(';').forEach((c) => {
                document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/');
              });
              window.location.href = '/login';
            }
          }}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          Salir
        </button>
      </header>

      {/* Cash Session Banner */}
      <CashSessionBanner refreshTrigger={cashRefresh} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) =>
          msg.type === 'confirmation' ? (
            <ConfirmationCard
              key={msg.id}
              type={msg.confirmationType!}
              data={msg.confirmationData}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          ) : (
            <MessageBubble key={msg.id} message={msg} />
          )
        )}
        {isLoading && !pendingConfirmation && (
          <div className="flex gap-1 px-4 py-3">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <QuickActions onAction={handleQuickAction} disabled={isLoading || !!pendingConfirmation} />

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 bg-surface-50 border-t border-gray-800 px-3 py-3 flex items-end gap-2"
      >
        <VoiceRecorder onResult={handleVoiceResult} disabled={isLoading || !!pendingConfirmation} />

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          disabled={isLoading || !!pendingConfirmation}
          rows={1}
          className="flex-1 bg-surface border border-gray-700 rounded-2xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary resize-none max-h-24 disabled:opacity-50"
          style={{ minHeight: '42px' }}
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading || !!pendingConfirmation}
          className="flex-shrink-0 w-10 h-10 bg-primary hover:bg-primary-600 disabled:opacity-30 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}
