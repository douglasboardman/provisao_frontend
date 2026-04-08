# ProVisão Frontend — Plano de Implementação

> Documento vivo. Criado em 2026-04-07.
> Complementa `provisao-frontend-design.md` com o plano de execução baseado na revisão do estado real do frontend (React 19 / Vite) e dos endpoints existentes na API (NestJS).

---

## 1. Situação atual (abril/2026)

### 1.1 Stack frontend confirmada
- **UI:** React 19 + Vite + TypeScript + TailwindCSS 4 + Radix UI (componentes já presentes em `src/components/ui`)
- **Roteamento:** `react-router` v7 (BrowserRouter em [main.tsx](../src/main.tsx))
- **Estado do servidor:** `@tanstack/react-query` v5 (QueryClientProvider já está montado, mas ainda não é usado em nenhuma feature)
- **Estado de sessão:** `zustand` + `persist` → [useAuthStore.ts](../src/stores/useAuthStore.ts)
- **Formulários:** `react-hook-form` + `zod` + `@hookform/resolvers`
- **Animações:** `framer-motion`
- **Ícones:** `lucide-react`

### 1.2 Features realmente implementadas

| Feature | Arquivo | Estado |
|---|---|---|
| Login | [features/auth/Login.tsx](../src/features/auth/Login.tsx) | **MOCK** — `setTimeout` + token fake, não chama o backend |
| Dashboard | [features/dashboard/Dashboard.tsx](../src/features/dashboard/Dashboard.tsx) | **MOCK** — cards e tabela com valores hardcoded |
| Pessoas (lista) | [features/pessoas/PessoasList.tsx](../src/features/pessoas/PessoasList.tsx) | **MOCK** — só layout; sem fetch |
| Lançamentos (tabela) | [features/lancamentos/LancamentosTable.tsx](../src/features/lancamentos/LancamentosTable.tsx) | **MOCK** — só layout; sem fetch |

Todas as demais rotas em [App.tsx](../src/App.tsx) renderizam `<PlaceholderView />`.

### 1.3 Lacunas estruturais do frontend
1. **Não existe cliente HTTP.** Não há `lib/api.ts`, axios, nem fetch wrapper. Nenhum request real é feito.
2. **Login é mock.** O token persistido (`mock-jwt-token-12345`) não é aceito pelo backend.
3. **`useAuthStore.User.role` diverge do enum do backend.** O store usa `'ADMIN' | 'GESTOR' | 'TESOUREIRO' | 'OPERADOR' | 'AUDITOR' | 'SECRETARIO'`, mas o enum Prisma atual só tem `ADMINISTRADOR | GESTOR | TESOUREIRO` (`'ADMIN'` ≠ `'ADMINISTRADOR'`). A Sidebar herda o mesmo vocabulário errado.
4. **Sem camada de toast / diálogo de confirmação / tabela reutilizável / paginação.** Já existem `@radix-ui/react-toast` e `@radix-ui/react-dialog` instalados, mas nenhum wrapper foi criado.
5. **Sem `.env`** no frontend → `VITE_API_URL` precisa ser introduzido.

### 1.4 Endpoints disponíveis no backend

Base: configurado via `FRONTEND_URL` no CORS do `main.ts`. Porta padrão `3000`. Todos protegidos por `AuthGuard + RolesGuard` (exceto `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/set-password`).

| Módulo | Rota | Métodos |
|---|---|---|
| Auth | `/auth` | `POST /login`, `POST /register`, `POST /set-password`, `POST /forgot-password`, `GET /profile` |
| Usuários | `/usuarios` | CRUD + `PATCH :id/activate` + `PATCH :id/profile-image` |
| Pessoas | `/pessoas` | CRUD + `PATCH atrib-foto-pessoa/:id` + `PATCH atrib-grupo-familiar/:idPessoa/:idFamilia` |
| Grupos Familiares | `/grupos-familiares` | CRUD |
| Vínculos de Membresia | `/vinculos-membresia` | CRUD |
| Contas | `/contas` | CRUD |
| Categoria Receita | `/cat-receita` | CRUD |
| Categoria Despesa | `/cat-despesa` | CRUD |
| Tipo/Descritivo Receita | `/receitas` | CRUD |
| Tipo/Descritivo Despesa | `/despesas` | CRUD |
| Lançamentos | `/lancamentos` | CRUD + query `?tipo=RECEITA\|DESPESA&conta_id=&page=` |
| Ações | `/acoes` | CRUD |
| Logs | `/logs` | `GET` (somente leitura) |

