/**
 * @file perfilService.ts
 * @description Serviço híbrido resiliente para o Perfil do Aluno [ORI-017 / IMG-016].
 * Conecta aos endpoints REST (/api/v1/usuarios/{id}/perfil) com fallback imediato
 * para dados de demonstração offline e badge de modo de simulação.
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

export const MOCK_PERFIL_ALUNO_OFICIAL: PerfilAlunoData = {
  id: 1,
  nome: "Jorbson Silva",
  email: "jorbson.silva@academico.ufpb.br",
  telefone: "(83) 98765-4321",
  cidade: "João Pessoa",
  estado: "PB",
  tipo: "ALUNO",
  fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  bio: "Estudante de Análise e Desenvolvimento de Sistemas (UFPB). Apaixonado por engenharia de software, computação em nuvem e resolução de problemas complexos. Buscando aprimorar conceitos de Cálculo e Algoritmos.",
  progresso: {
    materiasCursando: 7,
    mentoriasRealizadas: 12,
    horasAcumuladas: 45,
  },
  interesses: [
    "Cálculo I",
    "Estrutura de Dados",
    "Python",
    "Algoritmos Avançados",
    "Física Mecânica",
    "Banco de Dados SQL",
  ],
  atividadesRecentes: [
    {
      id: 101,
      materia: "Cálculo Diferencial e Integral",
      professorNome: "Prof. Lucas Rocha",
      professorFoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      data: "Hoje às 15:00",
      status: "CONFIRMADA",
      nota: 5.0,
    },
    {
      id: 102,
      materia: "Programação e Algoritmos",
      professorNome: "Prof. Rafael Lima",
      professorFoto: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      data: "2 de Nov às 14:00",
      status: "CONCLUIDA",
      nota: 4.9,
    },
    {
      id: 103,
      materia: "Biologia Celular",
      professorNome: "Profa. Ana Clara",
      professorFoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      data: "28 de Out às 16:30",
      status: "CONCLUIDA",
      nota: 5.0,
    },
  ],
};

let perfilEmMemoria: PerfilAlunoData = { ...MOCK_PERFIL_ALUNO_OFICIAL };

/**
 * Consulta o perfil do aluno com resiliência contra indisponibilidade da API local.
 */
