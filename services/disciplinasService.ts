/**
 * @file disciplinasService.ts
 * @description Serviço híbrido resiliente para o Catálogo e Exploração de Disciplinas [ORI-022].
 * Fornece a listagem completa de saberes acadêmicos agrupados por macro-áreas de conhecimento,
 * busca instantânea em tempo real, disciplinas em alta e camada de resiliência com fallback
 * offline e sinalização com badge semântico.
 */

import { API_URL, extrairDadosLista } from "../config/api";

export interface SaberItem {
  id: number;
  nome: string;
  categoria: string;
  descricao: string;
  icone: string;
  totalProfessores: number;
  topicosPopulares: string[];
  destaque?: boolean;
  mediaPreco: number;
}

export interface CategoriaAgrupada {
  id: string;
  nome: string;
  icone: string; // Nome de ícone Feather
  corPrimaria: string;
  corFundo: string;
  descricao: string;
  totalDisciplinas: number;
  totalProfessores: number;
  disciplinas: SaberItem[];
}

export interface ResumoCatalogo {
  totalDisciplinas: number;
  totalCategorias: number;
  totalProfessores: number;
  disciplinasEmAlta: SaberItem[];
}

export interface ResultadoCatalogo {
  categorias: CategoriaAgrupada[];
  todasDisciplinas: SaberItem[];
  resumo: ResumoCatalogo;
  isSimulado: boolean;
}

