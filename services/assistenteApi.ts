import { API_V1_URL, apiFetch, extrairDadosObjeto } from "../config/api";

export interface TriageRequest {
  currentStep?: string;
  userMessage?: string;
  disciplinaId?: number;
  disciplinaNome?: string;
  assuntoId?: number;
  assuntoNome?: string;
  modalidade?: string;
  orcamentoMaximo?: number;
  bairroFiltro?: string;
  selectedOptionPayload?: string;
  chipTipo?: string;
}

export interface QuickOption {
  id: string;
  label: string;
  payload: string;
  description?: string;
}

export interface ProfessorResumo {
  id: number;
  nome: string;
  tituloAcademico: string;
  valorHora: number;
  avaliacaoMedia: number;
  totalAvaliacoes: number;
  modalidades: string[];
  regiaoBairro: string;
  disciplinas: string[];
  disponivelEstaSemana: boolean;
}

export interface ActionCard {
  professorId: number;
  professorNome: string;
  disciplinaNome: string;
  assuntoNome: string;
  modalidade: string;
  valorHora: number;
  targetScreenRoute: string;
  safetyNotice: string;
  requiresUserConfirmation: boolean;
}

export interface TriageResponse {
  assistantMessage: string;
  nextStep: string;
  quickOptions: QuickOption[];
  recommendedTeachers: ProfessorResumo[];
  actionCard?: ActionCard;
  supportTicketDraftProtocol?: string;
  isDeterministicRuleBased: boolean;
  ruleReferenceCode: string;
  formula?: string;
  codeSnippet?: string;
  bulletPoints?: string[];
}

export interface PerguntaRequest {
  pergunta: string;
  disciplina?: string;
  assunto?: string;
  chipTipo?: string;
  modalidade?: string;
  orcamentoMaximo?: number;
}

export async function enviarPassoTriagem(request: TriageRequest): Promise<TriageResponse> {
  const response = await apiFetch(`${API_V1_URL}/assistente/triagem`, {
    method: "POST",
    body: JSON.stringify(request),
  });
  return extrairDadosObjeto<TriageResponse>(await response.json());
}

export async function perguntarAssistente(request: PerguntaRequest): Promise<TriageResponse> {
  const response = await apiFetch(`${API_V1_URL}/assistente/perguntar`, {
    method: "POST",
    body: JSON.stringify(request),
  });
  return extrairDadosObjeto<TriageResponse>(await response.json());
}
