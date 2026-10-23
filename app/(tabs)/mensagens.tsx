import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { chatApi, agendamentoApi } from '@/config/api';
import ChatModal from '@/components/ChatModal';
import { AgendamentoResponse } from '@/types/agendamento';

interface ConversaItem {
  id: number;
  agendamentoId: number;
  interlocutorNome: string;
  interlocutorPapel: string;
  disciplina: string;
  ultimaMensagem: string;
  dataHora: string;
  naoLidas: number;
  statusAgendamento: string;
}

export default function MensagensScreen() {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<ConversaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<number | null>(null);
  const [selectedInterlocutor, setSelectedInterlocutor] = useState<{ id: number; nome: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  const carregarConversas = async () => {
    try {
      if (!user) return;
      // Busca agendamentos do usuário para montar a caixa de entrada
      const agendamentos = user.tipo === 'PROFESSOR'
        ? await agendamentoApi.listarPorProfessor(user.id)
        : await agendamentoApi.listarPorAluno(user.id);

      // Agrupa conversas por agendamento ativo (CONFIRMADO, EM_ANDAMENTO, REALIZADA)
      const ativas = agendamentos.filter((a: AgendamentoResponse) =>
        ['CONFIRMADO', 'EM_ANDAMENTO', 'AGUARDANDO_CONFIRMACAO', 'REALIZADA'].includes(a.status)
      );

      const listaMapeada: ConversaItem[] = ativas.map((ag: AgendamentoResponse, idx: number) => {
        const isProf = user.tipo === 'PROFESSOR';
        const interlocutorNome = isProf ? ag.nomeAluno : ag.nomeProfessor;
        const interlocutorPapel = isProf ? 'Aluno' : 'Mentor / Professor';

        return {
          id: ag.id,
          agendamentoId: ag.id,
          interlocutorNome: interlocutorNome || `Participante #${ag.id}`,
          interlocutorPapel,
          disciplina: ag.saberNome || 'Mentoria Geral',
          ultimaMensagem: ag.status === 'EM_ANDAMENTO' 
            ? 'Aula ao vivo em andamento! Entre no chat.' 
            : 'Toque para abrir a conversa da aula.',
          dataHora: `${ag.data} às ${ag.hora?.slice(0, 5)}`,
          naoLidas: ag.status === 'EM_ANDAMENTO' ? 1 : 0,
          statusAgendamento: ag.status,
        };
      });

      setConversas(listaMapeada);
    } catch (error) {
      console.warn('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarConversas();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    carregarConversas();
  };

  const abrirChat = (item: ConversaItem) => {
    setSelectedAgendamentoId(item.agendamentoId);
    setSelectedInterlocutor({
      id: item.agendamentoId,
      nome: item.interlocutorNome,
    });
    setIsChatOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* Header conforme Especificação 2.0.1 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mensagens</Text>
          <Text style={styles.headerSubtitle}>
            Canal 1 — Conversas aluno ↔ professor por agendamento
          </Text>
        </View>
        <View style={styles.badgeInfo}>
          <FontAwesome5 name="lock" size={11} color={Colors.secondary} />
          <Text style={styles.badgeText}>Fail-Closed</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando conversas...</Text>
        </View>
      ) : conversas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="comments" size={48} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Nenhuma conversa ativa</Text>
          <Text style={styles.emptyText}>
            As conversas de mentoria são abertas automaticamente assim que uma aula é confirmada pelo professor.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversas}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardConversa}
              onPress={() => abrirChat(item)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                <FontAwesome5 name="user-circle" size={38} color={Colors.secondary} />
              </View>

              <View style={styles.infoContainer}>
                <View style={styles.topRow}>
                  <Text style={styles.nomeText} numberOfLines={1}>
                    {item.interlocutorNome}
                  </Text>
                  <Text style={styles.dataText}>{item.dataHora}</Text>
                </View>

                <View style={styles.midRow}>
                  <Text style={styles.disciplinaText} numberOfLines={1}>
                    {item.disciplina} • {item.interlocutorPapel}
                  </Text>
                </View>

                <View style={styles.bottomRow}>
                  <Text style={styles.previewText} numberOfLines={1}>
                    {item.ultimaMensagem}
                  </Text>
                  {item.naoLidas > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.naoLidas}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal de Chat em Tempo Real */}
      {selectedAgendamentoId && selectedInterlocutor && (
        <ChatModal
          visible={isChatOpen}
          agendamentoId={selectedAgendamentoId}
          interlocutorId={selectedInterlocutor.id}
          interlocutorNome={selectedInterlocutor.nome}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  badgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  cardConversa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: {
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  nomeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  dataText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  midRow: {
    marginBottom: 4,
  },
  disciplinaText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
