import { TicketCheck, AlertTriangle, Clock, Star, Target, UserX, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { DashboardKPICard } from '@/components/DashboardKPICard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { useDashboardData } from '@/presentation/hooks/dashboard/useDashboardData';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const kpiIcons: Record<string, React.ReactNode> = {
  openTickets: <TicketCheck className="h-5 w-5" />,
  slaAtRisk: <AlertTriangle className="h-5 w-5" />,
  avgFirstResponse: <Clock className="h-5 w-5" />,
  avgCSAT: <Star className="h-5 w-5" />,
  firstContactResolution: <Target className="h-5 w-5" />,
  unassigned: <UserX className="h-5 w-5" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'hsl(0, 84%, 60%)',
  high: 'hsl(25, 95%, 53%)',
  medium: 'hsl(210, 100%, 56%)',
  low: 'hsl(240, 5%, 50%)',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export default function Dashboard() {
  const { session } = useAuthContext();
  const { kpis, agentRanking, dailyVolume, priorityDistribution, isLoading } = useDashboardData(!!session);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const kpiOrder = ['openTickets', 'slaAtRisk', 'avgFirstResponse', 'avgCSAT', 'firstContactResolution', 'unassigned'];
  const totalPriority = priorityDistribution.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da operação</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis && kpiOrder.map(key => (
          <DashboardKPICard
            key={key}
            icon={kpiIcons[key]}
            label={kpis[key].label}
            value={kpis[key].value}
            trend={kpis[key].trend}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line Chart — Volume 30 days */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-elevation-2">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Volume de Tickets — Últimos 30 dias</h3>
          </div>
          <div className="h-56">
            {dailyVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyVolume}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239,84%,67%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(239,84%,67%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                    interval="preserveStartEnd"
                    stroke="hsl(var(--border))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    stroke="hsl(var(--border))"
                    width={32}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'hsl(var(--foreground))', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                    labelFormatter={(v: string) => new Date(v).toLocaleDateString('pt-BR')}
                    cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(239,84%,67%)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'hsl(239,84%,67%)', stroke: 'hsl(var(--card))', strokeWidth: 2 }} name="Tickets" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground text-sm">Sem dados de tickets nos últimos 30 dias</p>
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart — Priority distribution */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-elevation-2">
          <div className="flex items-center gap-2 mb-5">
            <PieChartIcon className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Distribuição por Prioridade</h3>
          </div>
          {totalPriority > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityDistribution}
                      dataKey="count"
                      nameKey="priority"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={3}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {priorityDistribution.map(d => (
                        <Cell key={d.priority} fill={PRIORITY_COLORS[d.priority]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, color: 'hsl(var(--foreground))', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                      formatter={(value: number, name: string) => [value, PRIORITY_LABELS[name] ?? name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend — outside chart container to avoid clipping */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border">
                {priorityDistribution.map(d => (
                  <div key={d.priority} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PRIORITY_COLORS[d.priority] }} />
                    {PRIORITY_LABELS[d.priority]} ({d.count})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Sem dados de tickets</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-elevation-2">
        <h3 className="text-sm font-semibold text-foreground mb-5">Top 5 Agentes — Tickets Resolvidos</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead className="text-right">Resolvidos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentRanking.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground text-sm">Nenhum dado disponível</TableCell>
              </TableRow>
            ) : agentRanking.map((item, i) => (
              <TableRow key={item.agent.id}>
                <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {item.agent.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">{item.agent.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">{item.resolved}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
