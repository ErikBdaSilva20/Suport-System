import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Globe, ImagePlus, AlertTriangle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { getKBArticleRepository, getKBCategoryRepository } from '@/infrastructure/registries/knowledge-base';
import { useAuth } from '@/presentation/hooks/identity/useAuth';
import { useKBUpload } from '@/presentation/hooks/knowledge-base/useKBUpload';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { KBCategoryProps } from '@/domain/knowledge-base/entities/KBCategory';

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

const ZENDESK_ATTACHMENT_RE = /https?:\/\/[^\s)]*zendesk\.com\/attachments\/[^\s)]+/gi;

export default function KBEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { upload, uploading } = useKBUpload(id);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [categories, setCategories] = useState<KBCategoryProps[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getKBCategoryRepository().list().then(setCategories); }, []);

  useEffect(() => {
    if (!id) return;
    getKBArticleRepository().findById(id).then(article => {
      if (!article) { navigate('/kb'); return; }
      const p = article.toPlainObject();
      setTitle(p.title);
      setSlug(p.slug);
      setContent(p.content);
      setCategoryId(p.categoryId);
      setIsPublic(p.isPublic);
      setLoading(false);
    });
  }, [id, navigate]);

  useEffect(() => {
    if (isNew && slug === '') setSlug(slugify(title));
  }, [title, isNew, slug]);

  const zendeskWarnings = useMemo(() => {
    const matches = content.match(ZENDESK_ATTACHMENT_RE);
    return matches ? matches.length : 0;
  }, [content]);

  const getTextarea = (): HTMLTextAreaElement | null => {
    return editorWrapperRef.current?.querySelector('textarea') ?? null;
  };

  const insertAtCursor = (text: string) => {
    const ta = getTextarea();
    if (!ta) { setContent(prev => prev + text); return; }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    // restore cursor after insertion
    requestAnimationFrame(() => {
      const t = getTextarea();
      if (t) {
        const pos = start + text.length;
        t.focus();
        t.setSelectionRange(pos, pos);
      }
    });
  };

  const replaceInContent = (needle: string, replacement: string) => {
    setContent(prev => prev.replace(needle, replacement));
  };

  const handleUpload = async (file: File) => {
    const placeholderId = Math.random().toString(36).slice(2, 8);
    const placeholder = `![enviando-${placeholderId}...]()`;
    insertAtCursor(placeholder + '\n');
    const result = await upload(file);
    if (result) {
      replaceInContent(placeholder, `![${result.name}](${result.url})`);
    } else {
      replaceInContent(placeholder + '\n', '');
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleUpload(file);
          return;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (images.length === 0) return;
    e.preventDefault();
    images.forEach(handleUpload);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer?.items ?? []).some(i => i.kind === 'file')) {
      e.preventDefault();
    }
  };

  const handleSave = async (publish = false) => {
    if (!title.trim() || !categoryId) {
      toast({ title: 'Preencha título e categoria', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const repo = getKBArticleRepository();
      if (isNew) {
        const article = await repo.create({
          title, slug: slug || slugify(title), content, categoryId,
          authorId: profile?.id ?? '', isPublic, status: publish ? 'published' : 'draft',
          viewCount: 0, lastEditedBy: null,
        });
        toast({ title: publish ? 'Artigo publicado' : 'Rascunho salvo' });
        navigate(`/kb/${article.id}/edit`);
      } else {
        await repo.update(id!, { title, slug, content, categoryId, isPublic, lastEditedBy: profile?.id });
        if (publish) await repo.publish(id!, profile?.id ?? '');
        toast({ title: publish ? 'Artigo publicado' : 'Alterações salvas' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/kb"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{isNew ? 'Novo Artigo' : 'Editar Artigo'}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" /> Salvar Rascunho
          </Button>
          {(profile?.role === 'admin' || profile?.role === 'agent') && (
            <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2">
              <Globe className="h-4 w-4" /> Publicar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do artigo" />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug-do-artigo" />
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <Label>Categoria</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Artigos da base são internos — visíveis apenas para a equipe.</p>
      </div>

      {zendeskWarnings > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Detectei <strong>{zendeskWarnings}</strong> link(s) de imagem do Zendesk no conteúdo — essas URLs são privadas e <strong>não vão carregar</strong> para outros usuários. Baixe os prints originais e cole-os (Ctrl+V) ou arraste para dentro do editor abaixo para reanexar.
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Anexar imagem
        </Button>
        <span className="text-xs text-muted-foreground">
          Ou cole (Ctrl+V) / arraste imagens direto no editor. Máx 10MB.
        </span>
      </div>

      <div
        ref={editorWrapperRef}
        data-color-mode="dark"
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <MDEditor
          value={content}
          onChange={(val) => setContent(val ?? '')}
          height={500}
          preview="live"
        />
      </div>
    </div>
  );
}
