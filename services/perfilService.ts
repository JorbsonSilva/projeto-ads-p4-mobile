import { API_URL, apiFetch, extrairDadosObjeto } from "../config/api";

export interface AtividadeRecenteAluno {
  id: number;
  materia: string;
  professorNome: string;
  professorFoto: string;
  data: string;
  status: "CONCLUIDA" | "CONFIRMADA" | "PENDENTE";
  nota?: number;
}

export interface ProgressoAluno {
  materiasCursando: number;
  mentoriasRealizadas: number;
  horasAcumuladas: number;
}

export interface PerfilAlunoData {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  tipo: "ALUNO";
  fotoUrl: string;
  bio: string;
  progresso: ProgressoAluno;
  interesses: string[];
  atividadesRecentes: AtividadeRecenteAluno[];
}

export interface ResultadoPerfilAluno {
  dados: PerfilAlunoData;
}

export interface PerfilProfessorData {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  tipo: "PROFESSOR";
  fotoUrl: string;
  bio: string;
  titulacao: string;
  resumoMes: {
    aulasMinistradas: number;
    horasDedicadas: number;
    alunosAtendidos: number;
    ganhosMes: number;
  };
  configuracoesEnsino: {
    valorHoraOnline?: number;
    valorHoraPresencial?: number;
    permitePresencial: boolean;
    raioAtendimentoKm?: number;
    chavePix: string;
  };
  saberes: { id: number; nome: string; nivel: string }[];
  disponibilidades: { diaSemana: string; horaInicio: string; horaFim: string }[];
}

export interface ResultadoPerfilProfessorData {
  dados: PerfilProfessorData;
}

type PerfilApi = Record<string, unknown> & {
  progresso?: Record<string, unknown>;
  interesses?: (Record<string, unknown> | string)[];
  configuracoesEnsino?: Record<string, unknown>;
  resumoMes?: Record<string, unknown>;
  aptidoes?: Record<string, unknown>[];
  disponibilidades?: Record<string, unknown>[];
  atividadesRecentes?: AtividadeRecenteAluno[];
};

async function obterPerfilApi(usuarioId: number, tipo: "aluno" | "professor"): Promise<PerfilApi> {
  const response = await apiFetch(`${API_URL}/api/v1/perfil/${tipo}/${usuarioId}`);
  return extrairDadosObjeto<PerfilApi>(await response.json());
}

export async function obterPerfilAluno(usuarioId: number): Promise<ResultadoPerfilAluno> {
  const perfil = await obterPerfilApi(usuarioId, "aluno");
  const progresso = perfil.progresso ?? {};
  const interesses = Array.isArray(perfil.interesses) ? perfil.interesses : [];

  return {
    dados: {
      id: Number(perfil.id),
      nome: String(perfil.nome ?? ""),
      email: String(perfil.email ?? ""),
      telefone: String(perfil.telefone ?? ""),
      cidade: String(perfil.cidade ?? ""),
      estado: String(perfil.estado ?? ""),
      tipo: "ALUNO",
      fotoUrl: String(perfil.fotoUrl ?? ""),
      bio: String(perfil.bioAluno ?? perfil.bio ?? ""),
      progresso: {
        materiasCursando: Number(progresso.materiasCursando ?? interesses.length),
        mentoriasRealizadas: Number(progresso.mentoriasRealizadas ?? 0),
        horasAcumuladas: Number(progresso.horasAcumuladas ?? 0),
      },
      interesses: interesses.map((item) => typeof item === "string" ? item : String(item.nome ?? "")),
      atividadesRecentes: Array.isArray(perfil.atividadesRecentes) ? perfil.atividadesRecentes : [],
    },
  };
}

export async function salvarPerfilAluno(
  usuarioId: number,
  novosDados: Partial<PerfilAlunoData>
): Promise<string[]> {
  const response = await apiFetch(`${API_URL}/api/v1/perfil/aluno/${usuarioId}`, {
    method: "PUT",
    body: JSON.stringify({
      nome: novosDados.nome,
      bio: novosDados.bio,
      fotoUrl: novosDados.fotoUrl,
      telefone: novosDados.telefone,
      cidade: novosDados.cidade,
      estado: novosDados.estado,
      interessesNomes: novosDados.interesses,
    }),
  });
  const perfilAtualizado = extrairDadosObjeto<PerfilApi>(await response.json());
  const interessesSalvos = (Array.isArray(perfilAtualizado.interesses) ? perfilAtualizado.interesses : [])
    .map((item) => typeof item === "string" ? item : String(item.nome ?? ""))
    .filter((nome) => nome.length > 0);

  if (
    novosDados.interesses !== undefined &&
    (
      interessesSalvos.length !== novosDados.interesses.length ||
      novosDados.interesses.some((nome) => !interessesSalvos.includes(nome))
    )
  ) {
    throw new Error("A API não confirmou todas as matérias selecionadas. Tente novamente.");
  }

  return interessesSalvos;
}

