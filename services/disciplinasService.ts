import { API_URL, apiFetch, extrairDadosLista } from "../config/api";

export interface SaberItem {
  id: number;
  nome: string;
  categoria: string;
  descricao: string;
  icone: string;
  totalProfessores: number;
  topicosPopulares: string[];
  destaque: boolean;
  mediaPreco: number;
}

export interface CategoriaPopular {
  nome: string;
  totalProfessores: number;
}

export interface CategoriaAgrupada {
  id: string;
  nome: string;
  icone: string;
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
}

export const CONFIG_CATEGORIAS: Record<string, { icone: string; cor: string; bg: string; desc: string }> = {
  Exatas: { icone: "book-open", cor: "#2563EB", bg: "#EFF6FF", desc: "Matemática, estatística e física" },
  Tecnologia: { icone: "cpu", cor: "#FF5A1F", bg: "#FFF7ED", desc: "Computação, programação e tecnologia" },
  Ciências: { icone: "activity", cor: "#059669", bg: "#ECFDF5", desc: "Ciências biológicas e química" },
  Humanas: { icone: "file-text", cor: "#7C3AED", bg: "#F5F3FF", desc: "Humanidades e ciências sociais" },
  Idiomas: { icone: "globe", cor: "#0284C7", bg: "#F0F9FF", desc: "Idiomas e comunicação" },
  Negócios: { icone: "bar-chart-2", cor: "#D97706", bg: "#FEF3C7", desc: "Gestão e negócios" },
  Geral: { icone: "book", cor: "#475569", bg: "#F8FAFC", desc: "Outras áreas de conhecimento" },
};

function agruparDisciplinas(saberes: SaberItem[]): CategoriaAgrupada[] {
  const grupos = new Map<string, SaberItem[]>();
  for (const saber of saberes) {
    const categoria = saber.categoria || "Geral";
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), saber]);
  }

  return Array.from(grupos, ([nome, disciplinas]) => {
    const config = CONFIG_CATEGORIAS[nome] ?? CONFIG_CATEGORIAS.Geral;
    return {
      id: nome.toLowerCase(),
      nome,
      icone: config.icone,
      corPrimaria: config.cor,
      corFundo: config.bg,
      descricao: config.desc,
      totalDisciplinas: disciplinas.length,
      totalProfessores: disciplinas.reduce((total, item) => total + item.totalProfessores, 0),
      disciplinas,
    };
  });
}

export async function obterCatalogoDisciplinas(): Promise<ResultadoCatalogo> {
  const response = await apiFetch(`${API_URL}/api/v1/saberes`);
  const registros = extrairDadosLista<Record<string, unknown>>(await response.json());
  const todasDisciplinas = registros.map((item) => ({
    id: Number(item.id),
    nome: String(item.nome ?? ""),
    categoria: String(item.categoria ?? "Geral"),
    descricao: String(item.descricao ?? ""),
    icone: String(item.icone ?? "book"),
    totalProfessores: Number(item.totalProfessores ?? 0),
    topicosPopulares: Array.isArray(item.topicosPopulares)
      ? item.topicosPopulares.filter((topico): topico is string => typeof topico === "string")
      : [],
    destaque: item.destaque === true,
    mediaPreco: Number(item.mediaPreco ?? 0),
  }));
  const categorias = agruparDisciplinas(todasDisciplinas);

  return {
    categorias,
    todasDisciplinas,
    resumo: {
      totalDisciplinas: todasDisciplinas.length,
      totalCategorias: categorias.length,
      totalProfessores: todasDisciplinas.reduce((total, item) => total + item.totalProfessores, 0),
      disciplinasEmAlta: todasDisciplinas.filter((item) => item.destaque),
    },
  };
}

export async function obterCategoriasPopulares(): Promise<CategoriaPopular[]> {
  const response = await apiFetch(`${API_URL}/api/v1/saberes/categorias-populares`);
  const registros = extrairDadosLista<Record<string, unknown>>(await response.json());

  return registros
    .filter((item) => typeof item.nome === "string" && item.nome.trim().length > 0)
    .map((item) => ({
      nome: String(item.nome).trim(),
      totalProfessores: Number(item.totalProfessores ?? 0),
    }));
}
