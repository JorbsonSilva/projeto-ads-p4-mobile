/**
 * Serviço de integração com o endpoint determinístico da API Spring Boot.
 * Suporta fallback local caso a API esteja temporariamente indisponível.
 */
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
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export async function enviarPassoTriagem(request: TriageRequest): Promise<TriageResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/assistente/triagem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Erro na API de triagem: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Falha na conexão com backend local. Acionando fallback determinístico offline:', error);
    return getOfflineFallbackResponse(request);
  }
}

/**
 * Fallback determinístico offline caso a rede esteja desconectada.
 */
function getOfflineFallbackResponse(request: TriageRequest): TriageResponse {
  return {
    assistantMessage: 'Olá! Sou o Assistente de Triagem do Orienta operando em modo offline de contingência. Escolha a disciplina desejada:',
    nextStep: 'SUBJECT_SELECTION',
    quickOptions: [
      { id: '1', label: 'Cálculo I', payload: 'Cálculo I', description: 'Limites, Derivadas e Integrais' },
      { id: '2', label: 'Estrutura de Dados', payload: 'Estrutura de Dados', description: 'Vetores, Listas, Árvores' },
      { id: '3', label: 'Banco de Dados', payload: 'Banco de Dados', description: 'SQL, Normalização' },
    ],
    recommendedTeachers: [],
    isDeterministicRuleBased: true,
    ruleReferenceCode: 'OFFLINE_FALLBACK_RULE_V9',
  };
}
