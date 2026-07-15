import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  agentId: string;
  name: string;
  isOnline: boolean;
  className?: string;
}

export function AgentAvatar({ name, isOnline, className }: AgentAvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="relative inline-flex">
      <Avatar className={cn('h-8 w-8', className)}>
        <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
      </Avatar>
      {isOnline && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
      )}
    </div>
  );
}
