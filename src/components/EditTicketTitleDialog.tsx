import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getTicketRepository } from '@/infrastructure/registries/ticketing';

const MAX_LENGTH = 120;

interface EditTicketTitleDialogProps {
  ticketId: string;
  currentSubject: string;
  currentInternalTitle: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditTicketTitleDialog({
  ticketId,
  currentSubject,
  currentInternalTitle,
  open,
  onOpenChange,
  onSaved,
}: EditTicketTitleDialogProps) {
  const { toast } = useToast();
  const [value, setValue] = useState(currentInternalTitle ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(currentInternalTitle ?? '');
    }
  }, [open, currentInternalTitle]);

  const persist = async (nextValue: string | null) => {
    setSaving(true);
    try {
      await getTicketRepository().update(ticketId, { internalTitle: nextValue });
      toast({
        title: nextValue ? 'Título interno atualizado' : 'Título interno removido',
      });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar',
        description: e?.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const trimmed = value.trim();
    persist(trimmed.length > 0 ? trimmed : null);
  };

  const handleClear = () => {
    persist(null);
  };

  const remaining = MAX_LENGTH - value.length;
  const hasInternal = !!currentInternalTitle;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar título interno</DialogTitle>
          <DialogDescription>
            O título interno aparece apenas para a equipe. O assunto original enviado pelo cliente é preservado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assunto original</Label>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border">
              {currentSubject}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="internal-title" className="text-xs text-muted-foreground">
              Título interno
            </Label>
            <Input
              id="internal-title"
              autoFocus
              value={value}
              maxLength={MAX_LENGTH}
              placeholder="Ex.: Bug crítico no checkout"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              disabled={saving}
            />
            <p className="text-[11px] text-muted-foreground text-right">{remaining} caracteres restantes</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {hasInternal && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={saving}
              className="mr-auto text-muted-foreground hover:text-destructive"
            >
              Limpar
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
