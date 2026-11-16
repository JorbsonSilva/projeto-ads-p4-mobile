/**
 * Serviço para consulta do perfil público de um professor autenticado.
 */
import {
  API_URL,
  apiFetch,
  extrairDadosObjeto,
} from "../config/api";

export interface HorarioSlot {
  hora: string;
  disponivel: boolean;
  turno: "manha" | "tarde" | "noite";
}

export interface DiaDisponivel {
  diaSemana: string;
  diaMes: string;
  horarios: HorarioSlot[];
}

export interface AvaliacaoAluno {
  id: number;
  alunoNome: string;
  alunoFoto: string | null;
  nota: number;
  data: string;
  comentario: string;
}

export interface AptidaoProfessor {
  saberId: number | null;
  nome: string;
  precoHora: number | null;
  nivelDominio: string | null;
}

export interface DisponibilidadeProfessor {
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
}

export interface PerfilProfessorPublico {
  id: number;
  nome: string;
  tituloAcademico: string;
  fotoUrl: string | null;
  online: boolean;
  verificado: boolean;
  cidade: string;
  notaMedia: number | null;
  totalAvaliacoes: number;
  totalComentarios: number;
  alunosAtendidos: number | null;
  taxaAprovacao: number | null;
  bio: string;
  precoOnline: number | null;
  precoPresencial: number | null;
  precoOnlinePorAptidao: boolean;
  precoPresencialPorAptidao: boolean;
  aceitaOnline: boolean;
  oferecePresencial: boolean;
  materias: string[];
  aptidoes: AptidaoProfessor[];
  disponibilidades: DisponibilidadeProfessor[];
  disponibilidadeSemanal: DiaDisponivel[];
  avaliacoesRecentes: AvaliacaoAluno[];
}

interface PerfilProfessorResposta {
  id: number;
  nome: string;
  titulacao: string | null;
  fotoUrl: string | null;
  verificado: boolean | null;
  aceitaOnline: boolean | null;
  oferecePresencial: boolean | null;
  cidade: string | null;
  estado: string | null;
  regiaoAtendimento: string | null;
  notaMedia: number | null;
  totalAvaliacoes: number | null;
  totalComentarios: number | null;
  bioProfessor: string | null;
  precoHoraOnline: number | null;
  precoHoraPresencial: number | null;
  aptidoes: {
    saberId: number;
    nome: string;
    precoHora: number | null;
    nivelDominio: string | null;
  }[] | null;
  disponibilidades: {
    diaSemana: string;
    horaInicio: string;
    horaFim: string;
  }[] | null;
  avaliacoesRecentes: {
    id: number;
    alunoNome: string | null;
    alunoFoto: string | null;
    nota: number;
    data: string | null;
    comentario: string | null;
  }[] | null;
}

function menorPrecoAptidoes(aptidoes: AptidaoProfessor[]): number | null {
  const precos = aptidoes
    .map((aptidao) => aptidao.precoHora)
    .filter((preco): preco is number => preco !== null && preco > 0);

  return precos.length > 0 ? Math.min(...precos) : null;
}

function formatarDataAvaliacao(data: string | null): string {
  if (!data) return "";
  const dataValida = new Date(data);
  return Number.isNaN(dataValida.getTime())
    ? ""
    : dataValida.toLocaleDateString("pt-BR");
}

export async function obterPerfilProfessor(
  id: string | number,
  signal?: AbortSignal,
): Promise<PerfilProfessorPublico> {
  const resposta = await apiFetch(
    `${API_URL}/api/v1/usuarios/professores/${encodeURIComponent(String(id))}/perfil-publico`,
    { method: "GET", signal },
  );
  const payload: unknown = await resposta.json();
  const dados = extrairDadosObjeto<PerfilProfessorResposta>(payload);
  const cidade = [dados.cidade, dados.estado].filter(Boolean).join(" - ");
  const aptidoes = (dados.aptidoes ?? []).map((aptidao) => ({
    saberId: aptidao.saberId,
    nome: aptidao.nome,
    precoHora: aptidao.precoHora,
    nivelDominio: aptidao.nivelDominio,
  }));
  const precoPorAptidao = menorPrecoAptidoes(aptidoes);
  const precoOnlineInformado = dados.precoHoraOnline !== null && dados.precoHoraOnline > 0;
  const precoPresencialInformado =
    dados.precoHoraPresencial !== null && dados.precoHoraPresencial > 0;

  return {
    id: dados.id,
    nome: dados.nome,
    tituloAcademico: dados.titulacao ?? "",
    fotoUrl: dados.fotoUrl,
    online: false,
    verificado: dados.verificado === true,
    cidade: dados.regiaoAtendimento || cidade,
    notaMedia: dados.notaMedia,
    totalAvaliacoes: dados.totalAvaliacoes ?? 0,
    totalComentarios: dados.totalComentarios ?? 0,
    alunosAtendidos: null,
    taxaAprovacao: null,
    bio: dados.bioProfessor ?? "",
    precoOnline: precoOnlineInformado
      ? dados.precoHoraOnline
      : precoPorAptidao,
    precoPresencial: precoPresencialInformado
      ? dados.precoHoraPresencial
      : precoPorAptidao,
    precoOnlinePorAptidao: !precoOnlineInformado && precoPorAptidao !== null,
    precoPresencialPorAptidao: !precoPresencialInformado && precoPorAptidao !== null,
    aceitaOnline: dados.aceitaOnline === true,
    oferecePresencial: dados.oferecePresencial === true,
    materias: aptidoes.map((aptidao) => aptidao.nome),
    aptidoes,
    disponibilidades: dados.disponibilidades ?? [],
    disponibilidadeSemanal: [],
    avaliacoesRecentes: (dados.avaliacoesRecentes ?? []).map((avaliacao) => ({
      id: avaliacao.id,
      alunoNome: avaliacao.alunoNome ?? "Aluno",
      alunoFoto: avaliacao.alunoFoto,
      nota: avaliacao.nota,
      data: formatarDataAvaliacao(avaliacao.data),
      comentario: avaliacao.comentario ?? "",
    })),
  };
}
