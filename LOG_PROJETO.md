# 📄 Diário de Bordo: Desenvolvimento do Aplicativo

## 📌 Sprint 1: Setup, Identidade Visual e Tela de Login
**Período:** Março/2026
**Status:** Concluído ✅

### 1. Infraestrutura e Configuração Inicial
* **Backend:** Repositório inicializado (Spring Boot) e conectado ao banco de dados Supabase via variáveis de ambiente. Teste de persistência validado. API REST construída e testada com sucesso (Rotas de Cadastro e Login funcionais).
* **Frontend:** Projeto React Native (Expo) criado com suporte a TypeScript. Limpeza do template padrão (`reset-project`) executada.
* **Ambiente:** Configuração de permissões de script no Windows (PowerShell) para execução do `npx`.
* **Arquitetura de Pastas:** Estruturação criada (`src/services`, `src/components`, e `src/assets`) para separar a lógica de negócios da interface.

### 2. Design System e Padronização Visual
* **Paleta de Cores:** Criação do arquivo `constants/Colors.ts` mapeando as cores do protótipo (Laranja Vibrante, Azul Marinho, Cinza de fundo, Branco e cores de borda/texto).
* **Estilização Global:** Implementação da estrutura de `StyleSheet` para evitar código duplicado (DRY) e garantir a consistência de botões e inputs.

### 3. Front-end: Construção da Tela de Login (`login.tsx`)
* **Layout Responsivo:** Implementação do Flexbox e Box Model para estruturação de camadas (Header Laranja, Card de Formulário Branco, Rodapé).
* **Neumorfismo:** Aplicação de bordas arredondadas e sombras (`elevation`) nos campos de texto para dar profundidade ao design.
* **Refatoração e Clean Code (Componentização UI):** 
  * Criação de componentes reutilizáveis e escaláveis (`InputCustomizado` e `BotaoCustomizado`).
  * Implementação de contratos rígidos usando `Interfaces` do TypeScript (Props) para garantir a tipagem correta de dados e funções passadas entre as telas.
  * Botão de login principal e links de navegação.
  * Divisor flexível ("--- or ---") criado com Views dinâmicas.
  * Integração da biblioteca `@expo/vector-icons` (FontAwesome) para os botões sociais (Google e Facebook).
* **Estado (State):** Implementação inicial do Hook `useState` para capturar e armazenar os dados digitados de email e senha na memória do aplicativo.

### 4. Navegação e Roteamento (Expo Router)
* Renomeação do arquivo principal para `login.tsx` para assumir a rota `/login`.
* Criação do arquivo `cadastro.tsx` como esqueleto de destino.
* Configuração do roteamento via `useRouter`, com redirecionamento de links ("Cadastre-se").

---

## 🚀 Migração e Evolução — 4º Período (P4)

### Fase 0 — Preservação e Preparo ✅ [CONCLUÍDA]
* Novo repositório `projeto-ads-p4-mobile` criado, preservando o código do 3º período intacto.

### Fase 1 — Execução Reproduzível ✅ [CONCLUÍDA]
* Criação do `.env.example` com `EXPO_PUBLIC_API_URL=http://localhost:8080`.
* Configuração do `config/api.ts` lendo a variável de ambiente para conexão flexível em emulador, web e celular físico.

### Fase 3 — Integração Mobile com Autenticação JWT ✅ [CONCLUÍDA]
* Adaptação do `AuthContext.tsx` no React Native com persistência em `AsyncStorage` (`@orienta_token` e `@orienta_user`).
* Integração de interceptors do Axios para injeção automática de `Bearer ${token}`.
* Fluxo de logout com limpeza de cache e remoção segura de credenciais.

### Fase 4 — Padronização de Contratos Mobile/API (/api/v1) ✅ [CONCLUÍDA]
* **Prefixo v1 Unificado (`f4-t1`, `f4-t8`):** `config/api.ts` configurado para comunicação exclusiva com a API v1 (`${EXPO_PUBLIC_API_URL}/api/v1`).
* **Tipagem Estrita com TypeScript (`f4-t7`):** Criação de `types/agendamento.ts` com o enum `StatusAgendamento` rigorosamente sincronizado com o backend Java (PENDENTE, CONFIRMADO, RECUSADO, CANCELADO, EM_ANDAMENTO, AGUARDANDO_CONFIRMACAO, REALIZADA).
* **Tratamento Semântico de Erros (`f4-t9`):** Interceptors configurados para capturar respostas 400 (validação), 401 (sessão expirada com deslogue automático), 403 (acesso restrito), 409 (conflito de agenda) e 422 (regra de negócio violada).
* **Serviços de API Tipados (`f4-t6`, `f4-t8`):** Disponibilização do objeto `agendamentoApi` com métodos tipados (`criar`, `listarPorAluno`, `listarPorProfessor`, `aceitar`, `recusar`, `cancelar`, `remarcar`).

---

### Fase 6 — Implementar Aula, Cronômetro e Avaliação ✅ [CONCLUÍDA]
* **Objetivo:** Completar o ciclo de aula no aplicativo mobile: início bilateral, cronômetro oficial ao vivo sincronizado com o servidor, confirmação mútua de término e avaliação por estrelas.
* **Entregas Realizadas:**
  1. **Componente de Cronômetro Oficial (`f6-t7`):** Criação do componente `components/CronometroAula.tsx` sincronizando a contagem com o relógio do backend via polling a cada 5 segundos.
  2. **Indicadores de Check-in Bilateral (`f6-t2`):** Indicadores visuais do status de presença ("Você" e "Outro participante") com botão interativo para confirmação.
  3. **Controles de Pausa, Retomada e Conclusão (`f6-t4`, `f6-t6`):** Botões contextuais para pausar/retomar a mentoria e confirmação bilateral de término com estado `AGUARDANDO_CONFIRMACAO`.
  4. **Modal de Avaliação Pós-Aula (`f6-t8`):** Diálogo interativo de nota de 1 a 5 estrelas e campo de comentário pós-conclusão da aula.
  5. **Integração na Tela de Agenda (`app/(tabs)/agenda.tsx`):** Exibição de cards de agendamento com badge `🔴 EM ANDAMENTO`, botão de atalho `[Acessar Sala Ao Vivo]` e modal de tela cheia para a aula ao vivo.

---
