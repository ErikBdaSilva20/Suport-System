import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderOpen } from 'lucide-react';
import { useKBArticles } from '@/presentation/hooks/knowledge-base/useKBArticles';
import { getKBCategoryRepository } from '@/infrastructure/registries/knowledge-base';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { KBCategoryProps } from '@/domain/knowledge-base/entities/KBCategory';
import type { KBArticleProps } from '@/domain/knowledge-base/entities/KBArticle';

const statusBadge = (status: string) => {
  switch (status) {
    case 'published': return <Badge className="bg-sla-ok/20 text-sla-ok border-sla-ok/30 text-[10px]">Publicado</Badge>;
    case 'archived': return <Badge className="bg-status-pending/20 text-status-pending border-status-pending/30 text-[10px]">Arquivado</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">Rascunho</Badge>;
  }
};

export default function KBList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState<KBCategoryProps[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const { toast } = useToast();

  const { data: articles, isLoading } = useKBArticles(debouncedSearch ? { search: debouncedSearch } : undefined);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    getKBCategoryRepository().list().then(setCategories);
  }, []);

  const grouped = categories.map(cat => ({
    category: cat,
    articles: articles.filter(a => a.categoryId === cat.id),
  }));

  const uncategorized = articles.filter(a => !categories.some(c => c.id === a.categoryId));

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const slug = newCatName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const created = await getKBCategoryRepository().create({
        name: newCatName.trim(), slug, sortOrder: categories.length, parentId: null,
      });
      setCategories(prev => [...prev, created]);
      setNewCatName('');
      setShowNewCat(false);
      toast({ title: 'Categoria criada' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento Interna</h1>
          <p className="text-sm text-muted-foreground mt-1">{articles.length} artigos · uso exclusivo da equipe</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewCat(true)} className="gap-2">
            <FolderOpen className="h-4 w-4" /> Nova Categoria
          </Button>
          <Button asChild className="gap-2">
            <Link to="/kb/new"><Plus className="h-4 w-4" /> Novo Artigo</Link>
          </Button>
        </div>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar artigos..." className="pl-9 bg-secondary" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-6">
        {grouped.map(({ category, articles: catArticles }) => (
          <div key={category.id}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> {category.name}
              <span className="text-xs font-normal">({catArticles.length})</span>
            </h2>
            {catArticles.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">Nenhum artigo nesta categoria</p>
            ) : (
              <div className="space-y-1">
                {catArticles.map(article => (
                  <ArticleRow key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        ))}
        {uncategorized.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sem Categoria</h2>
            <div className="space-y-1">
              {uncategorized.map(article => (
                <ArticleRow key={article.id} article={article} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
          <Input placeholder="Nome da categoria" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCat(false)}>Cancelar</Button>
            <Button onClick={handleCreateCategory} disabled={!newCatName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArticleRow({ article }: { article: KBArticleProps }) {
  return (
    <Link
      to={`/kb/${article.id}/edit`}
      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/50 group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground group-hover:text-primary truncate">{article.title}</span>
        {statusBadge(article.status)}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{article.viewCount} views</span>
    </Link>
  );
}
