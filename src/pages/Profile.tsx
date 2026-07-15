import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { UpdateProfileUseCase } from '@/application/identity/UpdateProfileUseCase';
import { getStorageService } from '@/infrastructure/registries/storage';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordSection } from '@/components/profile/ChangePasswordSection';

export default function Profile() {
  const { profile, refetchProfile } = useAuthContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? '');
      setAvatarUrl(profile.avatarUrl ?? null);
    }
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `avatars/${profile.id}-${Date.now()}.${ext}`;
      const url = await getStorageService().upload('company-assets', path, file);
      setAvatarUrl(url);
      toast({ title: 'Foto carregada', description: 'Clique em Salvar para confirmar.' });
    } catch (err) {
      toast({ title: 'Falha no upload', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await new UpdateProfileUseCase().execute({
        id: profile.id,
        fullName,
        avatarUrl,
      });
      await refetchProfile();
      toast({ title: 'Perfil atualizado' });
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Atualize suas informações pessoais e foto.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:opacity-90 disabled:opacity-50"
                aria-label="Alterar foto"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>JPG, PNG ou WEBP.</p>
              <p>Máximo 5MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={profile.email} disabled />
            <p className="text-xs text-muted-foreground">O e-mail é gerenciado pela autenticação e não pode ser alterado aqui.</p>
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <div>
              <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                {profile.role}
              </Badge>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordSection />
    </div>
  );
}
