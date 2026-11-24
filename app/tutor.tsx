import { Feather } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTutorConversation } from '../hooks/useTutorConversation';
import type { TutorOrigem } from '../types/tutor';

const ORIGEM: Record<TutorOrigem, string> = {
  SIMULADO: 'Modo simulado',
  DEMONSTRATIVO: 'Modo demonstrativo',
  RAG: 'Base de conhecimento',
  DETERMINISTICO: 'Regras do Orienta',
};

export default function TutorRoute() {
  const { carregandoAuth, isAuthenticated, usuarioId, perfilAtivo, token } = useAuth();
  if (process.env.EXPO_PUBLIC_TUTOR_ENABLED !== 'true') return <Redirect href="/(tabs)" />;
  if (carregandoAuth) {
    return <View style={styles.loading}><ActivityIndicator accessibilityLabel="Carregando sessão" /></View>;
  }
  if (!isAuthenticated || !usuarioId || !token) return <Redirect href="/login" />;
  if (perfilAtivo !== 'Aluno') return <Redirect href="/(tabs)" />;
  return <TutorScreen key={usuarioId} token={token} />;
}

function TutorScreen({ token }: { token: string }) {
  const router = useRouter();
  const scroll = useRef<ScrollView>(null);
  const { state, setDraft, send, close, discardLocally } = useTutorConversation(token, randomUUID);
  const [discardFor, setDiscardFor] = useState<typeof state.conversation>(null);
  const confirmDiscard = discardFor !== null && discardFor === state.conversation;
  const busy = state.activity !== null;
  const canWrite = !busy && !state.retry && !state.needsLogin && !state.needsNewConversation && !state.closeUnconfirmed;
  const closeLabel = state.closeUnconfirmed ? 'Tentar encerrar' : state.needsNewConversation ? 'Nova conversa' : 'Encerrar conversa';

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Feather name="arrow-left" size={24} color="#15233C" />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>Tutor Orienta</Text>
          {!state.needsLogin && (state.conversation || state.turns.length > 0) && (
            <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }}
              onPress={() => { setDiscardFor(null); void close(); }}>
              <Text style={[styles.link, busy && styles.muted]}>{closeLabel}</Text>
            </Pressable>
          )}
        </View>

        <ScrollView ref={scroll} style={styles.screen} contentContainerStyle={styles.history}
          keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd()}>
          {state.turns.length === 0 && !state.needsLogin && (
            <View style={styles.turn}>
              <Text style={styles.intro}>Pergunte sobre o funcionamento do Orienta, como buscar professores ou gerenciar uma mentoria.</Text>
              <Pressable accessibilityRole="button" disabled={!canWrite}
                onPress={() => setDraft('Como buscar professores no Orienta?')}>
                <Text style={[styles.link, !canWrite && styles.muted]}>Sugestão: como buscar professores?</Text>
              </Pressable>
            </View>
          )}
          {state.turns.map(({ request, response, failed }) => (
            <View key={request.mensagemId} style={styles.turn}>
              <View style={styles.userBubble}><Text style={styles.body}>{request.pergunta}</Text></View>
              {failed && <Text style={styles.detail}>Resposta não confirmada</Text>}
              {response && (
                <View style={styles.tutorBubble}>
                  <Text style={styles.origin}>{ORIGEM[response.origem]}</Text>
                  {response.resultado === 'SEM_EVIDENCIA' && (
                    <Text style={styles.detail}>Informação insuficiente na base</Text>
                  )}
                  <Text style={styles.body}>{response.resposta}</Text>
                  {response.evidencias.length > 0 && (
                    <View style={styles.sources}>
                      <Text style={styles.detail}>
                        {response.origem === 'DEMONSTRATIVO' ? 'Registros demonstrativos' : 'Evidências da FAQ'}
                      </Text>
                      {response.evidencias.map((evidence, index) => (
                        <Text key={`${evidence.id}-${evidence.versaoCorpus}-${index}`} style={styles.detail}>
                          {evidence.id} · versão {evidence.versaoCorpus}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
          {busy && (
            <View style={styles.progress} accessibilityLiveRegion="polite">
              <ActivityIndicator color="#A83A16" />
              <Text style={styles.detail}>{state.activity === 'closing' ? 'Encerrando conversa…' : 'Aguardando resposta…'}</Text>
            </View>
          )}
        </ScrollView>

        {state.notice && (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Text style={styles.body}>{state.notice}</Text>
            {state.retry && <Pressable accessibilityRole="button" onPress={() => void send(true)}>
              <Text style={styles.link}>Reenviar pergunta</Text>
            </Pressable>}
            {state.closeUnconfirmed && !busy && (
              <Pressable accessibilityRole="button" onPress={() => {
                if (confirmDiscard) {
                  discardLocally();
                  setDiscardFor(null);
                } else {
                  setDiscardFor(state.conversation);
                }
              }}>
                <Text style={styles.link}>{confirmDiscard ? 'Confirmar descarte local' : 'Descartar histórico local'}</Text>
              </Pressable>
            )}
            {state.needsLogin && <Pressable accessibilityRole="button" onPress={() => router.replace('/login')}>
              <Text style={styles.link}>Entrar novamente</Text>
            </Pressable>}
          </View>
        )}
        <View style={styles.composer}>
          <TextInput accessibilityLabel="Pergunta sobre o Orienta" placeholder="Escreva sua pergunta"
            placeholderTextColor="#64748B" style={styles.input} value={state.draft} onChangeText={setDraft}
            editable={canWrite} returnKeyType="send" onSubmitEditing={() => { if (canWrite) void send(); }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Enviar pergunta"
            accessibilityState={{ disabled: !canWrite || !state.draft }}
            disabled={!canWrite || !state.draft} style={[styles.send, (!canWrite || !state.draft) && styles.sendDisabled]}
            onPress={() => void send()}>
            <Feather name="send" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { flex: 1, color: '#15233C', fontSize: 20, fontWeight: '700' },
  link: { color: '#A83A16', fontWeight: '700', paddingVertical: 6 },
  muted: { color: '#64748B' },
  history: { padding: 16, gap: 18 },
  intro: { color: '#475569', fontSize: 16, lineHeight: 24 },
  turn: { gap: 8 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: '#FFEDD5', padding: 12, borderRadius: 14 },
  tutorBubble: { alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#E2E8F0', padding: 12, borderRadius: 14, gap: 6 },
  body: { color: '#15233C', fontSize: 16, lineHeight: 23 },
  origin: { color: '#A83A16', fontWeight: '700' },
  detail: { color: '#475569', fontSize: 13 },
  sources: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, gap: 3 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notice: { backgroundColor: '#FFF7ED', paddingHorizontal: 16, paddingVertical: 8 },
  composer: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, minHeight: 44, backgroundColor: '#F8FAFC', color: '#15233C', borderWidth: 1,
    borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12 },
  send: { backgroundColor: '#A83A16', minHeight: 44, minWidth: 44, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center' },
  sendDisabled: { backgroundColor: '#64748B' },
});
