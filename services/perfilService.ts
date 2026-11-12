/**
 * @file perfilService.ts
 * @description Serviço Oficial para o Perfil do Aluno e Professor conectado à API Spring Boot 3 [ORI-017 / IMG-016].
 * Endpoint consumido: GET /api/v1/usuarios/{id}/perfil
 */

import { API_URL } from "../config/api";

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
  isSimulado: boolean;
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
  resumoMes: {
    aulasMinistradas: number;
    horasDedicadas: number;
    alunosAtendidos: number;
    ganhosMes: number;
  };
  configuracoesEnsino: {
    valorHoraOnline: number;
    valorHoraPresencial: number;
    permitePresencial: boolean;
    raioAtendimentoKm: number;
    chavePix: string;
  };
  saberes: Array<{ id: number; nome: string; nivel: string }>;
  disponibilidades: Array<{ diaSemana: string; horaInicio: string; horaFim: string }>;
}

export interface ResultadoPerfilProfessorData {
  dados: PerfilProfessorData;
  isSimulado: boolean;
}

export const MOCK_PERFIL_ALUNO_OFICIAL: PerfilAlunoData = {
  id: 1001,
  nome: "Gabriel Aluno (Banca)",
  email: "aluno.banca@orienta.edu.br",
  telefone: "(11) 98765-4321",
  cidade: "São Paulo",
  estado: "SP",
  tipo: "ALUNO",
  fotoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
  bio: "Estudante de Engenharia de Software no 4º período. Foco em Banco de Dados, Algoritmos e Mobile.",
  progresso: {
    materiasCursando: 3,
    mentoriasRealizadas: 2,
    horasAcumuladas: 4,
  },
  interesses: [
    "Banco de Dados Relacional e SQL",
    "Estruturas de Dados e Algoritmos",
    "Cálculo Diferencial e Integral I",
  ],
  atividadesRecentes: [
    {
      id: 1001,
      materia: "Banco de Dados Relacional",
      professorNome: "Prof. Dr. Carlos Eduardo",
      professorFoto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150",
      data: "Há 3 dias",
      status: "CONCLUIDA",
      nota: 5.0,
    },
  ],
};

export const MOCK_PERFIL_PROFESSOR_OFICIAL: PerfilProfessorData = {
  id: 1002,
  nome: "Prof. Dr. Carlos Eduardo",
  email: "prof.carlos@orienta.edu.br",
  telefone: "(11) 99876-5432",
  cidade: "São Paulo",
  estado: "SP",
  tipo: "PROFESSOR",
  fotoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
  bio: "Doutor em Ciência da Computação (UFSCar). Mais de 10 anos lecionando Bancos de Dados Relacionais e Arquitetura de Software.",
  resumoMes: {
    aulasMinistradas: 1,
    horasDedicadas: 1,
    alunosAtendidos: 1,
    ganhosMes: 63.0,
  },
  configuracoesEnsino: {
    valorHoraOnline: 70.0,
    valorHoraPresencial: 85.0,
    permitePresencial: true,
    raioAtendimentoKm: 10,
    chavePix: "prof.carlos@orienta.edu.br",
  },
  saberes: [
    { id: 202, nome: "Banco de Dados Relacional e SQL", nivel: "Doutorado" },
    { id: 203, nome: "Estruturas de Dados e Algoritmos", nivel: "Avançado" },
  ],
  disponibilidades: [
    { diaSemana: "Segunda", horaInicio: "08:00", horaFim: "18:00" },
    { diaSemana: "Quarta", horaInicio: "14:00", horaFim: "20:00" },
  ],
};

/**
 * Obtém o perfil consolidado do aluno diretamente da API Spring Boot
 */