export async function salvarPreferenciasAluno(
  usuarioId: number,
  interessesIds: number[],
  bio: string,
): Promise<string[]> {
  const response = await apiFetch(`${API_URL}/api/v1/usuarios/${usuarioId}/aluno`, {
    method: "PUT",
    body: JSON.stringify({ bio, interessesIds }),
  });
  const perfilAtualizado = extrairDadosObjeto<PerfilApi>(await response.json());
  const interesses = Array.isArray(perfilAtualizado.interesses) ? perfilAtualizado.interesses : [];
  const idsSalvos = interesses.map((item) =>
    typeof item === "string" ? null : Number(item.saberId ?? item.id)
  );

  if (
    idsSalvos.length !== interessesIds.length ||
    interessesIds.some((id) => !idsSalvos.includes(id))
  ) {
    throw new Error("O servidor não confirmou todas as matérias selecionadas. Tente novamente.");
  }

  return interesses
    .map((item) => typeof item === "string" ? item : String(item.nome ?? ""))
    .filter((nome) => nome.length > 0);
}

export async function alterarSenha(
  usuarioId: number,
  senhaAtual: string,
  novaSenha: string,
): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/v1/usuarios/${usuarioId}/senha`, {
    method: "PUT",
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
  const resultado = extrairDadosObjeto<{ status?: string }>(await response.json());
  if (resultado.status !== "OK") {
    throw new Error("O servidor não confirmou a alteração da senha. Tente novamente.");
  }
}

export async function obterPerfilProfessor(usuarioId: number): Promise<ResultadoPerfilProfessorData> {
  const perfil = await obterPerfilApi(usuarioId, "professor");
  const ensino = perfil.configuracoesEnsino ?? {};
  const resumo = perfil.resumoMes ?? {};

  return {
    dados: {
      id: Number(perfil.id),
      nome: String(perfil.nome ?? ""),
      email: String(perfil.email ?? ""),
      telefone: String(perfil.telefone ?? ""),
      cidade: String(perfil.cidade ?? ""),
      estado: String(perfil.estado ?? ""),
      tipo: "PROFESSOR",
      fotoUrl: String(perfil.fotoUrl ?? ""),
      bio: String(perfil.bioProfessor ?? perfil.bio ?? ""),
      titulacao: String(perfil.titulacao ?? ""),
      resumoMes: {
        aulasMinistradas: Number(resumo.aulasRealizadas ?? 0),
        horasDedicadas: Number(resumo.horasMinistradas ?? 0),
        alunosAtendidos: Number(resumo.alunosAtendidos ?? 0),
        ganhosMes: Number(resumo.ganhosMes ?? 0),
      },
      configuracoesEnsino: {
        valorHoraOnline: ensino.precoHoraOnline === null || ensino.precoHoraOnline === undefined
          ? undefined
          : Number(ensino.precoHoraOnline),
        valorHoraPresencial: ensino.precoHoraPresencial === null || ensino.precoHoraPresencial === undefined
          ? undefined
          : Number(ensino.precoHoraPresencial),
        permitePresencial: ensino.aceitaPresencial === true || perfil.oferecePresencial === true,
        raioAtendimentoKm: perfil.raioAtendimentoKm === null || perfil.raioAtendimentoKm === undefined
          ? undefined
          : Number(perfil.raioAtendimentoKm),
        chavePix: String(ensino.chavePix ?? ""),
      },
      saberes: (Array.isArray(perfil.aptidoes) ? perfil.aptidoes : []).map((item: any) => ({
        id: Number(item.saberId ?? item.id),
        nome: String(item.nome ?? ""),
        nivel: String(item.nivel ?? ""),
      })),
      disponibilidades: (Array.isArray(perfil.disponibilidades) ? perfil.disponibilidades : []).map((item: any) => ({
        diaSemana: String(item.diaSemana ?? ""),
        horaInicio: String(item.horaInicio ?? ""),
        horaFim: String(item.horaFim ?? ""),
      })),
    },
  };
}

export async function salvarPerfilProfessor(
  usuarioId: number,
  novosDados: Partial<PerfilProfessorData>
): Promise<boolean> {
  await apiFetch(`${API_URL}/api/v1/perfil/professor/${usuarioId}`, {
    method: "PUT",
    body: JSON.stringify({
      nome: novosDados.nome,
      bio: novosDados.bio,
      telefone: novosDados.telefone,
      cidade: novosDados.cidade,
      estado: novosDados.estado,
      fotoUrl: novosDados.fotoUrl,
      titulacao: novosDados.titulacao,
      precoHoraOnline: novosDados.configuracoesEnsino?.valorHoraOnline,
      precoHoraPresencial: novosDados.configuracoesEnsino?.valorHoraPresencial,
      chavePix: novosDados.configuracoesEnsino?.chavePix,
      oferecePresencial: novosDados.configuracoesEnsino?.permitePresencial,
      raioAtendimentoKm: novosDados.configuracoesEnsino?.raioAtendimentoKm,
    }),
  });
  return true;
}
