import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface Props {
  onDelete: () => void;
  align?: 'left' | 'right';
  className?: string;
}

export function MessageActions({ onDelete, align = 'right', className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Apagar mensagem"
        className={cn(
          'absolute top-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity',
          'rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground',
          'text-muted-foreground p-1 shadow-sm border border-border',
          align === 'right' ? '-left-7' : '-right-7',
          className,
        )}
      >
        <Trash2 className="h-3 w-3" />
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita, deseja realmente apagar essa mensagem?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
