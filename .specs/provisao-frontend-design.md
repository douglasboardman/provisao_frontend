# ProVisão Frontend — Design Spec (SPA)

**Data:** 2026-04-07  
**Diretório alvo:** `provisao_frontend/`  
**API:** `provisao_api/` (NestJS + PostgreSQL, JWT multi-tenant por `igreja_id`)

---

## 1. Stack Tecnológica (Modern SPA)

Migração arquitetural orientada a Single Page Application (SPA) reativa e em alta performance, garantindo transições de estado ultra-rápidas, navegação fluida sem *reloads* e componentes isolados de ponta a ponta.

| Camada | Tecnologia | Detalhamento / Objetivo |
|---|---|---|
| Framework | **React 19 + Vite 6** | Suporte às novas APIs concurrentes (`use`, Server Components compatíveis via bibliotecas) e HMR ultrarrápido garantido pelo ecossistema Vite. |
| Linguagem | **TypeScript** | Modo *strict* obrigatório, tipagem de ponta a ponta em conjunto com as requisições. |
| Roteamento | **React Router v7** | Para SPA views nativas e Nested Data Routes para gerenciar o layout de painéis. |
| Estilo | **Tailwind CSS v4** | Utiliza a engine CSS-first (`@theme`). Desacoplamento rápido em variáveis. |
| Componentes | **shadcn/ui** | Base para formulários, data-tables, inputs de forma reusável e estendida. |
| State/Cache (Server) | **TanStack Query v5** | Invalidação de queries em operações CRUD, paginando tabelas e lidando com falhas. |
| State (Local) | **Zustand** | Store simplificada, modular, ideal para persistência flexível (Auth Token, Theme). |
| Formulários | **React Hook Form + Zod** | Padrão ouro em validação client-side com feedback instantâneo e integração tipada. |
| Micro-Animações | **Framer Motion** | Para animações em saídas de modais, transitions entre rotas e feedback de interface. |

---

## 2. Identidade Visual e Premium Design

Aderindo a uma estética de *Refined Utility*, o design foca no alto-contraste e num estilo premium para afastar a aparência de SaaS genérico e monótono. 

### Uso do Logotipo
Os ativos gráficos e logotipos estão presentes nativamente em `logo_aplicacao/` (como `ProVisão (Assinatura Horizontal).png`, assinaturas verticais e favicons de altíssima resolução). O emprego deles se dará de forma modular em:
- `public/favicon.ico`: substituído pelo Favicon oficial da aplicação.
- `src/assets/logo/`: imagens alocadas e pré-carregadas via Vite para uso na Home, Top Headers, Drawer Menu e Login Screen. O tamanho ideal via render será sempre restrito (`aspect-ratio` mantido) para garantir escalabilidade perfeita.

### Tokens CSS e Paleta de Cores (Tailwind v4 `@theme`)
No Tailwind v4, a definição visual baseia-se diretamente em variáveis CSS mapeadas para classes utilitárias no arquivo `src/app.css`.

A paleta exata refletirá os pilares da aplicação, em tons Purple e Lime:

```css
@theme {
  /* Cores de Marca (Extraídas do Logo) */
  --color-purple:       #6C4CAF;
  --color-purple-light: #8967CC;
  --color-purple-muted: #E8D9FF;
  --color-lime:         #C5D44E; /* Uso para destacar balanços vitais, CTAs de engajamento */

  /* Semânticas financeiras universais */
  --color-receita:  #16A34A; /* Fluxo de caixa de entradas */
  --color-despesa:  #DC2626; /* Fluxos de saídas contábeis */
  --color-warning:  #CA8A04; /* Alertas de vencimento ou balanço pendente */
  --color-info:     #2563EB; /* Instruções ou tutoriais de interface */

  /* Fontes Premium Modernas */
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif; /* Usada em Tabelas analíticas, DataGrids */
  --font-heading: 'Outfit', sans-serif; /* Usada nos Títulos dos módulos, Cards de impacto */
  
  /* Sistema de Cores do Painel */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card); /* Para os cards vitais do dashboard */
  /* + Resto dos tokens padrão para Shadcn UI v4 */
}
```

### Efeitos de Interface (Micro-animações e UX)
- **Glassmorphism Inteligente:** Backgrounds parcialmente translúcidos (uso moderado de `backdrop-blur`) para destacar submenus, drawers laterais e modais críticos sem perda do contexto traseiro.
- **Micro-interações:** Focus Rings amigáveis, cards escalando levemente ao toque `hover:scale-[1.01] transition-transform` ajudando na navegabilidade premium e tangibilidade dos eventos visuais.

---

## 3. Estrutura de Rotas (React Router v7)

