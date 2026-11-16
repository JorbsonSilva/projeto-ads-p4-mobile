import { API_URL, apiFetch, extrairDadosLista } from "../config/api";

export interface SaberItem {
  id: number;
  nome: string;
  categoria: string;
  descricao: string;
  topicosPopulares: string[];
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
  totalDisciplinas: number;
  disciplinas: SaberItem[];
}

export interface ResumoCatalogo {
  totalDisciplinas: number;
  totalCategorias: number;
}

export interface ResultadoCatalogo {
  categorias: CategoriaAgrupada[];
  todasDisciplinas: SaberItem[];
  resumo: ResumoCatalogo;
}

export const CONFIG_CATEGORIAS: Record<string, { icone: string; cor: string; bg: string }> = {
  Exatas: { icone: "book-open", cor: "#2563EB", bg: "#EFF6FF" },
  Tecnologia: { icone: "cpu", cor: "#FF5A1F", bg: "#FFF7ED" },
  Ciências: { icone: "activity", cor: "#059669", bg: "#ECFDF5" },
  Humanas: { icone: "file-text", cor: "#7C3AED", bg: "#F5F3FF" },
  Idiomas: { icone: "globe", cor: "#0284C7", bg: "#F0F9FF" },
  Negócios: { icone: "bar-chart-2", cor: "#D97706", bg: "#FEF3C7" },
  Geral: { icone: "book", cor: "#475569", bg: "#F8FAFC" },
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
      totalDisciplinas: disciplinas.length,
      disciplinas,
    };
  });
}

export async function obterCatalogoDisciplinas(): Promise<ResultadoCatalogo> {
  const response = await apiFetch(`${API_URL}/api/v1/saberes`);
  const registros = extrairDadosLista<Record<string, unknown>>(await response.json());
  const todasDisciplinas = registros
    .map((item) => ({
      id: Number(item.id),
      nome: typeof item.nome === "string" ? item.nome.trim() : "",
      categoria:
        typeof item.categoria === "string" && item.categoria.trim()
          ? item.categoria.trim()
          : "Geral",
      descricao: typeof item.descricao === "string" ? item.descricao.trim() : "",
      topicosPopulares: Array.isArray(item.topicosPopulares)
        ? item.topicosPopulares.filter((topico): topico is string => typeof topico === "string")
        : [],
    }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.nome.length > 0);
  const categorias = agruparDisciplinas(todasDisciplinas);

  return {
    categorias,
    todasDisciplinas,
    resumo: {
      totalDisciplinas: todasDisciplinas.length,
      totalCategorias: categorias.length,
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