### 1.5 Gaps do backend que afetam o plano
- Não existe endpoint dedicado para **Balanço Mensal**, **Relatórios de Membresia** nem **Relatórios Financeiros**. A primeira iteração fará agregação client-side em cima de `/lancamentos`, `/pessoas` e `/vinculos-membresia` e sinalizará no código os pontos onde um endpoint agregador do backend será necessário.
- **Dashboard** também depende desses agregados — mesma estratégia.
- Enum `usuarios_perfil` já está expandido no backend para **6 perfis**: `ADMINISTRADOR | GESTOR | TESOUREIRO | OPERADOR | AUDITOR | SECRETARIO` (controllers já usam `ALL_ROLES`). O frontend só precisa renomear `'ADMIN'` → `'ADMINISTRADOR'` no store/sidebar — não há mais lacuna de schema.
- Upload de `comprovante_url` em `/lancamentos`: o controller ainda não expõe multipart/S3. Até confirmar, o campo fica como input de URL (paste manual).

---

## 2. Mapeamento Sidebar → Backend

| Item da Sidebar | Rota FE | Endpoint BE | Observações |
|---|---|---|---|
| Dashboard | `/dashboard` | agregação de `/lancamentos`, `/contas`, `/pessoas` | sem endpoint dedicado |
| **MEMBRESIA** | | | |
| Pessoas | `/pessoas` | `/pessoas` | CRUD + upload foto + grupo |
| Grupos Familiares | `/grupos-familiares` | `/grupos-familiares` | CRUD |
| Vínculos de Membresia | `/vinculos-membresia` | `/vinculos-membresia` | CRUD (FK pessoa) |
| Relatórios (Membresia) | `/relatorios-membresia` | agregação `/pessoas` + `/vinculos-membresia` | client-side |
| **FINANCEIRO** | | | |
| Contas | `/contas` | `/contas` | CRUD |
| Lançamentos | `/lancamentos` | `/lancamentos` | CRUD + filtros |
| Receitas | `/receitas` | `/lancamentos?tipo=RECEITA` | view filtrada — **não** é `/receitas` do backend |
| Despesas | `/despesas` | `/lancamentos?tipo=DESPESA` | view filtrada — **não** é `/despesas` do backend |
| Balanço Mensal | `/balanco-mensal` | agregação `/lancamentos` | client-side |
| Relatórios (Financeiro) | `/relatorios-financeiro` | agregação `/lancamentos` | client-side |
| **CADASTROS** | | | |
| Categoria Receita | `/categoria-receita` | `/cat-receita` | CRUD |
| Categoria Despesa | `/categoria-despesa` | `/cat-despesa` | CRUD |
| Tipo Receita | `/tipo-receita` | `/receitas` (descritivos) | CRUD + FK cat-receita |
| Tipo Despesa | `/tipo-despesa` | `/despesas` (descritivos) | CRUD + FK cat-despesa |
| **ADMINISTRAÇÃO** | | | |
| Ações | `/acoes` | `/acoes` | CRUD |
| Usuários | `/usuarios` | `/usuarios` | CRUD + ativar/desativar + foto |
| Logs | `/logs` | `/logs` | tabela read-only paginada |
| Configurações | `/configuracoes` | — | **IGNORADO** nesta rodada |

> ⚠️ Colisão importante: a palavra "Receitas/Despesas" no backend se refere ao **catálogo de descritivos** (ex.: "Dízimo", "Oferta", "Aluguel"), enquanto na Sidebar do Financeiro ela é uma **view filtrada de lançamentos**. Todo código de feature deve deixar isso explícito nos nomes (`features/lancamentos-receitas`, `features/tipo-receita`, etc.) para evitar ambiguidade.

---

## 3. Fases de implementação

### Fase 0 — Fundação (habilitador de tudo o resto)
Sem isto, nenhuma tela abaixo pode chamar a API real.

1. **Cliente HTTP** — criar `src/lib/api.ts`:
   - `axios.create({ baseURL: import.meta.env.VITE_API_URL })` (adicionar `axios` ao `package.json`) **ou** um `fetch` wrapper tipado se preferir zero-dep.
   - Interceptor de request: injetar `Authorization: Bearer ${token}` a partir do `useAuthStore.getState().token`.
   - Interceptor de response: em `401` → `logout()` + `navigate('/login')`.
