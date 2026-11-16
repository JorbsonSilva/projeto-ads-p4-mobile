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
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Send,
  RotateCcw,
  User,
  Bot,
  ChevronLeft,
  Paperclip,
  Star,
} from 'lucide-react-native';
import { RuleIndicatorBadge } from '../components/RuleIndicatorBadge';
import { AssistantSummaryCard } from '../components/AssistantSummaryCard';
import { ModalAvaliacao, DadosAvaliacao } from '../components/ModalAvaliacao';
import TabBarRN001 from '../components/navigation/TabBarRN001';
import {
  AulaPendenteAvaliacao,
  enviarAvaliacaoAula,
  listarAulasPendentesAvaliacao,
} from '../services/avaliacaoService';
import { getApiErrorMessage } from '../config/api';
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
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState<boolean>(false);
  const [aulasPendentesAvaliacao, setAulasPendentesAvaliacao] = useState<AulaPendenteAvaliacao[]>([]);
  const [aulaSelecionada, setAulaSelecionada] = useState<AulaPendenteAvaliacao | null>(null);
  const [modalSelecaoAulaVisivel, setModalSelecaoAulaVisivel] = useState<boolean>(false);
  const [modalAvaliacaoVisivel, setModalAvaliacaoVisivel] = useState<boolean>(false);

  // Estados acumulados da triagem
  const [disciplinaNome, setDisciplinaNome] = useState<string>('');
  const [assuntoNome, setAssuntoNome] = useState<string>('');
  const [modalidade, setModalidade] = useState<string>('');

  useEffect(() => {
    iniciarConversaInicial();
  }, []);

  const iniciarConversaInicial = async () => {
    setIsLoading(true);
    try {
      const response = await enviarPassoTriagem({ currentStep: 'INITIAL' });
      setCurrentStep(response.nextStep);
      setQuickOptions(response.quickOptions);
      setMessages([
        {
          id: 'msg-init',
          sender: 'assistant',
          text: response.assistantMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (error) {
      Alert.alert('Não foi possível carregar', error instanceof Error ? error.message : 'Tente novamente mais tarde.');
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

      setCurrentStep(response.nextStep);
      setDisciplinaNome(option.payload);
      if (response.actionCard) {
        setAssuntoNome(response.actionCard.assuntoNome);
        setModalidade(response.actionCard.modalidade);
      }

      const assistMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.assistantMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionCard: response.actionCard,
        bulletPoints: response.bulletPoints,
      };

      setMessages((prev) => [...prev, assistMsg]);
      setQuickOptions(response.quickOptions);
    } catch (error) {
      Alert.alert('Não foi possível enviar', error instanceof Error ? error.message : 'Tente novamente mais tarde.');
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
      Alert.alert('Não foi possível enviar', error instanceof Error ? error.message : 'Tente novamente mais tarde.');
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

  const iniciarAvaliacao = async () => {
    if (carregandoAvaliacoes) return;
    setCarregandoAvaliacoes(true);
    try {
      const aulas = await listarAulasPendentesAvaliacao();
      if (aulas.length === 0) {
        Alert.alert('Nenhuma aula para avaliar', 'As avaliações ficam disponíveis após a conclusão de uma aula.');
      } else if (aulas.length === 1) {
        setAulaSelecionada(aulas[0]);
        setModalAvaliacaoVisivel(true);
      } else {
        setAulasPendentesAvaliacao(aulas);
        setModalSelecaoAulaVisivel(true);
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível carregar as aulas',
        getApiErrorMessage(error)
      );
    } finally {
      setCarregandoAvaliacoes(false);
    }
  };

  const enviarAvaliacao = async (dados: DadosAvaliacao) => {
    if (!aulaSelecionada) {
      throw new Error('Selecione uma aula concluída antes de enviar a avaliação.');
    }
    await enviarAvaliacaoAula(aulaSelecionada.agendamentoId, dados);
    setAulaSelecionada(null);
    Alert.alert('Avaliação registrada', 'Sua avaliação foi salva com sucesso.');
  };

  const formatarDataAula = (aula: AulaPendenteAvaliacao) =>
    `${aula.data.split('-').reverse().join('/')} • ${aula.hora.slice(0, 5)}`;

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
            style={[styles.headerActionButton, carregandoAvaliacoes && styles.headerActionButtonDisabled]}
            onPress={iniciarAvaliacao}
            disabled={carregandoAvaliacoes}
            accessibilityLabel="Avaliar uma aula concluída"
          >
            {carregandoAvaliacoes
              ? <ActivityIndicator size="small" color="#D97706" />
              : <Star size={17} color="#D97706" />}
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



      {/* Selo Obrigatório de Regras Determinísticas e Transparência */}
      <RuleIndicatorBadge />

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

      <Modal
        visible={modalSelecaoAulaVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalSelecaoAulaVisivel(false)}
      >
        <View style={styles.ratingPickerOverlay}>
          <View style={styles.ratingPickerCard}>
            <View style={styles.ratingPickerHeader}>
              <Text style={styles.ratingPickerTitle}>Selecione a aula</Text>
              <TouchableOpacity
                onPress={() => setModalSelecaoAulaVisivel(false)}
                accessibilityLabel="Fechar seleção de aula"
              >
                <Text style={styles.ratingPickerClose}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.ratingPickerSubtitle}>Somente aulas concluídas e ainda não avaliadas.</Text>
            <ScrollView>
              {aulasPendentesAvaliacao.map((aula) => (
                <TouchableOpacity
                  key={aula.agendamentoId}
                  style={styles.ratingPickerItem}
                  onPress={() => {
                    setAulaSelecionada(aula);
                    setModalSelecaoAulaVisivel(false);
                    setModalAvaliacaoVisivel(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.ratingPickerProfessor}>{aula.professorNome}</Text>
                  <Text style={styles.ratingPickerDiscipline}>
                    {aula.disciplinaNome || aula.assunto || 'Mentoria'}
                  </Text>
                  <Text style={styles.ratingPickerDate}>{formatarDataAula(aula)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ModalAvaliacao
        visible={modalAvaliacaoVisivel && aulaSelecionada !== null}
        onClose={() => setModalAvaliacaoVisivel(false)}
        onSubmit={enviarAvaliacao}
        professorNome={aulaSelecionada?.professorNome ?? ''}
        disciplinaNome={
          aulaSelecionada?.disciplinaNome || aulaSelecionada?.assunto || 'Mentoria'
        }
        dataAula={aulaSelecionada ? formatarDataAula(aulaSelecionada) : ''}
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
  headerActionButtonDisabled: {
    opacity: 0.65,
  },
  ratingPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  ratingPickerCard: {
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  ratingPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingPickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratingPickerClose: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  ratingPickerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  ratingPickerItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  ratingPickerProfessor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratingPickerDiscipline: {
    fontSize: 13,
    color: '#334155',
    marginTop: 3,
  },
  ratingPickerDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
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