// ==============================================================
// BASE DE CONHECIMENTO OFICIAL DO ORIENTA 2.0 (FALLBACK OFFLINE)
// ==============================================================
export const MOCK_DISCIPLINAS_OFICIAIS: SaberItem[] = [
  // --- EXATAS & MATEMÁTICA ---
  {
    id: 1,
    nome: "Cálculo Diferencial e Integral I",
    categoria: "Exatas",
    descricao: "Limites fundamentais, regras de derivação, regra da cadeia, otimização e integrais definidas.",
    icone: "activity",
    totalProfessores: 18,
    topicosPopulares: ["Limites Trigonométricos", "Derivadas Implícitas", "Área sob a Curva", "Taxas Relacionadas"],
    destaque: true,
    mediaPreco: 45.0,
  },
  {
    id: 2,
    nome: "Cálculo II e Multivariáveis",
    categoria: "Exatas",
    descricao: "Funções de várias variáveis, derivadas parciais, vetor gradiente, máximos/mínimos e integrais duplas.",
    icone: "trending-up",
    totalProfessores: 12,
    topicosPopulares: ["Gradiente e Derivada Direcional", "Multiplicadores de Lagrange", "Integrais Duplas em Polares"],
    destaque: false,
    mediaPreco: 50.0,
  },
  {
    id: 3,
    nome: "Álgebra Linear e Geometria Analítica",
    categoria: "Exatas",
    descricao: "Sistemas lineares, matrizes, determinantes, espaços vetoriais, autovalores e autovetores.",
    icone: "grid",
    totalProfessores: 15,
    topicosPopulares: ["Transformações Lineares", "Diagonalização de Matrizes", "Base e Dimensão", "Produto Escalar"],
    destaque: true,
    mediaPreco: 45.0,
  },
  {
    id: 4,
    nome: "Estatística Aplicada e Probabilidade",
    categoria: "Exatas",
    descricao: "Variáveis aleatórias, distribuições normal e binomial, testes de hipóteses e regressão linear.",
    icone: "bar-chart-2",
    totalProfessores: 14,
    topicosPopulares: ["Teorema Central do Limite", "Intervalos de Confiança", "Teste T de Student", "ANOVA"],
    destaque: false,
    mediaPreco: 40.0,
  },
  {
    id: 5,
    nome: "Física Mecânica e Dinâmica",
    categoria: "Exatas",
    descricao: "Cinemática vetorial, leis de Newton, trabalho e energia cinética, rotação e momento angular.",
    icone: "compass",
    totalProfessores: 11,
    topicosPopulares: ["Conservação de Energia", "Colisões Elásticas", "Torque e Estática", "Gravitação"],
    destaque: false,
    mediaPreco: 42.0,
  },
  {
    id: 6,
    nome: "Matemática Financeira e Raciocínio Lógico",
    categoria: "Exatas",
    descricao: "Juros simples e compostos, taxas equivalentes, sistemas de amortização SAC/PRICE e lógica proposicional.",
    icone: "dollar-sign",
    totalProfessores: 9,
    topicosPopulares: ["Tabela Price vs SAC", "Valor Presente Líquido (VPL)", "Tabela Verdade", "Equivalências Lógicas"],
    destaque: false,
    mediaPreco: 38.0,
  },

  // --- TECNOLOGIA & COMPUTAÇÃO ---
  {
    id: 7,
    nome: "Estruturas de Dados e Algoritmos",
    categoria: "Tecnologia",
    descricao: "Vetores, listas encadeadas, pilhas, filas, árvores AVL, grafos e análise assintótica Big-O.",
    icone: "cpu",
    totalProfessores: 22,
    topicosPopulares: ["Árvores Binárias de Busca", "Algoritmo de Dijkstra", "Busca em Largura (BFS)", "Recursão e Pilha"],
    destaque: true,
    mediaPreco: 50.0,
  },
  {
    id: 8,
    nome: "Programação Orientada a Objetos com Java",
    categoria: "Tecnologia",
    descricao: "Classes, encapsulamento, herança, polimorfismo, interfaces, coleções, exceções e Spring Boot.",
    icone: "code",
    totalProfessores: 19,
    topicosPopulares: ["Design Patterns (Singleton/Factory)", "Streams e Lambdas", "Generics", "Spring MVC e JPA"],
    destaque: true,
    mediaPreco: 48.0,
  },
  {
    id: 9,
    nome: "Banco de Dados Relacional e SQL",
    categoria: "Tecnologia",
    descricao: "Modelagem ER, normalização até a 3FN, DDL/DML, JOINs avançados, subqueries, índices e transações ACID.",
    icone: "database",
    totalProfessores: 17,
    topicosPopulares: ["Inner e Left Joins", "Agrupamentos com HAVING", "Trigger e Stored Procedures", "Otimização de Índices"],
    destaque: false,
    mediaPreco: 45.0,
  },
  {
    id: 10,
    nome: "Desenvolvimento Mobile com React Native",
    categoria: "Tecnologia",
    descricao: "Componentes nativos, Expo Router, hooks do React, navegação por abas/pilhas e integração com APIs REST.",
    icone: "smartphone",
    totalProfessores: 16,
    topicosPopulares: ["Expo Router v3", "Gestão de Estado com Context API", "Estilização com StyleSheet", "AsyncStorage"],
    destaque: true,
    mediaPreco: 52.0,
  },
  {
    id: 11,
    nome: "Desenvolvimento Web Frontend Moderno",
    categoria: "Tecnologia",
    descricao: "HTML5 semântico, CSS Grid/Flexbox, JavaScript ES6+, TypeScript, React e boas práticas de acessibilidade.",
    icone: "layout",
    totalProfessores: 24,
    topicosPopulares: ["useEffect e Custom Hooks", "Tailwind CSS", "Consumo com Axios/Fetch", "Clean Architecture"],
    destaque: false,
    mediaPreco: 45.0,
  },
  {
    id: 12,
    nome: "Inteligência Artificial e Machine Learning",
    categoria: "Tecnologia",
    descricao: "Regressão, classificação, algoritmos k-NN, árvores de decisão, redes neurais e processamento de linguagem.",
    icone: "zap",
    totalProfessores: 13,
    topicosPopulares: ["Scikit-Learn e Pandas", "Redes Neurais Convolucionais", "Validação Cruzada", "Prompt Engineering"],
    destaque: false,
    mediaPreco: 55.0,
  },
  {
    id: 13,
    nome: "Arquitetura de Computadores e Redes",
    categoria: "Tecnologia",
    descricao: "Hierarquia de memória, pipeline de CPU, modelo OSI e TCP/IP, roteamento e protocolos de transporte.",
    icone: "hard-drive",
    totalProfessores: 8,
    topicosPopulares: ["Endereçamento IP e Sub-redes", "Protocolos TCP vs UDP", "Memória Cache", "Assembly Básico"],
    destaque: false,
    mediaPreco: 40.0,
  },

  // --- CIÊNCIAS BIOLÓGICAS & SAÚDE ---
  {
    id: 14,
    nome: "Bioquímica e Biologia Molecular",
    categoria: "Ciências",
    descricao: "Metabolismo de carboidratos, ciclo de Krebs, cadeia respiratória, enzimas, DNA e síntese de proteínas.",
    icone: "crosshair",
    totalProfessores: 12,
    topicosPopulares: ["Cinética Enzimática", "Glicólise e Fermentação", "Replicação do DNA", "Estrutura de Aminoácidos"],
    destaque: false,
    mediaPreco: 42.0,
  },
  {
    id: 15,
    nome: "Anatomia e Fisiologia Humana",
    categoria: "Ciências",
    descricao: "Sistemas cardiovascular, respiratório, nervoso, digestório, renal e mecanismo de homeostase.",
    icone: "heart",
    totalProfessores: 10,
    topicosPopulares: ["Potencial de Ação Neural", "Circulação Sistêmica e Pulmonar", "Filtração Glomerular", "Músculo Esquelético"],
    destaque: false,
    mediaPreco: 45.0,
  },
  {
    id: 16,
    nome: "Química Geral e Orgânica",
    categoria: "Ciências",
    descricao: "Estequiometria, equilíbrio químico, soluções, funções orgânicas, isomeria e mecanismos de reação.",
    icone: "feather",
    totalProfessores: 14,
    topicosPopulares: ["Cálculos Estequiométricos", "pH e Soluções Tampão", "Reações de Substituição e Adição", "Cinética Química"],
    destaque: true,
    mediaPreco: 40.0,
  },

  // --- HUMANAS & SOCIAIS ---
  {
    id: 17,
    nome: "Metodologia Científica e TCC",
    categoria: "Humanas",
    descricao: "Estruturação de artigos, revisão bibliográfica, normas ABNT/Vancouver, problematização e defesa de monografia.",
    icone: "file-text",
    totalProfessores: 20,
    topicosPopulares: ["Normas ABNT 2024", "Delimitação do Tema", "Revisão Sistemática de Literatura", "Oratória para Banca"],
    destaque: true,
    mediaPreco: 46.0,
  },
  {
    id: 18,
    nome: "Direito Constitucional e Administrativo",
    categoria: "Humanas",
    descricao: "Direitos e garantias fundamentais, organização dos poderes, atos administrativos e licitações públicas.",
    icone: "shield",
    totalProfessores: 11,
    topicosPopulares: ["Controle de Constitucionalidade", "Poder de Polícia", "Princípios da Administração Pública", "Ação Popular"],
    destaque: false,
    mediaPreco: 48.0,
  },
  {
    id: 19,
    nome: "Filosofia e Sociologia Contemporânea",
    categoria: "Humanas",
    descricao: "Teorias clássicas e contemporâneas, ética, política, sociedade digital, pós-modernidade e cidadania.",
    icone: "book",
    totalProfessores: 8,
    topicosPopulares: ["Escola de Frankfurt", "Ética a Nicômaco", "Sociedade do Cansaço", "Contratualismo"],
    destaque: false,
    mediaPreco: 38.0,
  },

  // --- IDIOMAS & COMUNICAÇÃO ---
  {
    id: 20,
    nome: "Inglês Acadêmico e Conversação",
    categoria: "Idiomas",
    descricao: "Fluência verbal, vocabulário técnico para conferências, leitura de papers científicos e redação de abstracts.",
    icone: "globe",
    totalProfessores: 26,
    topicosPopulares: ["Speaking para Apresentações", "Preparação TOEFL/IELTS", "Reading de Artigos Científicos", "Pronúncia e Entonação"],
    destaque: true,
    mediaPreco: 45.0,
  },
  {
    id: 21,
    nome: "Espanhol para Fins Acadêmicos e Profissionais",
    categoria: "Idiomas",
    descricao: "Gramática contrastiva, leitura instrumental, conversação corporativa e preparação para exames DELE/Siele.",
    icone: "message-circle",
    totalProfessores: 14,
    topicosPopulares: ["Falsos Cognatos", "Subjuntivo em Espanhol", "Redação de Ensaios", "Prática Auditiva"],
    destaque: false,
    mediaPreco: 38.0,
  },
  {
    id: 22,
    nome: "Comunicação, Redação e Oratória",
    categoria: "Idiomas",
    descricao: "Coesão e coerência textual, técnicas de argumentação persuasiva, postura corporal e controle de ansiedade.",
    icone: "mic",
    totalProfessores: 10,
    topicosPopulares: ["Pitch de 3 Minutos", "Eliminação de Vícios de Linguagem", "Gatilhos Mentais na Oratória", "Storytelling"],
    destaque: false,
    mediaPreco: 40.0,
  },

  // --- NEGÓCIOS & GESTÃO ---
  {
    id: 23,
    nome: "Gestão Financeira e Controladoria",
    categoria: "Negócios",
    descricao: "Análise de demonstrativos (DRE, Balanço), fluxo de caixa projetado, capital de giro e valuation.",
    icone: "pie-chart",
    totalProfessores: 12,
    topicosPopulares: ["EBITDA e Margens", "Ponto de Equilíbrio", "Análise Vertical e Horizontal", "Gestão de Custos"],
    destaque: false,
    mediaPreco: 45.0,
  },
  {
    id: 24,
    nome: "Gestão de Projetos e Metodologias Ágeis",
    categoria: "Negócios",
    descricao: "Framework Scrum, Kanban, papéis ágeis, estimativas com Planning Poker, métricas de fluxo e OKRs.",
    icone: "check-circle",
    totalProfessores: 15,
    topicosPopulares: ["Sprints e Retrospectivas", "User Stories e Critérios de Aceite", "Burn-down Charts", "Kanban WIP Limits"],
    destaque: true,
    mediaPreco: 48.0,
  },
  {
    id: 25,
    nome: "Marketing Digital e Growth Estratégico",
    categoria: "Negócios",
    descricao: "Funil de aquisição, inbound marketing, métricas CAC/LTV, SEO básico e estratégias de retenção.",
    icone: "share-2",
    totalProfessores: 9,
    topicosPopulares: ["Funil de Conversão", "Análise de CAC vs LTV", "Tráfego Orgânico e Conteúdo", "Testes A/B"],
    destaque: false,
    mediaPreco: 42.0,
  },
];

