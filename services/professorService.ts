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
  alunoFoto: string;
  nota: number;
  data: string;
  comentario: string;
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
  alunosAtendidos: number | null;
  taxaAprovacao: number | null;
  bio: string;
  precoOnline: number | null;
  precoPresencial: number | null;
  aceitaOnline: boolean;
  oferecePresencial: boolean;
  materias: string[];
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
  bioProfessor: string | null;
  precoHoraOnline: number | null;
  precoHoraPresencial: number | null;
  aptidoes: {
    nome: string;
    precoHora: number | null;
    nivelDominio: string | null;
  }[] | null;
  disponibilidades: {
    diaSemana: string;
    horaInicio: string;
    horaFim: string;
  }[] | null;
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
    alunosAtendidos: null,
    taxaAprovacao: null,
    bio: dados.bioProfessor ?? "",
    precoOnline: dados.precoHoraOnline,
    precoPresencial: dados.precoHoraPresencial,
    aceitaOnline: dados.aceitaOnline === true,
    oferecePresencial: dados.oferecePresencial === true,
    materias: (dados.aptidoes ?? []).map((aptidao) => aptidao.nome),
    disponibilidadeSemanal: [],
    avaliacoesRecentes: [],
  };
}