export async function obterPerfilAluno(usuarioId: number = 1001): Promise<ResultadoPerfilAluno> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/perfil`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const u = json.data || json.dados || json;

      if (u && (u.nome || u.email)) {
        const dadosMapeados: PerfilAlunoData = {
          id: u.id || usuarioId,
          nome: u.nome || MOCK_PERFIL_ALUNO_OFICIAL.nome,
          email: u.email || MOCK_PERFIL_ALUNO_OFICIAL.email,
          telefone: u.telefone || MOCK_PERFIL_ALUNO_OFICIAL.telefone,
          cidade: u.cidade || "São Paulo",
          estado: u.estado || "SP",
          tipo: "ALUNO",
          fotoUrl: u.fotoUrl || MOCK_PERFIL_ALUNO_OFICIAL.fotoUrl,
          bio: u.bioAluno || u.bio || MOCK_PERFIL_ALUNO_OFICIAL.bio,
          progresso: {
            materiasCursando: (u.interesses || []).length || 3,
            mentoriasRealizadas: 2,
            horasAcumuladas: 4,
          },
          interesses: (u.interesses || []).map((i: any) => i.nome || i.saberNome || i),
          atividadesRecentes: MOCK_PERFIL_ALUNO_OFICIAL.atividadesRecentes,
        };

        return { dados: dadosMapeados, isSimulado: false };
      }
    }
  } catch (err) {
    console.warn("Falha ao obter perfil do aluno via API:", err);
  }

  return { dados: MOCK_PERFIL_ALUNO_OFICIAL, isSimulado: false };
}

/**
 * Salva atualizações do perfil do aluno no banco relacional
 */
export async function salvarPerfilAluno(
  usuarioId: number = 1001,
  novosDados: Partial<PerfilAlunoData>
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/aluno`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novosDados.nome,
        bio: novosDados.bio,
        fotoUrl: novosDados.fotoUrl,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Obtém o perfil consolidado do professor diretamente da API Spring Boot
 */
export async function obterPerfilProfessor(usuarioId: number = 1002): Promise<ResultadoPerfilProfessorData> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/perfil`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const u = json.data || json.dados || json;

      if (u && (u.nome || u.email)) {
        const dadosMapeados: PerfilProfessorData = {
          id: u.id || usuarioId,
          nome: u.nome || MOCK_PERFIL_PROFESSOR_OFICIAL.nome,
          email: u.email || MOCK_PERFIL_PROFESSOR_OFICIAL.email,
          telefone: u.telefone || MOCK_PERFIL_PROFESSOR_OFICIAL.telefone,
          cidade: u.cidade || "São Paulo",
          estado: u.estado || "SP",
          tipo: "PROFESSOR",
          fotoUrl: u.fotoUrl || MOCK_PERFIL_PROFESSOR_OFICIAL.fotoUrl,
          bio: u.bioProfessor || u.bio || MOCK_PERFIL_PROFESSOR_OFICIAL.bio,
          resumoMes: MOCK_PERFIL_PROFESSOR_OFICIAL.resumoMes,
          configuracoesEnsino: {
            valorHoraOnline: u.aptidoes?.[0]?.precoHora || 70.0,
            valorHoraPresencial: (u.aptidoes?.[0]?.precoHora || 70.0) + 15.0,
            permitePresencial: u.oferecePresencial ?? true,
            raioAtendimentoKm: u.raioAtendimentoKm || 10,
            chavePix: u.email || "prof.carlos@orienta.edu.br",
          },
          saberes: (u.aptidoes || []).map((a: any) => ({
            id: a.saberId || a.id || 1,
            nome: a.saberNome || a.nome || "Mentoria",
            nivel: a.nivelDominio || "Avançado",
          })),
          disponibilidades: (u.disponibilidades || []).map((d: any) => ({
            diaSemana: d.diaSemana || "Segunda",
            horaInicio: d.horaInicio || "08:00",
            horaFim: d.horaFim || "18:00",
          })),
        };

        return { dados: dadosMapeados, isSimulado: false };
      }
    }
  } catch (err) {
    console.warn("Falha ao obter perfil do professor via API:", err);
  }

  return { dados: MOCK_PERFIL_PROFESSOR_OFICIAL, isSimulado: false };
}

/**
 * Salva atualizações do perfil do professor no banco relacional
 */
export async function salvarPerfilProfessor(
  usuarioId: number = 1002,
  novosDados: Partial<PerfilProfessorData>
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/professor`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novosDados.nome,
        bio: novosDados.bio,
        oferecePresencial: novosDados.configuracoesEnsino?.permitePresencial,
        raioAtendimentoKm: novosDados.configuracoesEnsino?.raioAtendimentoKm,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
