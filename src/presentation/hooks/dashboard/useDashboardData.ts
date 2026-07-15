import { useState, useEffect } from 'react';
import { getTicketRepository } from '@/infrastructure/registries/ticketing';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import { getCSATRepository } from '@/infrastructure/registries/customer-portal';
import { supabase } from '@/integrations/supabase/client';

function formatDuration(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return '0 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 60 * 24) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes - h * 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const d = Math.floor(minutes / (60 * 24));
  const h = Math.round((minutes - d * 60 * 24) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export interface DashboardKPI {
  label: string;
  value: string | number;
  trend?: number;
}

export interface AgentRankingItem {
  agent: { id: string; full_name: string };
  resolved: number;
}

export interface DailyVolume {
  day: string;
  count: number;
}

export interface PriorityDistribution {
  priority: string;
  count: number;
}

export function useDashboardData(enabled = true) {
  const [kpis, setKpis] = useState<Record<string, DashboardKPI> | null>(null);
  const [agentRanking, setAgentRanking] = useState<AgentRankingItem[]>([]);
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<PriorityDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) { setIsLoading(false); return; }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const ticketRepo = getTicketRepository();
        const statusCounts = await ticketRepo.countByStatus();

        const openStatuses = ['open', 'pending'];
        const openCount = openStatuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0);
        const unassignedResult = await ticketRepo.list({ assignedAgentId: null, status: openStatuses as any });

        const slaAtRiskResult = await ticketRepo.list({ status: openStatuses as any, pageSize: 1000 });
        const slaAtRisk = slaAtRiskResult.tickets.filter(t => {
          const p = t.toPlainObject();
          return p.slaStatus === 'warning' || p.slaStatus === 'breached';
        }).length;

        const since = new Date();
        since.setDate(since.getDate() - 30);
        const sinceISO = since.toISOString();

        // Avg first response (last 30d)
        const { data: frData } = await supabase
          .from('tickets')
          .select('created_at, first_response_at')
          .not('first_response_at', 'is', null)
          .gte('created_at', sinceISO);
        let avgFRMin = 0;
        if (frData?.length) {
          const total = frData.reduce((sum, r) => {
            const diff = (new Date(r.first_response_at!).getTime() - new Date(r.created_at).getTime()) / 60000;
            return sum + diff;
          }, 0);
          avgFRMin = total / frData.length;
        }

        // First contact resolution (last 30d): resolved/closed tickets with exactly 1 agent public_reply
        const { data: resolvedTickets } = await supabase
          .from('tickets')
          .select('id')
          .in('status', ['resolved'])
          .gte('created_at', sinceISO);
        let fcrPct = 0;
        if (resolvedTickets?.length) {
          const ids = resolvedTickets.map(t => t.id);
          const { data: msgs } = await supabase
            .from('ticket_messages')
            .select('ticket_id')
            .in('ticket_id', ids)
            .eq('sender_type', 'agent')
            .eq('message_type', 'public_reply');
          const counts = new Map<string, number>();
          (msgs ?? []).forEach(m => counts.set(m.ticket_id, (counts.get(m.ticket_id) ?? 0) + 1));
          const fcrCount = ids.filter(id => counts.get(id) === 1).length;
          fcrPct = (fcrCount / resolvedTickets.length) * 100;
        }

        // Avg CSAT (last 30d)
        const avgCSAT = await getCSATRepository().avgRating(since);

        setKpis({
          openTickets: { value: openCount, label: 'Tickets Abertos' },
          slaAtRisk: { value: slaAtRisk, label: 'SLA em Risco' },
          avgFirstResponse: { value: formatDuration(avgFRMin), label: 'Tempo Médio 1ª Resp.' },
          avgCSAT: { value: avgCSAT.toFixed(1), label: 'CSAT Médio' },
          firstContactResolution: { value: `${Math.round(fcrPct)}%`, label: 'Resolução 1º Contato' },
          unassigned: { value: unassignedResult.total, label: 'Não Atribuídos' },
        });

        // Agent ranking
        const resolvedResult = await ticketRepo.list({ status: ['resolved'] as any, pageSize: 1000 });
        const agentCounts = new Map<string, number>();
        resolvedResult.tickets.forEach(t => {
          const agentId = t.toPlainObject().assignedAgentId;
          if (agentId) agentCounts.set(agentId, (agentCounts.get(agentId) ?? 0) + 1);
        });

        const profileRepo = getProfileRepository();
        const ranking: AgentRankingItem[] = [];
        const sorted = [...agentCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        for (const [agentId, count] of sorted) {
          const profile = await profileRepo.findById(agentId);
          if (profile) {
            ranking.push({ agent: { id: agentId, full_name: profile.toPlainObject().fullName }, resolved: count });
          }
        }
        setAgentRanking(ranking);

        // Daily volume (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: volumeData } = await supabase
          .from('tickets')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString());

        const dayCounts = new Map<string, number>();
        // Fill all 30 days
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dayCounts.set(d.toISOString().slice(0, 10), 0);
        }
        (volumeData ?? []).forEach(r => {
          const day = r.created_at.slice(0, 10);
          dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
        });
        setDailyVolume([...dayCounts.entries()].map(([day, count]) => ({ day, count })));

        // Priority distribution
        const { data: prioData } = await supabase.from('tickets').select('priority');
        const prioCounts = new Map<string, number>();
        (prioData ?? []).forEach(r => {
          prioCounts.set(r.priority, (prioCounts.get(r.priority) ?? 0) + 1);
        });
        setPriorityDistribution(
          ['urgent', 'high', 'medium', 'low'].map(p => ({ priority: p, count: prioCounts.get(p) ?? 0 }))
        );
      } catch (e) {
        console.error('Dashboard data fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [enabled]);

  return { kpis, agentRanking, dailyVolume, priorityDistribution, isLoading };
}