Em substituição à estrutura estritamente file-system baseada do Next.js, as rotas utilizarão as APIs declarativas do React Router em ambiente SPA puro (Vite).

```typescript
// src/router/index.tsx
<BrowserRouter>
  <Routes>
    {/* ÁREA DE AUTENTICAÇÃO (Sem navbar / Layout Centralizado) */}
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/set-password" element={<SetPassword />} />
    </Route>

    {/* ÁREA SEGURA (App Layout c/ Sidebar e Verificação Síncrona do Token) */}
    <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="pessoas" element={<PessoasList />} />
      <Route path="pessoas/novo" element={<PessoasForm />} />
      <Route path="pessoas/:id" element={<PessoasDetail />} />
      <Route path="grupos-familiares" element={<GruposFamiliaresList />} />
      <Route path="membresia" element={<MembresiaList />} />
      <Route path="membresia/novo" element={<MembresiaForm />} />
      <Route path="contas" element={<ContasBoard />} />
      <Route path="lancamentos" element={<LancamentosTable />} />
      <Route path="acoes" element={<AcoesCards />} />
      <Route path="acoes/:id" element={<AcoesDetail />} />
      <Route path="categorias" element={<CategoriasTabs />} />
      <Route path="tipos" element={<TiposTabs />} />
      <Route path="usuarios" element={<UsuariosList />} />
      <Route path="logs" element={<LogsQuery />} />
    </Route>
  </Routes>
</BrowserRouter>
```

---

## 4. Arquitetura de Pastas (SPA)

Mantendo o projeto controlável, empregamos conceitos da arquitetura focada em escalabilidade de Features.

```
provisao_frontend/
├── public/                 # Favicon (logo_aplicacao) e outros public assets
├── src/
│   ├── assets/             # Logos oficiais (importados ativamente nos componentes via ESM), SVG patterns
│   ├── components/
│   │   ├── layout/         # Componentes core de layout: Sidebar, Header, MobileDrawer
│   │   ├── ui/             # Baseline de formulário: Buttons, Dialogs, Toasters via Shadcn
│   │   └── shared/         # DataTable customizável com Server-Side Sorting, CurrencyDisplay
│   ├── features/           # Funcionalidades e modulos de negócio altamente coesos
│   │   ├── dashboard/
│   │   ├── lancamentos/
│   │   └── pessoas/
│   ├── hooks/              # `usePermission.ts`, `useTheme.ts`, `useFetch.ts`
│   ├── lib/                # Configurações do TanStack Query, Axios instance (interceptors de Auth)
│   ├── pages/              # Entradas limpas de View, as quais montam components provenientes de features e ui
│   ├── router/             # Definições das rotas React Router (Mapeamento)
│   ├── stores/             # Fluxo global isolado via Zustand (Auth, LocalPreferences)
│   ├── app.css             # Root styles engatilhando Tailwind CSS v4 `@theme`
│   └── main.tsx            # Vite Entry Component (Agrupador de Context Providers e strict render)
```

---

## 5. Autenticação & Controle de Acesso

### Fluxo de autenticação

1. **Login** (`POST /auth/login`): salva JWT na store do Zustand, com refletância e persistência em `localStorage` para continuidade da sessão SPA.
2. **React Router Middleware/Guard**: O HOC `<ProtectedRoute />` na árvore de roteamento `<Route>` checa a presença e validade temporária do Token no Zustand. Redireciona o usuário para `/login` de pronto caso nulo, quebrado ou expirado.
3. **Registro** (`POST /auth/register`): cria a conta base contendo *status inativo* para os membros. Os admins controlam a ativação.
4. **Set-password** (`POST /auth/set-password`): Consumido nas abordagens de esqueci a senha ou cadastro aprovado.

### Perfis e visibilidade de menu

| Rota | ADMIN | GESTOR | TESOUREIRO | OPERADOR | AUDITOR | SECRETARIO |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pessoas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grupos / Membresia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lançamentos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ações | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Categorias / Tipos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Usuários | ✅ | ✅ | ✅ | — | ✅ | — |
| Logs | ✅ | — | — | — | ✅ | — |

A tabela representa **visibilidade no menu** (acesso de leitura). Botões de escrita/exclusão são ocultados pelo `usePermission` com base nas permissões detalhadas abaixo:

| Recurso | Criar/Editar | Excluir |
|---|---|---|
| Pessoas | ADMIN, GESTOR, SECRETARIO | ADMIN, SECRETARIO |
| Grupos / Membresia | ADMIN, GESTOR, SECRETARIO | ADMIN, SECRETARIO |
| Contas | ADMIN, GESTOR, TESOUREIRO | ADMIN, TESOUREIRO |
| Lançamentos (receitas/despesas) | ADMIN, TESOUREIRO, OPERADOR | ADMIN, TESOUREIRO |
| Ações | ADMIN, GESTOR | ADMIN, GESTOR |
| Categorias / Tipos | ADMIN, GESTOR, TESOUREIRO | ADMIN, TESOUREIRO |
| Usuários | ADMIN, GESTOR | ADMIN |

