import type { Role } from '@/lib/data/client';
import { listFeedback } from '@/lib/data/feedback.repo';
import { listTickets } from '@/lib/data/tickets.repo';
import { useCallback, useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 30_000;
const SEEN_STORAGE_KEY = 'hd_seen_tickets';

function getSeenTicketIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

// Marca um ticket como "espiado" pelo admin/manager atual. Só suprime o
// destaque enquanto o ticket continuar `open` — a contagem em si sempre
// depende do status real.
export function markTicketSeen(id: string): void {
  const seen = getSeenTicketIds();
  if (seen.has(id)) return;
  seen.add(id);
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // localStorage indisponível (modo privado/quota) — badge só perde a supressão local
  }
}

// Contagem de tickets `open` ainda não vistos individualmente, para o sino de
// notificação do header. Poll simples (sem WebSocket/realtime, NFR7) — refetch
// no mount, a cada POLL_INTERVAL_MS e quando a aba recupera o foco.
// `null` enquanto a primeira resposta não chega (evita "flash" de 0 no header).
// Pra admin, soma também feedback `channel='urgent'` `status='open'` — manager
// não tem acesso ao canal urgente, então não entra na conta (nem tenta buscar:
// o gateway já filtraria, mas evita o request à toa). Diferente de tickets,
// feedback não tem um "espiado" próprio: os cards de /feedback já mostram a
// mensagem inteira na lista, então a única forma de sair da contagem é o
// admin de fato marcar como lido/resolvido (ação explícita, sem estado
// paralelo em localStorage pra manter em sincronia).
export function useOpenTicketsBadge(enabled: boolean, role: Role | undefined): number | null {
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const tickets = await listTickets();
      const seenTickets = getSeenTicketIds();
      const openTicketsCount = tickets.filter(
        (t) => t.status === 'open' && !seenTickets.has(t.id)
      ).length;

      if (role !== 'admin') {
        setCount(openTicketsCount);
        return;
      }

      const feedbacks = await listFeedback();
      const urgentFeedbackCount = feedbacks.filter(
        (f) => f.channel === 'urgent' && f.status === 'open'
      ).length;
      setCount(openTicketsCount + urgentFeedbackCount);
    } catch {
      // sino é conveniência, não caminho crítico — mantém a última contagem conhecida
    }
  }, [role]);

  useEffect(() => {
    if (!enabled) {
      setCount(null);
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [enabled, refresh]);

  return count;
}
