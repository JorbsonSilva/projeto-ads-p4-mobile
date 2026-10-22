/**
 * Tipos TypeScript de Agendamento alinhados estritamente com o enum Java StatusAgendamento.
 * Rastreabilidade: Fase 4 - f4-t7
 */
export type StatusAgendamento =
  | 'PENDENTE'
  | 'CONFIRMADO'
  | 'RECUSADO'
  | 'CANCELADO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_CONFIRMACAO'
  | 'REALIZADA';

export interface Agendamento {
  id: number;
  alunoId: number;
  alunoNome: string;
  alunoEmail?: string;
  professorId: number;
  professorNome: string;
  professorEmail?: string;
  data: string; // Formato YYYY-MM-DD
  hora: string; // Formato HH:mm:ss
  status: StatusAgendamento;
  justificativaCancelamento?: string;
  modalidade?: string;
  assunto?: string;
}

export interface AgendamentoRequest {
  idAluno: number;
  idProfessor: number;
  data: string;
  hora: string;
  modalidade?: string;
  assunto?: string;
}

export interface RemarcarAgendamentoRequest {
  data: string;
  hora: string;
  motivo?: string;
}

export interface JustificativaRequest {
  justificativa: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}
