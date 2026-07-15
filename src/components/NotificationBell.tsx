import { Bell, MessageSquare, UserPlus, Sparkles, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, type Notification } from '@/presentation/hooks/notifications/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ICONS: Record<string, typeof Bell> = {
  ticket_assigned: UserPlus,
  new_message: MessageSquare,
  ai_suggestion: Sparkles,
};

function NotificationItem({ n, onClick }: { n: Notification; onClick: () => void }) {
  const Icon = ICONS[n.type] ?? Bell;
  const unread = !n.read_at;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 flex gap-3 items-start hover:bg-secondary transition-colors border-b border-border last:border-b-0',
        unread && 'bg-primary/5'
      )}
    >
      <div className={cn('mt-0.5 rounded-md p-1.5', unread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm truncate', unread ? 'font-semibold text-foreground' : 'text-foreground')}>{n.title}</p>
          {unread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
        </div>
        {n.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>}
        <p className="text-[11px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleClick = (n: Notification) => {
    if (!n.read_at) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs">
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação ainda</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Avisaremos por aqui quando algo precisar de atenção.</p>
            </div>
          ) : (
            notifications.map(n => <NotificationItem key={n.id} n={n} onClick={() => handleClick(n)} />)
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
