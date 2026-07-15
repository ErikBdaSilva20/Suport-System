import { useState } from 'react';
import { Plus, MessageSquare, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { KBConversationSummary } from '@/presentation/hooks/knowledge-base/useKBConversations';

interface Props {
  conversations: KBConversationSummary[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

function groupByDate(items: KBConversationSummary[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const sevenDaysAgo = startOfToday - 7 * 86400000;

  const groups: Record<string, KBConversationSummary[]> = {
    Hoje: [], Ontem: [], 'Últimos 7 dias': [], 'Mais antigas': [],
  };
  for (const c of items) {
    const t = new Date(c.updated_at).getTime();
    if (t >= startOfToday) groups['Hoje'].push(c);
    else if (t >= startOfYesterday) groups['Ontem'].push(c);
    else if (t >= sevenDaysAgo) groups['Últimos 7 dias'].push(c);
    else groups['Mais antigas'].push(c);
  }
  return groups;
}

export function ConversationSidebar({
  conversations, loading, activeId, onSelect, onNew, onRename, onDelete,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groups = groupByDate(conversations);

  const startRename = (c: KBConversationSummary) => {
    setRenamingId(c.id);
    setRenameValue(c.title);
  };
  const confirmRename = async () => {
    if (renamingId && renameValue.trim()) {
      await onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-64 shrink-0">
      <div className="p-3 border-b border-border">
        <Button onClick={onNew} className="w-full gap-2" size="sm">
          <Plus className="h-4 w-4" /> Nova conversa
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 px-2">
            Suas conversas aparecerão aqui
          </p>
        )}
        {Object.entries(groups).map(([label, items]) => items.length > 0 && (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1 font-medium">
              {label}
            </p>
            <ul className="space-y-0.5">
              {items.map(c => (
                <li key={c.id} className="group relative">
                  {renamingId === c.id ? (
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={confirmRename}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="h-8 text-xs"
                    />
                  ) : (
                    <button
                      onClick={() => onSelect(c.id)}
                      className={cn(
                        'w-full text-left text-xs px-2 py-2 rounded-md flex items-center gap-2 transition-colors pr-7',
                        activeId === c.id
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      )}
                    >
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </button>
                  )}
                  {renamingId !== c.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => startRename(c)} className="text-xs">
                          <Pencil className="h-3 w-3 mr-2" /> Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingId(c.id)}
                          className="text-xs text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as mensagens desta conversa serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingId) await onDelete(deletingId);
                setDeletingId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
