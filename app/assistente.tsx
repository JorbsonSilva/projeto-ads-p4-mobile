import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Send,
  RotateCcw,
  Sparkles,
  User,
  Bot,
  ChevronLeft,
  Paperclip,
  Star,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react-native';
import { RuleIndicatorBadge } from '../components/RuleIndicatorBadge';
import { AssistantSummaryCard } from '../components/AssistantSummaryCard';
import { ModalAvaliacao, DadosAvaliacao } from '../components/ModalAvaliacao';
import TabBarRN001 from '../components/navigation/TabBarRN001';
import {
  enviarPassoTriagem,
  perguntarAssistente,
  TriageRequest,
  TriageResponse,
  QuickOption,
} from '../services/assistenteApi';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  codeSnippet?: string;
  formula?: string;
  actionCard?: any;
  bulletPoints?: string[];
  recommendedTutors?: {
    id: number;
    nome: string;
    disciplina: string;
    preco: number;
    rating: number;
  }[];
}

const PROMPT_CHIPS = [
  { id: '1', label: '📐 Explicar Exercício', prompt: 'Pode me ajudar a resolver um exercício de Cálculo com integrais por partes?' },
  { id: '2', label: '📝 Gerar Resumo', prompt: 'Gere um resumo sobre Árvores Binárias de Busca em Estrutura de Dados.' },
  { id: '3', label: '💡 Dicas de Estudo', prompt: 'Quais as melhores técnicas de memorização para provas de exatas?' },
  { id: '4', label: '📅 Plano de Estudos', prompt: 'Monte um plano de estudos semanal equilibrado para 3 disciplinas universitárias.' },
  { id: '5', label: '👨‍🏫 Encontrar Mentor', prompt: 'Quero indicação dos melhores professores de Cálculo e Algoritmos disponíveis.' },
];

