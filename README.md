# BoviGest

Plataforma web de gestão operacional e financeira para empresas do setor de compra, processamento e comercialização de gado. O BoviGest centraliza o fluxo desde a aquisição do rebanho até a venda de cortes, com controle de estoque, vísceras, custos, financeiro e relatórios consolidados por empresa.

Aplicação multiempresa, com autenticação, controle de perfis de acesso e interface responsiva instalável como PWA (Progressive Web App).

---

## Sumário

- [Visão geral](#visão-geral)
- [Principais módulos](#principais-módulos)
- [Stack tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Instalação e execução local](#instalação-e-execução-local)
- [Build e implantação](#build-e-implantação)
- [Banco de dados e Supabase](#banco-de-dados-e-supabase)
- [Autenticação e perfis de acesso](#autenticação-e-perfis-de-acesso)
- [Progressive Web App](#progressive-web-app)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Scripts disponíveis](#scripts-disponíveis)

---

## Visão geral

O BoviGest foi concebido para marchantes e frigoríficos que precisam registrar compras de gado, acompanhar o processamento em cortes (banda, casados, peças avulsas, vísceras e retalho), controlar saídas por venda a clientes e conciliar recebimentos e pagamentos em um único ambiente.

Cada empresa opera em contexto isolado: usuários, clientes, fornecedores, movimentações de estoque, vendas e lançamentos financeiros respeitam o vínculo `empresa_id`, com políticas de segurança aplicadas no PostgreSQL via Row Level Security (RLS) no Supabase.

Principais características:

- Cadastro completo de clientes e fornecedores, com consulta de CEP e CNPJ integrada a APIs públicas brasileiras.
- Registro de compras com parcelas, formas de pagamento e geração de comprovantes em PDF.
- Processamento de carcaças com movimentação automática de estoque por corte e composição (dianteiro, traseiro, banda, casados).
- Vendas com suporte a múltiplos tipos de corte, vendas retroativas, extrato por cliente e integração com saída de estoque.
- Módulo financeiro unificado (contas a pagar e a receber) alimentado por compras, vendas e lançamentos manuais.
- Custos operacionais: viagens, abates (com romaneio e relatório), veículos e despesas operacionais.
- Dashboard e relatórios analíticos com filtros por período, KPIs e exportação de documentos (PDF).
- Gestão de usuários com convite, cadastro self-service e perfis hierárquicos.

---

## Principais módulos

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Dashboard | `/dashboard` | Indicadores, gráficos e atalhos operacionais do período selecionado. |
| Compras de Gado | `/compras` | Registro de compras, parcelas, pagamentos e PDF de comprovante. |
| Fornecedores | `/fornecedores` | Cadastro e consulta de fornecedores de gado. |
| Processamento / Estoque | `/processamento` | Entrada e saída de cortes; saldo de estoque por tipo. |
| Vísceras | `/visceras` | Controle específico de vísceras, separado dos demais cortes. |
| Clientes | `/clientes` | Cadastro de clientes, limite de crédito e extrato financeiro. |
| Vendas | `/vendas` | Lançamento de vendas, listagem por cliente, extrato e edição de histórico. |
| Financeiro | `/financeiro` | Contas a pagar e a receber, conciliação e filtros por status. |
| Viagens | `/custos/viagens` | Registro de deslocamentos e custos associados. |
| Abate | `/custos/abate` | Registro de abates, romaneio, retalho e relatório por período. |
| Custos Operacionais | `/custos/operacionais` | Despesas gerais da operação. |
| Veículos | `/custos/veiculos` | Cadastro de frota vinculada aos custos. |
| Relatórios | `/relatorios` | Análises consolidadas de compras, vendas, estoque e resultado. |
| Usuários | `/usuarios` | Convite, perfis e status de acesso por empresa. |
| Configurações | `/configuracoes` | Personalização da empresa (acesso restrito ao perfil master). |

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite 5 |
| Estilização | SCSS Modules, design tokens compartilhados |
| Roteamento | React Router v6 |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Gráficos | Recharts |
| PDF | jsPDF, jspdf-autotable |
| Ícones | Lucide React |
| Notificações | React Hot Toast |
| PWA | vite-plugin-pwa (Workbox) |
| Formatação | Prettier |
| Hospedagem | Vercel (SPA com rewrite para `index.html`) |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Cliente (Browser)                     │
│  React SPA · PWA · localStorage (sessão 24h)            │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase                                    │
│  · Auth (e-mail/senha)                                   │
│  · PostgreSQL + RLS por empresa_id                       │
│  · Storage (logos da empresa)                            │
│  · Edge Functions (convite de usuários)                  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│         APIs externas (consultas pontuais)               │
│  · BrasilAPI (CNPJ) · ViaCEP (endereço)                  │
└─────────────────────────────────────────────────────────┘
```

O frontend organiza a lógica em camadas:

- **`src/pages/`** — telas e fluxos de negócio por domínio.
- **`src/services/`** — comunicação com Supabase e APIs externas.
- **`src/components/`** — biblioteca de UI reutilizável e componentes de domínio.
- **`src/utils/`** — regras de corte, máscaras, geração de PDF e helpers transversais.
- **`supabase/`** — scripts SQL de migração e políticas complementares.

---

## Requisitos

- **Node.js** 18 ou superior (recomendado: 20 LTS)
- **npm** 9 ou superior
- Conta e projeto configurados no **Supabase** (Auth, banco e políticas RLS aplicados)
- Navegador moderno com suporte a ES2020 (Chrome, Edge, Firefox, Safari)

---

## Instalação e execução local

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd BoviGest

# Instalar dependências
npm install

# Ambiente de desenvolvimento
npm run dev
```

O servidor de desenvolvimento Vite inicia, por padrão, em `http://localhost:5173`.

### Variáveis de ambiente (opcional)

| Variável | Descrição |
|----------|-----------|
| `VITE_APP_URL` | URL pública da aplicação, usada em redirects de autenticação por e-mail. Se omitida, o sistema utiliza a origem atual ou a URL de produção configurada em `src/config/app.ts`. |

As credenciais do Supabase estão definidas em `src/services/supabase.ts`. Para ambientes distintos (staging, produção), recomenda-se externalizá-las via variáveis de ambiente e substituir a configuração estática por importação de `import.meta.env`.

---

## Build e implantação

```bash
# Compilação de produção (TypeScript + Vite)
npm run build

# Pré-visualização local do build
npm run preview
```

O artefato gerado fica em `dist/`. A configuração em `vercel.json` trata a aplicação como SPA, redirecionando rotas client-side para `index.html`.

URL de produção de referência: `https://bovi-gest.vercel.app`

---

## Banco de dados e Supabase

O esquema relacional cobre, entre outras entidades:

- Empresas e vínculo usuário-empresa (`usuarios_empresas`)
- Clientes, fornecedores e débito anterior de clientes
- Compras, parcelas e pagamentos
- Movimentações de estoque e itens por corte/composição
- Vendas (`movimentacoes_clientes`), itens, composições e recebimentos
- Abates, romaneios, viagens, veículos e custos operacionais
- Lançamentos financeiros integrados

Scripts SQL incrementais encontram-se em `supabase/`. Devem ser aplicados na ordem adequada ao evoluir o banco. Exemplos:

- `usuarios-empresas.sql` — estrutura de usuários e perfis
- `cadastro-usuario.sql` — fluxo de convite e auto-cadastro
- `compras-pagamentos.sql`, `compras-parcelas-conta-pagamento.sql` — financeiro de compras
- `clientes-debito-anterior.sql` — saldo legado de clientes
- `romaneios.sql`, `abates-retalho.sql` — módulo de abate
- `protecao-master.sql` — salvaguardas do perfil master

Todas as tabelas sensíveis utilizam RLS filtrando por `empresa_id` do usuário autenticado.

---

## Autenticação e perfis de acesso

A autenticação utiliza Supabase Auth (e-mail e senha). Após o login, o vínculo do usuário com a empresa e seu perfil são carregados de `usuarios_empresas`.

| Perfil | Escopo típico |
|--------|----------------|
| `master` | Acesso total, incluindo configurações da empresa. |
| `administrador` | Gestão operacional e cadastros. |
| `operador` | Operações do dia a dia (compras, processamento, vendas). |
| `financeiro` | Módulos financeiros e relatórios. |

A sessão local expira em **24 horas**; ao expirar, o usuário é deslogado automaticamente. Novos usuários podem ser convidados por e-mail (Edge Function `invite-usuario`) ou concluir cadastro em `/cadastro` quando autorizados previamente.

---

## Progressive Web App

O BoviGest pode ser instalado na tela inicial de dispositivos móveis e desktops. O service worker cacheia assets estáticos e permite uso offline parcial da interface. A instalação é oferecida por prompt nativo gerenciado pelo componente `PwaManager`.

Metadados do manifest: nome **BoviGest**, idioma `pt-BR`, orientação portrait, tema verde institucional.

---

## Estrutura do repositório

```
BoviGest/
├── public/                 # Assets estáticos e ícone PWA
├── src/
│   ├── components/         # UI, dashboard, PWA, relatórios
│   ├── config/             # URLs, controle de acesso
│   ├── constants/          # Tipos de corte, formas de pagamento
│   ├── hooks/
│   ├── layouts/            # MainLayout, sidebar, header
│   ├── pages/              # Módulos funcionais
│   ├── services/           # Camada de dados (Supabase)
│   ├── styles/             # Globais e tokens SCSS
│   └── utils/              # PDF, máscaras, regras de negócio
├── supabase/               # SQL e Edge Functions
├── vite.config.ts
├── vercel.json
└── package.json
```

---

## Scripts disponíveis

| Comando | Ação |
|---------|------|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Verificação TypeScript e build de produção |
| `npm run preview` | Serve o build localmente |
| `npm run format` | Formata o código com Prettier |

---

## Observações de segurança

- Não versionar credenciais, senhas ou chaves de serviço em arquivos de documentação ou código commitado.
- Manter as políticas RLS do Supabase revisadas a cada nova tabela ou RPC.
- Restringir a Edge Function de convite e as chaves `service_role` exclusivamente ao backend; nunca expor no frontend.

---

## Licenciamento

Projeto privado. Todos os direitos reservados. Uso, distribuição e modificação sujeitos à autorização dos proprietários.