export const CONFIG_CATEGORIAS: Record<string, { icone: string; cor: string; bg: string; desc: string }> = {
  Exatas: {
    icone: "book-open",
    cor: "#2563EB",
    bg: "#EFF6FF",
    desc: "Cálculo, Álgebra Linear, Estatística, Física e Raciocínio Lógico",
  },
  Tecnologia: {
    icone: "cpu",
    cor: "#FF5A1F",
    bg: "#FFF7ED",
    desc: "Algoritmos, Programação Java/JS, Banco de Dados, Mobile e Web",
  },
  Ciências: {
    icone: "activity",
    cor: "#059669",
    bg: "#ECFDF5",
    desc: "Bioquímica, Anatomia, Fisiologia e Química Geral",
  },
  Humanas: {
    icone: "file-text",
    cor: "#7C3AED",
    bg: "#F5F3FF",
    desc: "Metodologia Científica, TCC, ABNT, Direito e Filosofia",
  },
  Idiomas: {
    icone: "globe",
    cor: "#0284C7",
    bg: "#F0F9FF",
    desc: "Inglês Acadêmico, Espanhol, Redação e Oratória",
  },
  Negócios: {
    icone: "bar-chart-2",
    cor: "#D97706",
    bg: "#FEF3C7",
    desc: "Gestão Financeira, Metodologias Ágeis, Scrum e Marketing",
  },
  Geral: {
    icone: "book",
    cor: "#475569",
    bg: "#F8FAFC",
    desc: "Disciplinas interdisciplinares e competências gerais",
  },
};

