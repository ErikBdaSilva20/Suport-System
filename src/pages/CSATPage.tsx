import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SubmitCSATUseCase } from '@/application/customer-portal/SubmitCSATUseCase';
import { getCSATRepository } from '@/infrastructure/registries/customer-portal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle, Loader2 } from 'lucide-react';

type Status = 'loading' | 'ready' | 'submitted' | 'already' | 'notfound';

export default function CSATPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const initialRating = parseInt(searchParams.get('rating') ?? '0', 10);

  const [status, setStatus] = useState<Status>('loading');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('notfound'); return; }
    getCSATRepository().findByToken(token).then((csat) => {
      if (!csat) { setStatus('notfound'); return; }
      if (csat.toPlainObject().submittedAt) { setStatus('already'); return; }
      const validInitial = initialRating >= 1 && initialRating <= 5 ? initialRating : 0;
      setRating(validInitial);
      setStatus('ready');
    }).catch(() => setStatus('notfound'));
  }, [token, initialRating]);

  const handleSubmit = async () => {
    if (!token || rating === 0) return;
    setSubmitting(true);
    try {
      await new SubmitCSATUseCase().execute(token, rating, comment || undefined);
      setStatus('submitted');
    } catch {
      // silent
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        )}

        {status === 'notfound' && (
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Link inválido</h2>
              <p className="text-muted-foreground">Este link de avaliação não é válido ou expirou.</p>
            </CardContent>
          </Card>
        )}

        {(status === 'submitted' || status === 'already') && (
          <Card className="text-center">
            <CardContent className="pt-6 space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-foreground">
                {status === 'submitted' ? 'Obrigado pela sua avaliação!' : 'Você já avaliou este atendimento.'}
              </h2>
              <p className="text-sm text-muted-foreground">Pode fechar esta página.</p>
            </CardContent>
          </Card>
        )}

        {status === 'ready' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Como foi o atendimento?</CardTitle>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground">
                  Você selecionou {rating} {rating === 1 ? 'estrela' : 'estrelas'}. Pode alterar antes de confirmar.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-transform hover:scale-110"
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= (hover || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Quer adicionar um comentário? (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />

              <Button className="w-full" onClick={handleSubmit} disabled={submitting || rating === 0}>
                {submitting ? 'Enviando...' : 'Confirmar avaliação'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