2. **Variáveis de ambiente** — criar `.env` e `.env.development` com `VITE_API_URL=http://localhost:3000`. Atualizar `env.d.ts` para tipar `ImportMetaEnv`.
3. **Alinhar enum de perfis** — em [useAuthStore.ts](../src/stores/useAuthStore.ts), trocar `'ADMIN'` por `'ADMINISTRADOR'` (mantendo os 6 perfis: `ADMINISTRADOR | GESTOR | TESOUREIRO | OPERADOR | AUDITOR | SECRETARIO`). Atualizar `navItems.roles` em [Sidebar.tsx](../src/components/layout/Sidebar.tsx) da mesma forma (o item Dashboard e outros hoje usam `"ADMIN"`).
4. **Auth real** — reescrever `onSubmit` do `Login` para `POST /auth/login`, extrair `access_token`, chamar `GET /auth/profile` para hidratar o `user`, persistir no store.
5. **Guarda por role no Sidebar** — passar a respeitar `user.role` real (já tem o `roles: []` em cada item).

### Fase 1 — Fundamentos reutilizáveis
Componentes e hooks que TODAS as features de CRUD vão consumir. Idealmente implementados antes de repetir padrões.

- `components/ui/toast.tsx` + `use-toast.ts` (wrapper Radix)
- `components/ui/dialog.tsx` (já há `@radix-ui/react-dialog`) + `ConfirmDialog`
- `components/ui/select.tsx` (Radix select)
- `components/ui/table.tsx` — wrapper leve (a tabela do `LancamentosTable` pode virar base)
- `components/shared/DataTable.tsx` — tabela paginada com loading/empty states
- `components/shared/AsyncSelect.tsx` — para seletor de FK (Pessoa, Conta, Categoria, etc.)
- `lib/format.ts` — `formatCurrency(value)`, `formatDate(iso)`, `formatCpf`, `formatPhone`
- `lib/masks.ts` — máscaras para CPF, CEP, telefone, moeda
- `hooks/useCrud.ts` (opcional) — abstrai `useQuery`/`useMutation` para `list/create/update/remove` em cima de um recurso

### Fase 2 — Membresia
Dependências: Fase 0 + Fase 1. Ordem interna sugerida:

1. **Grupos Familiares** → CRUD simples, sirva de cobaia do padrão (menor superfície).
2. **Pessoas** → CRUD completo:
   - Lista com busca por nome/CPF, paginação, filtro por grupo.
   - Form de criação/edição com máscara de CPF (validação já existe no backend), select de sexo/estado civil, FK para grupo familiar.
   - Upload de foto via `PATCH /pessoas/atrib-foto-pessoa/:id` (multipart) — reutilizar no detalhe.
   - Página de detalhe `/pessoas/:id` (já existe rota) com abas: dados, vínculos, histórico de lançamentos (query em `/lancamentos?pessoa_id=...` se o backend aceitar — senão, filtrar client-side).
3. **Vínculos de Membresia** → CRUD com `AsyncSelect` de Pessoa, `rol`, `data_admissao`, `forma_admissao`, `vinculo_ativo` (toggle).
4. **Relatórios de Membresia** → página inicial simples: contagem de membros por status, por grupo familiar, lista exportável (CSV client-side). Marcar `TODO: backend endpoint`.

### Fase 3 — Cadastros (desbloqueio de lançamentos)
Estes cadastros precisam estar prontos antes de Contas/Lançamentos porque são FK dentro do form de Lançamento.

1. **Categoria Receita** (`/cat-receita`) — CRUD simples (nome).
2. **Categoria Despesa** (`/cat-despesa`) — CRUD simples (nome).
3. **Tipo Receita** (descritivos em `/receitas`) — CRUD com FK para categoria + flags `requer_pessoa`, `requer_destinacao`, `requer_comprovante`.
4. **Tipo Despesa** (descritivos em `/despesas`) — idem.

### Fase 4 — Financeiro
1. **Contas** (`/contas`) — CRUD; form com `tipo_conta` (enum), `saldo_inicial`, `cor_hex` (color picker), `agencia`, `banco`, `num_conta`.
2. **Lançamentos** (`/lancamentos`) — **coração do sistema**:
   - Lista paginada (o backend já aceita `page`, `tipo`, `conta_id`).
   - Filtros visuais: período, conta, tipo, categoria.
   - Modal de criação com dois modos (Receita / Despesa):
     - Campos condicionais baseados nas flags do Descritivo selecionado (`requer_pessoa` → mostra AsyncSelect de Pessoa; `requer_comprovante` → exige upload, etc.).
     - Seletor de Ação (opcional).
   - Edição/remoção com `ConfirmDialog`.
   - Upload de `comprovante_url` (confirmar endpoint/S3 com o backend — pode não existir ainda).