// ==============================================================
// FUNÇÃO GERADORA DE CATEGORIAS AGRUPADAS
// ==============================================================
function agruparDisciplinas(saberes: SaberItem[]): CategoriaAgrupada[] {
  const mapaCategorias: Record<string, SaberItem[]> = {};

  saberes.forEach((s) => {
    const cat = s.categoria || "Geral";
    if (!mapaCategorias[cat]) {
      mapaCategorias[cat] = [];
    }
    mapaCategorias[cat].push(s);
  });

  return Object.entries(mapaCategorias).map(([catNome, itens]) => {
    const config = CONFIG_CATEGORIAS[catNome] || CONFIG_CATEGORIAS["Geral"];
    const totalProfessores = itens.reduce((acc, curr) => acc + (curr.totalProfessores || 0), 0);

    return {
      id: catNome.toLowerCase(),
      nome: catNome,
      icone: config.icone,
      corPrimaria: config.cor,
      corFundo: config.bg,
      descricao: config.desc,
      totalDisciplinas: itens.length,
      totalProfessores,
      disciplinas: itens,
    };
  });
}

// ==============================================================
// SERVIÇO PRINCIPAL: BUSCA HÍBRIDA COM RESILIÊNCIA E MERGE
// ==============================================================
export async function obterCatalogoDisciplinas(): Promise<ResultadoCatalogo> {
  let disciplinasFinais: SaberItem[] = [...MOCK_DISCIPLINAS_OFICIAIS];
  let isSimulado = true;

  try {
    const resposta = await fetch(`${API_URL}/api/saberes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (resposta.ok) {
      const json = await resposta.json();
      const dadosBrutos = extrairDadosLista<any>(json);

      if (Array.isArray(dadosBrutos) && dadosBrutos.length > 0) {
        // Enriquecer dados da API com os metadados de layout e tópicos
        const mapaExistentes = new Map<string, any>();
        dadosBrutos.forEach((b) => {
          if (b.nome) mapaExistentes.set(b.nome.toLowerCase().trim(), b);
        });

        // Adicionar ou atualizar com os da API
        disciplinasFinais = MOCK_DISCIPLINAS_OFICIAIS.map((m) => {
          const correspondente = mapaExistentes.get(m.nome.toLowerCase().trim());
          if (correspondente) {
            return {
              ...m,
              id: correspondente.id || m.id,
              categoria: correspondente.categoria || m.categoria,
            };
          }
          return m;
        });

        // Incluir novos saberes da API que não estavam no mock base
        dadosBrutos.forEach((b: any, index: number) => {
          const chave = (b.nome || "").toLowerCase().trim();
          const jaExiste = disciplinasFinais.some((d) => d.nome.toLowerCase().trim() === chave);
          if (!jaExiste && b.nome) {
            disciplinasFinais.push({
              id: b.id || 100 + index,
              nome: b.nome,
              categoria: b.categoria || "Geral",
              descricao: `Mentoria especializada em ${b.nome} com suporte individualizado e material prático.`,
              icone: "book",
              totalProfessores: 8,
              topicosPopulares: ["Conceitos Fundamentais", "Exercícios Práticos", "Dúvidas Pontuais"],
              destaque: false,
              mediaPreco: 40.0,
            });
          }
        });

        isSimulado = false;
      }
    }
  } catch (erro) {
    // Falha de rede ou backend offline -> mantém fallback elegante sem quebrar
    isSimulado = true;
  }

  const categorias = agruparDisciplinas(disciplinasFinais);
  const totalDisciplinas = disciplinasFinais.length;
  const totalCategorias = categorias.length;
  const totalProfessores = disciplinasFinais.reduce((acc, curr) => acc + curr.totalProfessores, 0);
  const disciplinasEmAlta = disciplinasFinais.filter((d) => d.destaque);

  return {
    categorias,
    todasDisciplinas: disciplinasFinais,
    resumo: {
      totalDisciplinas,
      totalCategorias,
      totalProfessores,
      disciplinasEmAlta,
    },
    isSimulado,
  };
}
