import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KBSource { id: string; title: string; slug: string; }
export interface KBChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: KBSource[];
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kb-assistant`;

interface UseKBAssistantOptions {
  conversationId?: string | null;
  ticketId?: string | null;
  onConversationCreated?: (id: string, title: string) => void;
}

export function useKBAssistant({ conversationId, ticketId, onConversationCreated }: UseKBAssistantOptions = {}) {
  const [messages, setMessages] = useState<KBChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const currentConvIdRef = useRef<string | null>(conversationId ?? null);

  // Load existing conversation messages when conversationId changes
  useEffect(() => {
    currentConvIdRef.current = conversationId ?? null;
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setIsLoadingHistory(true);
    supabase
      .from('kb_conversation_messages')
      .select('role,content,sources')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const mapped: KBChatMessage[] = (data ?? []).map((m: any) => ({
          role: m.role,
          content: m.content,
          sources: Array.isArray(m.sources) ? m.sources : [],
        }));
        setMessages(mapped);
        setIsLoadingHistory(false);
      });
    return () => { cancelled = true; };
  }, [conversationId]);

  const send = useCallback(async (question: string) => {
    if (!question.trim() || isStreaming) return;
    setError(null);

    const userMsg: KBChatMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      const resp = await fetch(FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question, conversationId: currentConvIdRef.current, ticketId: ticketId ?? null }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errBody.error || `HTTP ${resp.status}`);
      }

      let assistantText = '';
      let assistantSources: KBSource[] = [];
      setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }]);

      const updateLast = (text: string, sources: KBSource[]) => {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: text, sources } : m
        ));
      };

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent: string | null = null;
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);

          if (line === '') { currentEvent = null; continue; }
          if (line.startsWith(':')) continue;

          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { done = true; break; }

          if (currentEvent === 'conversation') {
            try {
              const meta = JSON.parse(payload);
              if (meta.conversationId) {
                const wasNew = !currentConvIdRef.current;
                currentConvIdRef.current = meta.conversationId;
                if (wasNew && onConversationCreated) {
                  onConversationCreated(meta.conversationId, meta.title);
                }
              }
            } catch { /* ignore */ }
            currentEvent = null;
            continue;
          }

          if (currentEvent === 'sources') {
            try {
              assistantSources = JSON.parse(payload);
              updateLast(assistantText, assistantSources);
            } catch { /* ignore */ }
            currentEvent = null;
            continue;
          }

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              updateLast(assistantText, assistantSources);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message);
        setMessages(prev => prev[prev.length - 1]?.role === 'assistant' && prev[prev.length - 1].content === ''
          ? prev.slice(0, -1)
          : prev);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, onConversationCreated, ticketId]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    currentConvIdRef.current = null;
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, isLoadingHistory, error, send, reset };
}