export default function AssistenteScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('INITIAL');
  const [quickOptions, setQuickOptions] = useState<QuickOption[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOfflineSimulation, setIsOfflineSimulation] = useState<boolean>(true);
  const [modalAvaliacaoVisivel, setModalAvaliacaoVisivel] = useState<boolean>(false);
  const [alertaAvaliacaoSucesso, setAlertaAvaliacaoSucesso] = useState<string | null>(null);

  // Estados acumulados da triagem
  const [disciplinaNome, setDisciplinaNome] = useState<string>('Cálculo I');
  const [assuntoNome, setAssuntoNome] = useState<string>('Integrais e Derivadas');
  const [modalidade, setModalidade] = useState<string>('Online');

  useEffect(() => {
    iniciarConversaInicial();
  }, []);

  const iniciarConversaInicial = async () => {
    setIsLoading(true);
    try {
      const response = await enviarPassoTriagem({ currentStep: 'INITIAL' });
      setCurrentStep(response.nextStep || 'SUBJECT_SELECTION');
      setQuickOptions(
        response.quickOptions && response.quickOptions.length > 0
          ? response.quickOptions
          : [
              { id: '1', label: 'Cálculo I', payload: 'Cálculo I', description: 'Limites, Derivadas e Integrais' },
              { id: '2', label: 'Estrutura de Dados', payload: 'Estrutura de Dados', description: 'Vetores, Listas, Árvores' },
              { id: '3', label: 'Banco de Dados', payload: 'Banco de Dados', description: 'SQL, Normalização' },
              { id: '4', label: 'Física Geral', payload: 'Física Geral', description: 'Cinemática e Dinâmica' },
            ]
      );

      setMessages([
        {
          id: 'msg-init',
          sender: 'assistant',
          text: 'Olá! Sou o Tutor Virtual de Estudos do Orienta 2.0 🎓\n\nEstou aqui para tirar dúvidas conceituais, explicar exercícios passo a passo e conectar você aos melhores mentores da plataforma. Como posso te orientar hoje?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          bulletPoints: [
            'Resolução detalhada de exercícios de Exatas e Tecnologia',
            'Resumos teóricos estruturados para revisões de prova',
            'Sugestão personalizada de professores para agendamento seguro',
          ],
        },
      ]);
    } catch (error) {
      console.warn('Erro ao inicializar assistente:', error);
      setIsOfflineSimulation(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuickOption = async (option: QuickOption) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: option.label,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const req: TriageRequest = {
        currentStep,
        selectedOptionPayload: option.payload,
        disciplinaNome: option.payload,
        assuntoNome,
        modalidade,
      };

      const response: TriageResponse = await enviarPassoTriagem(req);

      setCurrentStep(response.nextStep || 'COMPLETED');
      setDisciplinaNome(option.payload);

      const assistMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: `Excelente escolha! Para ${option.payload}, temos docentes especializados com disponibilidade imediata para mentoria individual online ou presencial.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionCard: response.actionCard || {
          professorId: 1,
          professorNome: 'Prof. Lucas Rocha',
          disciplinaNome: option.payload,
          assuntoNome: 'Revisão e Resolução de Listas',
          modalidade: 'Online (Google Meet)',
          valorHora: 60.0,
        },
        bulletPoints: [
          'Professores verificados com nota média 4.9/5.0',
          'Sala de aula com temporizador bilateral e lousa integrada',
          'Garantia de segurança acadêmica Orienta 2.0',
        ],
      };

      setMessages((prev) => [...prev, assistMsg]);
    } catch (error) {
      console.error('Erro ao enviar opção rápida:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleSendPrompt = (promptText: string) => {
    setInputText(promptText);
  };

  const handleSendTextMessage = async () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await perguntarAssistente({
        pergunta: userText,
        disciplina: disciplinaNome,
        assunto: assuntoNome,
      });

      const assistMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.assistantMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formula: response.formula,
        codeSnippet: response.codeSnippet,
        bulletPoints: response.bulletPoints,
        actionCard: response.actionCard,
      };

      setMessages((prev) => [...prev, assistMsg]);
      if (response.quickOptions && response.quickOptions.length > 0) {
        setQuickOptions(response.quickOptions);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleNavigateToBooking = (professorId: number) => {
    router.push({
      pathname: '/professor/[id]' as any,
      params: { id: professorId, disciplina: disciplinaNome, assunto: assuntoNome },
    });
  };

  const handleConfirmarAvaliacao = (dados: DadosAvaliacao) => {
    setAlertaAvaliacaoSucesso(
      `Avaliação registrada com nota ${dados.notaGeral} estrelas e ${dados.tagsSelecionadas.length} elogios!`
    );
    setTimeout(() => {
      setAlertaAvaliacaoSucesso(null);
    }, 4500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header Institucional no Design System Claro */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.tutorAvatarHeader}>
            <Bot size={18} color="#FFFFFF" />
          </View>

          <View>
            <Text style={styles.headerTitle}>Tutor Virtual Orienta</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerSubtitle}>Assistente Acadêmico IA • Ativo</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => setModalAvaliacaoVisivel(true)}
            accessibilityLabel="Avaliar Mentoria"
          >
            <Star size={17} color="#D97706" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={iniciarConversaInicial}
            accessibilityLabel="Reiniciar Conversa"
          >
            <RotateCcw size={17} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner de Simulação e Transparência */}
      {isOfflineSimulation && (
        <View style={styles.bannerSimulacao}>
          <Sparkles size={14} color="#D97706" />
          <Text style={styles.bannerSimulacaoTexto}>
            ⚠️ Modo Simulação: Dados offline em exibição (ORI-029)
          </Text>
        </View>
      )}

      {/* Selo Obrigatório de Regras Determinísticas e Transparência */}
      <RuleIndicatorBadge />

      {/* Alerta de Feedback de Avaliação */}
      {alertaAvaliacaoSucesso && (
        <View style={styles.alertaSucessoBox}>
          <CheckCircle size={16} color="#059669" />
          <Text style={styles.alertaSucessoTexto}>{alertaAvaliacaoSucesso}</Text>
        </View>
      )}

      {/* Área Principal de Conversa */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((item) => (
          <View
            key={item.id}
            style={[
              styles.messageRow,
              item.sender === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
            ]}
          >
            {item.sender === 'assistant' && (
              <View style={styles.assistantAvatar}>
                <Bot size={16} color="#FF5A1F" />
              </View>
            )}

            <View style={{ maxWidth: '85%' }}>
              <View
                style={[
                  styles.bubble,
                  item.sender === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.sender === 'user' ? styles.messageTextUser : styles.messageTextAssistant,
                  ]}
                >
                  {item.text}
                </Text>

                {/* Bloco de Fórmula Matemática se houver */}
                {item.formula && (
                  <View style={styles.formulaBox}>
                    <Text style={styles.formulaLabel}>Expressão Matemática:</Text>
                    <Text style={styles.formulaText}>{item.formula}</Text>
                  </View>
                )}

                {/* Bloco de Código se houver */}
                {item.codeSnippet && (
                  <View style={styles.codeSnippetBox}>
                    <Text style={styles.codeSnippetLabel}>Estrutura Conceitual:</Text>
                    <Text style={styles.codeSnippetText}>{item.codeSnippet}</Text>
                  </View>
                )}

                {/* Tópicos Pedagógicos (Bullet Points) */}
                {item.bulletPoints && item.bulletPoints.length > 0 && (
                  <View style={styles.bulletContainer}>
                    {item.bulletPoints.map((pt, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{pt}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text
                  style={[
                    styles.timestamp,
                    item.sender === 'user' ? styles.timestampUser : styles.timestampAssistant,
                  ]}
                >
                  {item.timestamp}
                </Text>
              </View>

              {/* Card de Professor Recomendado & Agendamento */}
              {item.actionCard && (
                <AssistantSummaryCard
                  professorId={item.actionCard.professorId}
                  professorNome={item.actionCard.professorNome}
                  disciplinaNome={item.actionCard.disciplinaNome}
                  assuntoNome={item.actionCard.assuntoNome}
                  modalidade={item.actionCard.modalidade}
                  valorHora={item.actionCard.valorHora}
                  onNavigateToBooking={handleNavigateToBooking}
                />
              )}
            </View>

            {item.sender === 'user' && (
              <View style={styles.userAvatar}>
                <User size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FF5A1F" />
            <Text style={styles.loadingText}>Tutor formulando resposta pedagógica...</Text>
          </View>
        )}
      </ScrollView>

      {/* Chips Rápidos Pedagógicos de Perguntas Frequentes */}
      <View style={styles.promptsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptsScroll}
        >
          {PROMPT_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={styles.promptChip}
              onPress={() => handleSendPrompt(chip.prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.promptChipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Botões de Opções Rápidas de Disciplinas */}
      {quickOptions.length > 0 && !isLoading && (
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsHeader}>Explorar Disciplinas Recomendadas:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionsScroll}
          >
            {quickOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={styles.optionChip}
                onPress={() => handleSelectQuickOption(opt)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionChipText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Barra de Entrada de Mensagens e Digitação */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => {
            setInputText((prev) => (prev ? prev + ' [Exercício anexado]' : 'Exercício da lista 4: '));
          }}
          accessibilityLabel="Anexar dúvida"
        >
          <Paperclip size={18} color="#64748B" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Tire dúvidas, peça um resumo ou exercício..."
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendTextMessage}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSendTextMessage}
          disabled={!inputText.trim() || isLoading}
          activeOpacity={0.8}
        >
          <Send size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Barra Inferior Canônica de 5 Abas do Aluno (RN-001) */}
      <TabBarRN001 abaAtiva="chat" perfilForcado="Aluno" />

      {/* Modal Reutilizável de Avaliação Pós-Aula */}
      <ModalAvaliacao
        visible={modalAvaliacaoVisivel}
        onClose={() => setModalAvaliacaoVisivel(false)}
        onSubmit={handleConfirmarAvaliacao}
        professorNome="Prof. Lucas Rocha"
        disciplinaNome={disciplinaNome}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorAvatarHeader: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerSimulacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerSimulacaoTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  alertaSucessoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  alertaSucessoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
      },
      default: {
        elevation: 1,
      },
    }),
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleUser: {
    backgroundColor: '#FF5A1F',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  messageTextAssistant: {
    color: '#0F172A',
  },
  messageTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  formulaBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    marginTop: 10,
  },
  formulaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  formulaText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#0F172A',
    lineHeight: 18,
  },
  codeSnippetBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 10,
  },
  codeSnippetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  codeSnippetText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#0F172A',
    lineHeight: 17,
  },
  bulletContainer: {
    marginTop: 8,
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5A1F',
    marginTop: 6,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
    flex: 1,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  timestampAssistant: {
    color: '#94A3B8',
  },
  timestampUser: {
    color: '#FED7AA',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
  },
  promptsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
  },
  promptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  promptChipText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '600',
  },
  optionsContainer: {
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  optionsHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  optionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  optionChipText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF5A1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
