import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useTags } from '@/presentation/hooks/settings/useTags';
import { ManageTagsUseCase } from '@/application/settings/ManageTagsUseCase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function TagsSettings() {
  const { data: tags, refetch } = useTags();
  const { toast } = useToast();
  const uc = new ManageTagsUseCase();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6B7280');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await uc.create({ name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor('#6B7280');
      await refetch();
      toast({ title: 'Tag criada' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await uc.update(editId, { name: editName.trim(), color: editColor });
      setEditId(null);
      await refetch();
      toast({ title: 'Tag atualizada' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await uc.delete(deleteId);
      setDeleteId(null);
      await refetch();
      toast({ title: 'Tag removida' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Tags</h2>
        <p className="text-sm text-muted-foreground">Gerencie as tags de classificação de tickets.</p>
      </div>

      {/* Create new tag */}
      <div className="flex items-center gap-2">
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer flex-shrink-0" />
        <Input placeholder="Nova tag..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} className="flex-1" />
        <Button size="sm" onClick={handleCreate} disabled={!newName.trim()} className="gap-1">
          <Plus className="h-4 w-4" /> Criar
        </Button>
      </div>

      {/* Tag list */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center gap-3 px-3 py-2">
            {editId === tag.id ? (
              <>
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="h-6 w-6 rounded cursor-pointer flex-shrink-0" />
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 h-8" onKeyDown={e => e.key === 'Enter' && handleUpdate()} />
                <Button size="icon" variant="ghost" onClick={handleUpdate}><Check className="h-4 w-4 text-sla-ok" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <>
                <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-sm text-foreground flex-1">{tag.name}</span>
                <Button size="icon" variant="ghost" onClick={() => { setEditId(tag.id); setEditName(tag.name); setEditColor(tag.color); }}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(tag.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}
        {tags.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhuma tag criada</p>}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tag?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Tickets com esta tag perderão a associação.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
