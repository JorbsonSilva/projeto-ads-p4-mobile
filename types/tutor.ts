/** Envelope público do Tutor no Spring. Campos nulos são omitidos pelo Java. */
export interface TutorApiResponse<T> {
  success: boolean;
  status: number;
  message?: string;
  data: T;
  timestamp: string;
}

export interface TutorConversaDTO {
  conversaId: string;
  expiraEm: string;
}

export interface TutorMensagemRequestDTO {
  mensagemId: string;
  pergunta: string;
}

export type TutorResultado = 'RESPONDIDA' | 'SEM_EVIDENCIA';
// DETERMINISTICO existe no enum Java, mas o TutorService não o produz atualmente.
export type TutorOrigem = 'SIMULADO' | 'DEMONSTRATIVO' | 'RAG' | 'DETERMINISTICO';

export interface TutorRespostaDTO {
  conversaId: string;
  mensagemId: string;
  resultado: TutorResultado;
  resposta: string;
  origem: TutorOrigem;
  evidencias: TutorEvidenciaDTO[];
}

export interface TutorEvidenciaDTO {
  id: string;
  versaoCorpus: number;
}

export interface TutorEncerramentoDTO {
  conversaId: string;
}

export interface TutorErroDTO {
  codigo: string;
  reenviavel: boolean;
}
