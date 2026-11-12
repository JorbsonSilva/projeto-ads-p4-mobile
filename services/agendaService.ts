/**
 * @file agendaService.ts
 * @description Serviço Oficial de Agenda Unificada conectado aos endpoints REST da API Orienta (ORI-012).
 * 
 * Endpoints consumidos:
 * - GET /api/v1/agendamentos/aluno/{id}
 * - GET /api/v1/agendamentos/professor/{id}
 * - PUT /api/v1/agendamentos/{id}/aceitar
 * - PUT /api/v1/agendamentos/{id}/recusar
 */

import { API_URL } from "../config/api";

export type PerfilAgenda = "ALUNO" | "PROFESSOR";

export interface SolicitacaoAula {
  id: number;
  alunoNome: string;
  alunoFoto: string;
  materia: string;
  modalidade: "Presencial" | "Online";
  horario: string;
  status: "PENDENTE" | "ACEITA" | "RECUSADA";
  online: boolean;
}

export interface CompromissoAgenda {
  id: number;
  nome: string;
  foto: string;
  tituloProfissional?: string;
  materia: string;
  horario: string;
  modalidade: "Online" | "Presencial";
  localizacao?: string;
  status: "Confirmada" | "Pendente" | "Cancelada";
  tipo: "AULA" | "MENTORIA";
  online: boolean;
}

export interface AgendaCompleta {
  perfil: PerfilAgenda;
  solicitacoes: SolicitacaoAula[];
  aulasProfessor: CompromissoAgenda[];
  aulasAluno: CompromissoAgenda[];
  mentoriasAluno: CompromissoAgenda[];
  isSimulado: boolean;
}

/**
 * Consulta a agenda diretamente da API REST do Spring Boot
 */
export async function obterAgendaComFallback(
  perfil: PerfilAgenda,
  usuarioId: number = 1001
): Promise<AgendaCompleta> {
  const agenda: AgendaCompleta = {
    perfil,
    solicitacoes: [],
    aulasProfessor: [],
    aulasAluno: [],
    mentoriasAluno: [],
    isSimulado: false,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const rota =
      perfil === "PROFESSOR"
        ? `${API_URL}/api/v1/agendamentos/professor/${usuarioId}`
        : `${API_URL}/api/v1/agendamentos/aluno/${usuarioId}`;

    const res = await fetch(rota, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const itens: any[] = json.data || (Array.isArray(json) ? json : []);

      if (Array.isArray(itens)) {
        itens.forEach((item) => {
          const statusNormalizado = (item.status || "").toUpperCase();
          const modalidadeFormatada =
            item.modalidade === "PRESENCIAL" ? "Presencial" : "Online";
          const horarioFormatado = `${item.data || ""} ${item.hora || ""}`.trim();

          if (perfil === "PROFESSOR") {
            if (statusNormalizado === "PENDENTE") {
              agenda.solicitacoes.push({
                id: item.id,
                alunoNome: item.alunoNome || `Aluno #${item.alunoId}`,
                alunoFoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                materia: item.disciplinaNome || "Mentoria",
                modalidade: modalidadeFormatada as any,
                horario: horarioFormatado,
                status: "PENDENTE",
                online: item.modalidade === "ONLINE",
              });
            } else {
              agenda.aulasProfessor.push({
                id: item.id,
                nome: item.alunoNome || `Aluno #${item.alunoId}`,
                foto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                materia: item.disciplinaNome || "Mentoria",
                modalidade: modalidadeFormatada as any,
                horario: horarioFormatado,
                status:
                  statusNormalizado === "CONFIRMADO" || statusNormalizado === "REALIZADA"
                    ? "Confirmada"
                    : statusNormalizado === "CANCELADO"
                    ? "Cancelada"
                    : "Pendente",
                tipo: "AULA",
                online: item.modalidade === "ONLINE",
              });
            }
          } else {
            // Perfil ALUNO
            const compromisso: CompromissoAgenda = {
              id: item.id,
              nome: item.professorNome || `Prof. #${item.professorId}`,
              foto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
              tituloProfissional: "Docente Orienta",
              materia: item.disciplinaNome || "Mentoria Acadêmica",
              horario: horarioFormatado,
              modalidade: modalidadeFormatada as any,
              localizacao:
                item.modalidade === "PRESENCIAL"
                  ? item.regiaoOuLocalReferencia || "Presencial"
                  : "Online via Plataforma",
              status:
                statusNormalizado === "CONFIRMADO" || statusNormalizado === "REALIZADA"
                  ? "Confirmada"
                  : statusNormalizado === "CANCELADO"
                  ? "Cancelada"
                  : "Pendente",
              tipo: item.modalidade === "ONLINE" ? "MENTORIA" : "AULA",
              online: item.modalidade === "ONLINE",
            };

            if (item.modalidade === "ONLINE") {
              agenda.mentoriasAluno.push(compromisso);
            } else {
              agenda.aulasAluno.push(compromisso);
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn("Falha ao obter agenda da API:", err);
  }

  return agenda;
}

/**
 * Aceitar solicitação de aula (Professor)
 */
export async function aceitarSolicitacaoComFallback(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/agendamentos/${id}/aceitar`, {
      method: "PUT",
      headers: { Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Recusar solicitação de aula (Professor)
 */
export async function recusarSolicitacaoComFallback(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/agendamentos/${id}/recusar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ motivo: "Indisponibilidade de horário na agenda" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