export async function obterPerfilAluno(
  usuarioId: number = 1
): Promise<ResultadoPerfilAluno> {
  const isDemo =
    typeof window !== "undefined" &&
    (window.location.search.includes("demo=true") ||
      window.location.search.includes("preview=true") ||
      window.location.protocol === "https:");

  if (isDemo) {
    return {
      dados: { ...perfilEmMemoria },
      isSimulado: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/perfil`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const u = json.dados || json.data || json;

      if (u && (u.nome || u.email)) {
        const dadosMapeados: PerfilAlunoData = {
          id: u.id || usuarioId,
          nome: u.nome || perfilEmMemoria.nome,
          email: u.email || perfilEmMemoria.email,
          telefone: u.telefone || perfilEmMemoria.telefone,
          cidade: u.cidade || "João Pessoa",
          estado: u.estado || "PB",
          tipo: "ALUNO",
          fotoUrl: u.fotoUrl || perfilEmMemoria.fotoUrl,
          bio: u.bioAluno || u.bio || perfilEmMemoria.bio,
          progresso: {
            materiasCursando: u.interesses?.length || 7,
            mentoriasRealizadas: perfilEmMemoria.progresso.mentoriasRealizadas,
            horasAcumuladas: perfilEmMemoria.progresso.horasAcumuladas,
          },
          interesses:
            u.interesses && u.interesses.length > 0
              ? u.interesses.map((i: any) => i.saber?.nome || i.nome || i)
              : perfilEmMemoria.interesses,
          atividadesRecentes: perfilEmMemoria.atividadesRecentes,
        };

        perfilEmMemoria = dadosMapeados;
        return {
          dados: dadosMapeados,
          isSimulado: false,
        };
      }
    }

    return {
      dados: { ...perfilEmMemoria },
      isSimulado: true,
    };
  } catch {
    return {
      dados: { ...perfilEmMemoria },
      isSimulado: true,
    };
  }
}

/**
 * Salva atualizações do perfil do aluno em memória e tenta sincronizar com o backend.
 */
export async function salvarPerfilAluno(
  usuarioId: number = 1,
  novosDados: Partial<PerfilAlunoData>
): Promise<boolean> {
  perfilEmMemoria = {
    ...perfilEmMemoria,
    ...novosDados,
    progresso: {
      ...perfilEmMemoria.progresso,
      ...(novosDados.progresso || {}),
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/aluno`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novosDados.nome || perfilEmMemoria.nome,
        bio: novosDados.bio || perfilEmMemoria.bio,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return true; // Sucesso na simulação local
  }
}

// ==============================================================================
// 2. CONTRATOS E SERVIÇOS DO PERFIL DO PROFESSOR [ORI-018 / IMG-017]
// ==============================================================================

export interface AvaliacaoRecenteDocente {
  id: number;
  alunoNome: string;
  alunoFoto: string;
  materia: string;
  nota: number;
  comentario: string;
  data: string;
}

export interface ResumoMesDocente {
  aulasRealizadas: number;
  alunosAtendidos: number;
  horasMinistradas: number;
  ganhosMes: number;
}

export interface ConfiguracoesEnsinoDocente {
  precoHoraOnline: number;
  precoHoraPresencial: number;
  aceitaOnline: boolean;
  aceitaPresencial: boolean;
  chavePix: string;
  tipoChavePix: "CPF" | "EMAIL" | "TELEFONE" | "ALEATORIA";
  banco: string;
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
  titulacao: string;
  bio: string;
  resumoMes: ResumoMesDocente;
  configuracoesEnsino: ConfiguracoesEnsinoDocente;
  materias: string[];
  avaliacoesRecentes: AvaliacaoRecenteDocente[];
}

export interface ResultadoPerfilProfessor {
  dados: PerfilProfessorData;
  isSimulado: boolean;
}

export const MOCK_PERFIL_PROFESSOR_OFICIAL: PerfilProfessorData = {
  id: 2,
  nome: "Prof. Carlos Mendes",
  email: "carlos.mendes@orienta.edu.br",
  telefone: "(83) 99123-4567",
  cidade: "Campina Grande",
  estado: "PB",
  tipo: "PROFESSOR",
  fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  titulacao: "Mestre em Ciência da Computação • UFCG",
  bio: "Professor universitário e pesquisador com mais de 8 anos de experiência docente. Especialista em Matemática Discreta, Algoritmos Avançados e Engenharia de Software. Foco em metodologia ativa e resolução de problemas reais.",
  resumoMes: {
    aulasRealizadas: 24,
    alunosAtendidos: 38,
    horasMinistradas: 36,
    ganhosMes: 2480.0,
  },
  configuracoesEnsino: {
    precoHoraOnline: 60.0,
    precoHoraPresencial: 80.0,
    aceitaOnline: true,
    aceitaPresencial: true,
    chavePix: "carlos.mendes@orienta.edu.br",
    tipoChavePix: "EMAIL",
    banco: "Banco do Brasil - Ag 1234 CC 56789-0",
  },
  materias: [
    "Matemática Discreta",
    "Cálculo I e II",
    "Álgebra Linear",
    "Algoritmos e Estrutura de Dados",
    "Banco de Dados SQL",
  ],
  avaliacoesRecentes: [
    {
      id: 201,
      alunoNome: "Mariana Souza",
      alunoFoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      materia: "Cálculo Diferencial",
      nota: 5.0,
      comentario: "Excelente didática! Consegui entender derivadas parciais em apenas duas aulas.",
      data: "Hoje às 11:30",
    },
    {
      id: 202,
      alunoNome: "Rafael Lima",
      alunoFoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      materia: "Álgebra Linear",
      nota: 5.0,
      comentario: "Muito atencioso e pontual. Material de apoio impecável.",
      data: "Ontem às 17:00",
    },
    {
      id: 203,
      alunoNome: "Beatriz Costa",
      alunoFoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
      materia: "Estrutura de Dados",
      nota: 4.9,
      comentario: "Explicou árvores binárias de um jeito muito simples e prático. Recomendo demais!",
      data: "3 dias atrás",
    },
  ],
};

let perfilProfessorEmMemoria: PerfilProfessorData = {
  ...MOCK_PERFIL_PROFESSOR_OFICIAL,
};

/**
 * Consulta o perfil do professor com resiliência contra indisponibilidade da API.
 */
export async function obterPerfilProfessor(
  usuarioId: number = 2
): Promise<ResultadoPerfilProfessor> {
  const isDemo =
    typeof window !== "undefined" &&
    (window.location.search.includes("demo=true") ||
      window.location.search.includes("preview=true") ||
      window.location.protocol === "https:");

  if (isDemo) {
    return {
      dados: { ...perfilProfessorEmMemoria },
      isSimulado: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/perfil`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const u = json.dados || json.data || json;

      if (u && (u.nome || u.email)) {
        const dadosMapeados: PerfilProfessorData = {
          ...perfilProfessorEmMemoria,
          id: u.id || usuarioId,
          nome: u.nome || perfilProfessorEmMemoria.nome,
          email: u.email || perfilProfessorEmMemoria.email,
          telefone: u.telefone || perfilProfessorEmMemoria.telefone,
          cidade: u.cidade || "Campina Grande",
          estado: u.estado || "PB",
          fotoUrl: u.fotoUrl || perfilProfessorEmMemoria.fotoUrl,
          bio: u.bioProfessor || u.bio || perfilProfessorEmMemoria.bio,
        };

        perfilProfessorEmMemoria = dadosMapeados;
        return {
          dados: dadosMapeados,
          isSimulado: false,
        };
      }
    }

    return {
      dados: { ...perfilProfessorEmMemoria },
      isSimulado: true,
    };
  } catch {
    return {
      dados: { ...perfilProfessorEmMemoria },
      isSimulado: true,
    };
  }
}

/**
 * Salva atualizações do perfil do professor em memória e tenta sincronizar com o backend.
 */
export async function salvarPerfilProfessor(
  usuarioId: number = 2,
  novosDados: Partial<PerfilProfessorData>
): Promise<boolean> {
  perfilProfessorEmMemoria = {
    ...perfilProfessorEmMemoria,
    ...novosDados,
    resumoMes: {
      ...perfilProfessorEmMemoria.resumoMes,
      ...(novosDados.resumoMes || {}),
    },
    configuracoesEnsino: {
      ...perfilProfessorEmMemoria.configuracoesEnsino,
      ...(novosDados.configuracoesEnsino || {}),
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}/professor`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novosDados.nome || perfilProfessorEmMemoria.nome,
        bio: novosDados.bio || perfilProfessorEmMemoria.bio,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return true; // Sucesso na simulação local
  }
}

