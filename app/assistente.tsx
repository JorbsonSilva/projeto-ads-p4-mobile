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
import { Send, RotateCcw, Headphones, Sparkles, User, Bot } from 'lucide-react-native';
import { RuleIndicatorBadge } from '../components/RuleIndicatorBadge';
import { AssistantSummaryCard } from '../components/AssistantSummaryCard';
import {
  enviarPassoTriagem,
  TriageRequest,
  TriageResponse,
  QuickOption,
} from '../services/assistenteApi';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionCard?: any;
}

/**
 * Tela do Assistente de Triagem Controlado por Regras (Fase 9).
 * - Transparência total (F9-T6): Selo visual indicando ausência de IA generativa.
 * - Segurança (F9-T7): Sem agendamento autônomo.
 * - Ação Manual (F9-T4): Card de ação navegável para a agenda oficial.
 */
export default function AssistenteScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('INITIAL');
  const [quickOptions, setQuickOptions] = useState<QuickOption[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [supportTicketProtocol, setSupportTicketProtocol] = useState<string | null>(null);

  // Estados acumulados da triagem
  const [disciplinaNome, setDisciplinaNome] = useState<string>('');
  const [assuntoNome, setAssuntoNome] = useState<string>('');
  const [modalidade, setModalidade] = useState<string>('ONLINE');

  useEffect(() => {
    iniciarTriagem();
  }, []);

  const iniciarTriagem = async () => {
    setIsLoading(true);
    setSupportTicketProtocol(null);
    try {
      const response = await enviarPassoTriagem({ currentStep: 'INITIAL' });
      setCurrentStep(response.nextStep);
      setQuickOptions(response.quickOptions || []);
      setMessages([
        {
          id: 'msg-init',
          sender: 'assistant',
          text: response.assistantMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (error) {
      console.error('Erro ao iniciar triagem:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = async (option: QuickOption) => {
    // Adiciona mensagem do usuário
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: option.label,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let req: TriageRequest = {
        currentStep,
        selectedOptionPayload: option.payload,
        disciplinaNome,
        assuntoNome,
        modalidade,
      };

      if (currentStep === 'SUBJECT_SELECTION') {
        req.disciplinaNome = option.payload;
        setDisciplinaNome(option.payload);
      } else if (currentStep === 'TOPIC_SELECTION') {
        req.assuntoNome = option.payload;
        setAssuntoNome(option.payload);
      } else if (currentStep === 'MODALITY_BUDGET') {
        if (option.payload.includes(':')) {
          const [mod] = option.payload.split(':');
          setModalidade(mod);
          req.modalidade = mod;
        }
      }

      const response: TriageResponse = await enviarPassoTriagem(req);

      setCurrentStep(response.nextStep);
      setQuickOptions(response.quickOptions || []);

      if (response.supportTicketDraftProtocol) {
        setSupportTicketProtocol(response.supportTicketDraftProtocol);
      }

      const assistMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.assistantMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionCard: response.actionCard,
      };

      setMessages((prev) => [...prev, assistMsg]);
    } catch (error) {
      console.error('Erro ao enviar opção:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
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
      const response = await enviarPassoTriagem({
        currentStep,
        userMessage: userText,
        disciplinaNome,
        assuntoNome,
        modalidade,
      });

      setCurrentStep(response.nextStep);
      setQuickOptions(response.quickOptions || []);

      if (response.supportTicketDraftProtocol) {
        setSupportTicketProtocol(response.supportTicketDraftProtocol);
      }

      const assistMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.assistantMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionCard: response.actionCard,
      };

      setMessages((prev) => [...prev, assistMsg]);
    } catch (error) {
      console.error('Erro ao enviar texto livre:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleNavigateToBooking = (professorId: number) => {
    // Redireciona para tela oficial de agendamento (F9-T4)
    router.push({
      pathname: '/agendamento',
      params: { professorId, disciplina: disciplinaNome, assunto: assuntoNome },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Selo Obrigatório de Regras Determinísticas (F9-T6) */}
      <RuleIndicatorBadge />

      {/* Área de Mensagens */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
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
                <Bot size={16} color="#10b981" />
              </View>
            )}

            <View style={{ maxWidth: '82%' }}>
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
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>

              {/* Card de Resumo de Ação (F9-T4 & F9-T7) */}
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
                <User size={16} color="#38bdf8" />
              </View>
            )}
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.loadingText}>Processando regras de negócio...</Text>
          </View>
        )}
      </ScrollView>

      {/* Botões de Opções Rápidas Determinísticas */}
      {quickOptions.length > 0 && !isLoading && (
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsHeader}>Escolha uma opção determinística:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
            {quickOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={styles.optionChip}
                onPress={() => handleSelectOption(opt)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionChipText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Barra de Entrada de Texto Livre & Ações */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={iniciarTriagem}
          title="Reiniciar Triagem"
        >
          <RotateCcw size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Digite sua dúvida ou use as opções acima..."
          placeholderTextColor="#64748b"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendTextMessage}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSendTextMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Send size={16} color={inputText.trim() ? '#0f172a' : '#64748b'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
  },
  bubbleAssistant: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bubbleUser: {
    backgroundColor: '#0284c7',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextAssistant: {
    color: '#f8fafc',
  },
  messageTextUser: {
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  optionsContainer: {
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  optionsHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  optionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  optionChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  optionChipText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
  },
});
