# 1. Violações da fundação (tenant-gateway + Neon + Better-Auth)

A fundação exige: **SPA React 19 + Vite** falando **só com o tenant-gateway** via `db.table('<x>')` (`GET/POST/PATCH/DELETE /data/:table`), Better-Auth, `owner_id text references "user"(id)`, **sem RLS**, sem backend próprio, sem realtime, sem get-by-id, sem joins ricos.

Abaixo, cada violação, onde ela aparece e **por que precisa mudar**.

## 1.1. Uso direto do Supabase no browser (❌ proibido — §B3)

**Arquivos:**
- `src/integrations/supabase/client.ts` (cliente `@supabase/supabase-js`)
- `src/integrations/supabase/types.ts`
- Todas as classes em `src/infrastructure/supabase/**` (17 arquivos): `SupabaseTicketRepository`, `SupabaseTicketMessageRepository`, `SupabaseCustomerRepository`, `SupabaseProfileRepository`, `SupabaseSettingsRepository`, `SupabaseAuthService`, `SupabaseStorageService`, etc.
- `.env` com `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.

**Por que remover:** o guia é explícito — "**NUNCA `@supabase`, fetch cru pro banco, ou driver SQL no browser**". A fundação usa Neon atrás do gateway; o app só deve falar com o gateway via `db`/`auth` de `src/lib/data/client.ts`.

**Como fica:** todo repositório vira um `*.repo.ts` fininho em `src/lib/data/`, tipo:
```ts
// src/lib/data/tickets.repo.ts
import { db } from './client';
import type { Database } from './types.gen';
export type Ticket = Database['public']['Tables']['tickets']['Row'];
export const listTickets = () => db.table<Ticket>('tickets').list();
export const createTicket = (i: Partial<Ticket>) => db.table<Ticket>('tickets').create(i);
export const updateTicket = (id: string, p: Partial<Ticket>) => db.table<Ticket>('tickets').update(id, p);
export const deleteTicket = (id: string) => db.table<Ticket>('tickets').remove(id);
```

## 1.2. RLS habilitado em todas as tabelas (❌ proibido — §B4.2)

**Onde:** ~46 ocorrências de `enable row level security` / `create policy` em `supabase/migrations/*.sql`.

**Por que remover:** o guia diz "**SEM RLS, SEM `auth.uid()`, SEM `custom_access_token_hook`, SEM tabela `profiles`. Autorização é no gateway.**" O Neon do tenant não tem `auth.users`; a autz é feita pelo gateway (app-layer) filtrando por `owner_id` a partir da sessão Better-Auth.

**Como fica:** o novo `supabase/migrations/0001_business_schema.sql` (poderia ser renomeado `neon/migrations/`) tem apenas `create table` + índices + `owner_id text references "user"(id)`. Zero policy. Ver `06-schema-alvo.md`.

## 1.3. Tabela `profiles` com `role` (❌ proibido — §B4.4)

**Onde:** `profiles` no schema, `src/domain/identity/entities/Profile.ts`, funções `has_role()` e `get_my_role()` em Postgres.

**Por que remover:** o guia proíbe explicitamente `profiles` — o Better-Auth já mantém `"user"` no gateway. Papéis são gerenciados pelo gateway (**admin / manager / rep**, 1º usuário do tenant vira admin automaticamente).

**Como fica:** a UI lê `auth.me()` → `{ user, role }` de `src/lib/auth.tsx` (herdado do scaffold). Nada mais.

## 1.4. 26 Edge Functions (❌ sem backend por app — §B1)

**Onde:** `supabase/functions/*` — 26 funções.

**Por que remover:** "**NÃO existe backend por app. O backend de TODOS os apps é o tenant-gateway.**" Edge Functions são backend por-app. Se alguma lógica não couber no CRUD genérico, ela precisa virar **rota explícita no gateway** (extensão), o que **está fora** do escopo pedido (CRUD puro).

No caso do usuário, **nenhuma** dessas funções sobrevive:
- IA (7 funções): vide `02-remover-ia.md`.
- E-mail/Zendesk/CSAT (8 funções): vide `03-remover-email.md`.
- SLA/notificações/chat/anexos (11 funções): vide `04-remover-features-fora-de-escopo.md`.

## 1.5. Realtime do Supabase (❌ fora da fundação — §A3)

**Onde:** `src/infrastructure/realtime/MessagesRealtimeService.ts`, `TicketsRealtimeService.ts`, `src/presentation/context/RealtimeContext.tsx`, `src/pages/ClientChat.tsx`.

**Por que remover:** o guia lista realtime como "**PRECISA ESTENDER A FUNDAÇÃO — WebSocket no gateway**". Não é template.

**Como fica:** a UI faz **polling ou refetch em ação** (React Query `invalidate`). Suficiente para um Help Desk CRUD.

## 1.6. Get-by-id e joins ricos (❌ limitação do modo genérico — §B5)

**Onde:** `SupabaseTicketRepository.findById`, `GetTicketDetailUseCase`, `TicketDetail.tsx` (busca por `:id`), joins de `customer_id`, `assigned_agent_id`, `tags`, etc.

**Por que ajustar:** o modo genérico do gateway só oferece `list/create/update/remove`. "**NÃO há get-by-id nem filtro por query.**" Telas devem fazer **list-then-find no front**.

**Como fica:**
```ts
const tickets = await listTickets();
const ticket = tickets.find(t => t.id === id);
```
E relações resolvidas com **2 queries** no front (`listCustomers()` + `Map<id, customer>`), sem esperar join do banco.

## 1.7. Storage do Supabase (❌ mídia pesada — §A3)

**Onde:** `SupabaseStorageService`, bucket para anexos, uploads no `MessageComposer` e `useLiveChatUpload`.

**Por que remover:** "**Processamento de arquivo / mídia / storage pesado**" é extensão de fundação. E, no fluxo pedido, **nenhum anexo é necessário** — a conversa acontece por WhatsApp fora da plataforma.

## 1.8. Estrutura "Clean Architecture" pesada

**Onde:** `src/domain/**`, `src/application/**`, `src/infrastructure/**`, `src/presentation/**` (~80 arquivos).

**Por que simplificar:** os scaffolds oficiais (`forms-nps`, `wiki`) usam uma pasta simples: `src/screens/`, `src/components/`, `src/lib/data/*.repo.ts`. A camada de "use cases", "entities" e "repositories abstratas" é **overkill** para um CRUD que fala com `db.table()`. Não é proibido pela fundação, mas conflita com o padrão do editor por IA (que espera `allow: ['src/screens/**', 'src/components/**', 'src/lib/data/*.repo.ts', ...]` no `masi.template.json`).

**Como fica:** achatar em `src/screens/TicketsScreen.tsx`, `TicketDetailScreen.tsx`, `CustomersScreen.tsx`, `LoginScreen.tsx` + repos em `src/lib/data/`.

## 1.9. `masi.template.json` ausente (❌ contrato do template — §B7)

**Onde:** não existe.

**Por que criar:** todo template do hub precisa desse manifest declarando `engine: "vite-react-gateway"`, `envContract: ["VITE_GATEWAY_URL"]`, `roles: ["admin","manager","rep"]`, `screens`, `migrations`, e `editable.allow/protect`. Sem isso, o app não é clonável pelo hub.

## 1.10. Vite/React/TS fora da versão

- Guia pede **React 19 + Vite 6**.
- Projeto usa React 18 + Vite 5 (ver `package.json`).

**Por que atualizar:** compatibilidade com o scaffold, com `Sandpack` do editor IA e com libs esperadas pelo pipeline de publish.

---

### Resumo desta seção

| Violação | Gravidade | Ação |
|---|---|---|
| Supabase no browser | 🔴 bloqueante | Substituir por `db` do gateway |
| RLS / policies / `has_role()` | 🔴 bloqueante | Remover todas |
| Tabela `profiles` | 🔴 bloqueante | Remover, usar Better-Auth |
| 26 Edge Functions | 🔴 bloqueante | Remover todas |
| Realtime | 🟠 alto | Trocar por refetch |
| Get-by-id / joins | 🟠 alto | list-then-find no front |
| Storage | 🟡 médio | Remover (fora do escopo) |
| Clean Arch em 4 camadas | 🟡 médio | Achatar pra `screens/` + `lib/data/` |
| `masi.template.json` ausente | 🔴 bloqueante | Criar |
| React 18 / Vite 5 | 🟡 médio | Subir para 19 / 6 |