3. **Receitas** (Sidebar) → reutilizar o componente de lista de Lançamentos com `tipo=RECEITA` pré-filtrado.
4. **Despesas** (Sidebar) → idem com `tipo=DESPESA`.
5. **Balanço Mensal** → página com agregação client-side (`reduce` sobre `/lancamentos` do mês) → cards de receita total, despesa total, saldo, gráfico por categoria. Marcar `TODO: endpoint /lancamentos/balanco?mes=YYYY-MM`.
6. **Relatórios Financeiro** → similar ao balanço, porém com período configurável + export CSV.

### Fase 5 — Administração
1. **Ações** (`/acoes`) — CRUD com FK para Pessoa responsável, Conta, datas, orçamentos.
2. **Usuários** (`/usuarios`) — CRUD + `PATCH :id/activate` (toggle) + `PATCH :id/profile-image` + fluxo de `POST /auth/set-password` (gera link para novo usuário).
3. **Logs** (`/logs`) — tabela read-only paginada ordenada por data desc; filtros por `usuario_id`, `tabela_afetada`, `acao`.
4. **Dashboard real** — substituir cards mockados por `useQuery`:
   - Total de membros ativos (`/vinculos-membresia?ativo=true`)
   - Saldo consolidado (somar `/contas.saldo_inicial + Σ lançamentos`)
   - Receitas / Despesas do mês corrente
   - Últimos 5 lançamentos (`/lancamentos?page=1` com `limit=5`)
   - Mesmos `TODO:` do balanço para eventual endpoint agregador.

### Fase 6 — Polimento
- Estados de loading / empty / erro consistentes.
- Skeletons nos cards do dashboard e nas tabelas.
- Revisão de acessibilidade (labels nos Radix, contrastes).
- Revisão final dos `@Roles` do backend vs `roles` da Sidebar.

---

## 4. Padrão técnico por feature de CRUD

Para manter consistência, **toda feature** segue a mesma estrutura de pasta:

```
src/features/<recurso>/
  <Recurso>List.tsx        // página de listagem
  <Recurso>Form.tsx        // form de criar/editar (usado em modal ou página)
  <Recurso>Detail.tsx      // opcional (ex.: Pessoa)
  api.ts                   // funções: list, get, create, update, remove
  hooks.ts                 // useQuery/useMutation encapsulando api.ts
  types.ts                 // tipos TS espelhando DTOs do backend
  schema.ts                // zod schema do form (mirror do DTO do backend)
```

- Todas as mutações invalidam `queryClient.invalidateQueries({ queryKey: ['<recurso>'] })`.
- Toda chamada passa pelo cliente central `lib/api.ts`.
- Schemas Zod do form **devem** espelhar os Zod schemas do backend (`nestjs-zod`). Quando viável, considerar um pacote compartilhado `@provisao/shared-schemas` — mas nesta rodada replique manualmente.

---

## 5. Ordem de execução recomendada

```
Fase 0 (fundação)                  ← bloqueante
  └─ Fase 1 (UI primitives/hooks)  ← bloqueante
      ├─ Fase 3 (Cadastros)        ← libera Fase 4
      │   └─ Fase 4 (Financeiro)
      ├─ Fase 2 (Membresia)
      └─ Fase 5 (Administração)    ← Dashboard real depende de 2+4
          └─ Fase 6 (Polimento)
```

Fase 2 (Membresia) e Fase 3 (Cadastros) podem ser desenvolvidas em paralelo depois da Fase 1. Fase 4 só começa depois da Fase 3 porque o form de Lançamento depende dos descritivos cadastrados.

---

## 6. Decisões em aberto para o usuário

Antes de começar a Fase 0, confirmar:

1. **HTTP client:** usar `axios` (mais robusto, interceptors simples) ou `fetch` nativo com wrapper? Recomendação: `axios`.
2. **Upload de comprovante de lançamento:** o backend já suporta multipart/S3 em `/lancamentos`? Se não, o campo `comprovante_url` ficará como input de URL (paste manual) até o endpoint existir.
3. **Balanço / Relatórios / Dashboard:** aceita agregação client-side na primeira rodada, ou prefere que eu crie os endpoints agregadores no backend antes?
4. **Perfis:** ~~adicionar OPERADOR/AUDITOR/SECRETARIO~~ ✅ já no backend. Só falta o frontend renomear `'ADMIN'`.
5. **Configurações:** fica fora desta rodada conforme solicitado — aguardamos o briefing.
