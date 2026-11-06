/**
 * Serviço de integração com o endpoint determinístico da API Spring Boot.
 * Suporta fallback local caso a API esteja temporariamente indisponível.
 * Rastreabilidade: Fase 7 - Bloco L (Tarefa [BACK-018])
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = await AsyncStorage.getItem('@orienta_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return headers;
}

export async function enviarPassoTriagem(request: TriageRequest): Promise<TriageResponse> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/assistente/triagem`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Erro na API de triagem: ${response.status}`);
    }

    const json = await response.json();
    return json && json.data ? json.data : json;
  } catch (error) {
    console.warn('Falha na conexão com backend local. Acionando fallback determinístico offline:', error);
    return getOfflineFallbackResponse(request);
  }
}

/**
 * Envia pergunta livre contextualizada ou chip pedagógico para o assistente da API.
 */
export async function perguntarAssistente(request: PerguntaRequest): Promise<TriageResponse> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/assistente/perguntar`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Erro na API ao enviar pergunta: ${response.status}`);
    }

    const json = await response.json();
    return json && json.data ? json.data : json;
  } catch (error) {
    console.warn('Falha na conexão com backend local. Acionando fallback determinístico de pergunta:', error);
    return getOfflineFallbackPergunta(request);
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

/**
 * Fallback offline para perguntas pedagógicas.
 */
function getOfflineFallbackPergunta(request: PerguntaRequest): TriageResponse {
  const isCalc = (request.pergunta + ' ' + (request.disciplina || '')).toLowerCase().includes('calculo');
  return {
    assistantMessage: isCalc
      ? 'Vamos resolver passo a passo! Para integrais por partes, aplicamos a regra fundamental LIATE:'
      : 'Aqui está a síntese analítica da disciplina para orientar seus estudos:',
    formula: isCalc ? '∫ u dv = u·v - ∫ v du' : undefined,
    codeSnippet: !isCalc ? '// Algoritmo ou Propriedade Invariante:\nNodo raiz;' : undefined,
    bulletPoints: [
      '1. Mapeie as premissas e variáveis fundamentais',
      '2. Aplique a metodologia de dedução passo a passo',
      '3. Valide o resultado com os exercícios das listas recomendadas',
    ],
    nextStep: 'RECOMMENDATION',
    quickOptions: [
      { id: '1', label: '📐 Explicar Exercício', payload: 'EXPLICAR_EXERCICIO' },
      { id: '2', label: '📝 Gerar Resumo', payload: 'GERAR_RESUMO' },
      { id: '3', label: '💡 Dicas de Estudo', payload: 'DICAS_PROVA' },
    ],
    recommendedTeachers: [],
    isDeterministicRuleBased: true,
    ruleReferenceCode: 'OFFLINE_PEDAGOGIC_FALLBACK',
  };
}