O hook `usePermission` oculta itens de menu e desabilita botões de ação de acordo com o perfil extraído do JWT.

---

## 6. Dashboard (Home)

### KPIs exibidos (misto)

**Linha 1 — Financeiro:**
- Receitas do mês (verde + variação vs. mês anterior)
- Despesas do mês (vermelho + variação)
- Saldo total consolidado de todas as contas

**Linha 2 — Membresia:**
- Total de comungantes
- Total de não-comungantes
- Total de grupos familiares

**Linha 3 — Ações em andamento:**
- Cards compactos com nome, responsável, progresso de orçamento (barra receita/despesa vs. orçamento)

**Linha 4 — Últimos lançamentos:**
- Tabela simplificada: data, tipo, conta, valor (colorido por tipo), observação

Todos os KPIs são buscados via TanStack Query com `staleTime: 5min` e indicador de loading skeleton.

---

## 7. Padrões de Componentes

### Listagem (todas as entidades)

- `PageHeader` com título, contagem de registros e botão "Novo" (visível conforme perfil)
- Campo de busca com debounce (300ms)
- Dropdown de filtros relevantes por módulo
- `DataTable` com colunas configuráveis, ordenação e paginação server-side (20 itens/página)
- Ações por linha: visualizar (olho) + editar (lápis) + excluir (lixo, apenas ADMIN) — ícones Lucide

### Formulários

- React Hook Form com validação Zod client-side
- Zod schemas espelham as regras do backend (campos obrigatórios, tamanhos, enums)
- Campos condicionais em lançamentos: quando `receita` ou `despesa` selecionada, busca o tipo e exibe campos extras se `requer_pessoa`, `requer_acao`, `requer_conta` ou `requer_comprovante` forem `true`
- Upload de comprovante via `<input type="file">` com preview — envia para `/uploads` da API
- Feedback de erro inline por campo + toast de sucesso/erro (shadcn Toaster)

### Formulário de Pessoa

Campos: nome completo, CPF, data de nascimento, sexo, estado civil, email, telefone, CEP (com auto-fill via API de CEP), logradouro, número, complemento, bairro, cidade, estado, grupo familiar, foto (upload com preview circular).

### Modal vs. Página

- Entidades simples (Grupos Familiares, Categorias, Tipos, Contas): CRUD em `Dialog` (modal)
- Entidades complexas (Pessoas, Ações, Lançamentos): páginas dedicadas com rota própria

---

## 8. Responsividade

| Breakpoint | Comportamento da Sidebar |
|---|---|
| `< 768px` (mobile) | Sidebar oculta; ícone hamburger abre `Sheet` (drawer) |
| `768–1024px` (tablet) | Sidebar colapsada (apenas ícones) |
| `> 1024px` (desktop) | Sidebar expandida com labels |

Tabelas em mobile: colunas reduzidas para nome + valor + ações; linha expansível para detalhes.

---

## 9. Tratamento de Erros

- **401 Unauthorized:** interceptado no client HTTP (Axios/fetch interceptors) → limpa store global + força transição React Router para `/login`.
- **403 Forbidden:** toast global unificado "Sem permissão para esta ação".
- **404:** componente `NotFound` desenhado especificamente com botão chamativo "Voltar ao Dashboard".
- **422 / 400 (Zod do backend):** erros de pipeline extraídos para propriedades unificadas via React Hook Form, com visualização em vermelho abaixo dos inputs correspondentes.
- **500:** toast de UI "Erro no servidor. Tente novamente ou aguarde."
- **Rede offline:** banner persistente não destrutivo ao top do layout.

---

## 10. Configurações do Projeto Vite

```json
// package.json 
{
  "name": "provisao-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^3.0.0",
    "zod": "^3.0.0",
    "lucide-react": "^0.4",
    "framer-motion": "^12.0.0",
    "date-fns": "^4.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  }
}
```

```env
# .env.local
VITE_API_URL=http://localhost:3000
```

---

## 11. Itens Limitados ou Fora do Escopo Atual

- Integrações Middleware/BFF que funcionavam em Next.js agora estão obsoletas em uma implementação Vite.
- Transações PWA, workers offline e cache de chamadas críticas via *service workers*.
- Funcionalidades Master do Sistema: O Super-admin unificado (inter-Igrejas).
- Framework i18n — Mantendo português sólido em todos os módulos.
