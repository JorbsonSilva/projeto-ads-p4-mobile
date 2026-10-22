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

## 🚧 Sprint 2: Telas Pendentes e Integração (Em Andamento)

### O que já foi feito na Sprint 2:
🟢 [ATUALIZADO] * **Identidade Visual:** Aplicativo oficialmente nomeado como "Orienta".
🟢 [ATUALIZADO] * **Splash Screen (`index.tsx`):** Implementada a tela de abertura com a logomarca oficial em PNG. Criada animação fluida de surgimento (Fade In) e crescimento (Spring) utilizando a API nativa `Animated`. Transição automática para a tela de Login configurada.
* **Tela de Cadastro (`cadastro.tsx`):** Formulário base construído reaproveitando os componentes (`InputCustomizado` e `BotaoCustomizado`). Implementada a lógica de botões de seleção ("Aluno" e "Professor") lado a lado utilizando Flexbox (`flex: 1`). Estado inicial do Modal (`Bottom Sheet`) preparado para exibir as opções específicas de cada perfil.

### O que falta no Front-end:
* **Splash Screen (`index.tsx`):** Substituir o texto temporário "Sistema iniciando" pela logomarca oficial da UNINASSAU/Projeto e refinar a animação de transição para a tela de Login.
* **Refinamento do Cadastro:** Aplicar os estilos visuais de "Gaveta" (Bottom Sheet) no Modal de seleção de perfil e adicionar os campos específicos para Aluno (Interesses) e Professor (Matérias).ial do Modal (`Bottom Sheet`) preparado para exibir as opções específicas de cada perfil.

### Próximos Passos (Back-end e Integração):
* **Função Fetch:** Substituir o `console.log` atual do formulário de Login por uma requisição HTTP (`fetch`) real.
* **Desenvolvimento da API (Concluído ✅):** Os endpoints no servidor (Spring Boot) já foram criados para receber o JSON do aplicativo, validar as credenciais no banco de dados e retornar a resposta (Sucesso/Erro). Resta apenas a conexão de rede (IP) entre o Front e o Back.