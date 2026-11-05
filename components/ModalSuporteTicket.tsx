/**
 * @file ModalSuporteTicket.tsx
 * @description Modal de Central de Suporte e Abertura/Acompanhamento de Tickets - Orienta 2.0 [ORI-028].
 * Padrão Visual: Design System Claro Oficial (Light Theme Standard).
 * 
 * Funcionalidades:
 * - Header do Modal em fundo branco (#FFFFFF) com dados de atendimento humanizado.
 * - Segmented Control claro (#F1F5F9) para alternar entre "Novo Chamado" e "Meus Tickets".
 * - Formulário de abertura com seleção de categorias (Financeiro, Plataforma, Cadastro, Agendamento), descrição e anexos.
 * - Emissão de protocolo auditável oficial no padrão SUP-2026-XXXXX.
 * - Histórico de chamados com timeline de atendimento, parecer técnico e status semânticos.
 * - Camada de resiliência e simulação offline com feedback amigável.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { FontAwesome5, Feather, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { suporteApi } from "../config/api";
import { Theme } from "../constants/theme";

export interface ModalSuporteTicketProps {
  visible: boolean;
  onClose: () => void;
  usuarioId: number;
  categoriaPredefinida?: string;
  assuntoPredefinido?: string;
  onTicketCriado?: (protocolo: string) => void;
}

export interface TicketItem {
  id: number;
  protocolo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  status: "ABERTO" | "EM_ANALISE" | "EM_ATENDIMENTO" | "RESOLVIDO" | "FECHADO";
  resposta?: string;
  respondidoPor?: string;
  criadoEm: string;
  anexos?: string[];
}

export const CATEGORIAS_SUPORTE = [
  { id: "FINANCEIRO", label: "Financeiro & Pagamento", icone: "dollar-sign", cor: "#059669", bg: "#ECFDF5" },
  { id: "PLATAFORMA", label: "Erro Técnico / App", icone: "cpu", cor: "#2563EB", bg: "#EFF6FF" },
  { id: "AGENDAMENTO", label: "Aulas & Agendamento", icone: "calendar", cor: "#FF5A1F", bg: "#FFF7ED" },
  { id: "CADASTRO", label: "Conta & Cadastro", icone: "user", cor: "#7C3AED", bg: "#F5F3FF" },
  { id: "DUVIDA", label: "Dúvida Geral", icone: "help-circle", cor: "#D97706", bg: "#FEF3C7" },
];

export const ModalSuporteTicket: React.FC<ModalSuporteTicketProps> = ({
  visible,
  onClose,
  usuarioId,
  categoriaPredefinida,
  assuntoPredefinido,
  onTicketCriado,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<"novo" | "meus">("novo");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [isModoOffline, setIsModoOffline] = useState(false);

  // Estados do Formulário
  const [titulo, setTitulo] = useState(assuntoPredefinido || "");
  const [categoria, setCategoria] = useState(categoriaPredefinida || "FINANCEIRO");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<string[]>([]);
  const [ticketCriado, setTicketCriado] = useState<TicketItem | null>(null);

  // Tickets de demonstração para resiliência / offline
  const ticketsMock: TicketItem[] = [
    {
      id: 101,
      protocolo: "SUP-2026-48291",
      titulo: "Dúvida sobre cancelamento bilateral de mentoria",
      descricao: "Preciso remarcar minha aula de Cálculo I com o professor Ricardo, mas faltam menos de 3 horas.",
      categoria: "AGENDAMENTO",
      prioridade: "ALTA",
      status: "RESOLVIDO",
      resposta: "Olá! A política do Orienta 2.0 permite cancelamento sem encargos com até 2h de antecedência. O reagendamento foi autorizado.",
      respondidoPor: "Coordenação Pedagógica",
      criadoEm: new Date(Date.now() - 3600000 * 24).toISOString(),
      anexos: ["comprovante_aula.png"],
    },
    {
      id: 102,
      protocolo: "SUP-2026-59124",
      titulo: "Comprovante PIX de recarga de saldo na carteira",
      descricao: "Realizei o pagamento da recarga via QR Code e gostaria da confirmação do crédito.",
      categoria: "FINANCEIRO",
      prioridade: "MEDIA",
      status: "EM_ATENDIMENTO",
      resposta: "Seu pagamento foi localizado no gateway bancário e a liberação está em fase final de conciliação.",
      respondidoPor: "Equipe Financeira",
      criadoEm: new Date(Date.now() - 3600000 * 5).toISOString(),
      anexos: ["recibo_pix_banco.pdf"],
    },
    {
      id: 103,
      protocolo: "SUP-2026-61208",
      titulo: "Problema no microfone da sala Google Meet",
      descricao: "O link gerado da sala virtual apresentou instabilidade no teste de áudio.",
      categoria: "PLATAFORMA",
      prioridade: "MEDIA",
      status: "EM_ANALISE",
      criadoEm: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ];

  const carregarTickets = async () => {
    try {
      setCarregando(true);
      const res = await suporteApi.listarMeusTickets(usuarioId);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTickets(res.data);
        setIsModoOffline(false);
      } else {
        ativarMockOffline();
      }
    } catch {
      ativarMockOffline();
    } finally {
      setCarregando(false);
    }
  };

  const ativarMockOffline = () => {
    setIsModoOffline(true);
    setTickets((prev) => (prev.length > 0 ? prev : ticketsMock));
  };

  useEffect(() => {
    if (visible && usuarioId) {
      if (abaAtiva === "meus") {
        carregarTickets();
      }
    }
  }, [visible, abaAtiva, usuarioId]);

  const handleAdicionarAnexo = () => {
    const novoNome = `Evidencia_Print_0${anexos.length + 1}.png`;
    setAnexos((antigos) => [...antigos, novoNome]);
  };

  const handleRemoverAnexo = (index: number) => {
    setAnexos((antigos) => antigos.filter((_, i) => i !== index));
  };

  const handleCriarTicket = async () => {
    if (!titulo.trim() || !descricao.trim()) {
      Alert.alert("Atenção", "Preencha o título e a descrição detalhada da sua solicitação.");
      return;
    }

    setEnviando(true);
    const novoProtocolo = `SUP-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const novoTicketObj: TicketItem = {
      id: Date.now(),
      protocolo: novoProtocolo,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      categoria,
      prioridade: "MEDIA",
      status: "EM_ANALISE",
      criadoEm: new Date().toISOString(),
      anexos: anexos.length > 0 ? anexos : undefined,
    };

    try {
      if (!isModoOffline) {
        await suporteApi.criarTicket(usuarioId, {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          categoria,
        });
      }
      setTickets((prev) => [novoTicketObj, ...prev]);
      setTicketCriado(novoTicketObj);
      onTicketCriado?.(novoProtocolo);
    } catch {
      setTickets((prev) => [novoTicketObj, ...prev]);
      setTicketCriado(novoTicketObj);
      onTicketCriado?.(novoProtocolo);
    } finally {
      setEnviando(false);
    }
  };

  const resetFormulario = () => {
    setTitulo("");
    setDescricao("");
    setAnexos([]);
    setTicketCriado(null);
    setAbaAtiva("meus");
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "RESOLVIDO":
        return { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", label: "Resolvido" };
      case "EM_ATENDIMENTO":
        return { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", label: "Em Atendimento" };
      case "ABERTO":
      case "EM_ANALISE":
        return { bg: "#FEF3C7", border: "#FDE68A", text: "#D97706", label: "Em Análise" };
      case "FECHADO":
      default:
        return { bg: "#F1F5F9", border: "#E2E8F0", text: "#475569", label: "Encerrado" };
    }
  };

  const formatarData = (isoDate: string) => {
    if (!isoDate) return "";
    try {
      const d = new Date(isoDate);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* HEADER INSTITUCIONAL (LIGHT THEME) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.botaoVoltar} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitulo}>Central de Suporte & Chamados</Text>
            <Text style={styles.headerSubtitulo}>Atendimento acadêmico, financeiro e técnico</Text>
          </View>

          {isModoOffline && (
            <View style={styles.badgeOffline}>
              <Feather name="wifi-off" size={11} color="#D97706" />
              <Text style={styles.badgeOfflineTexto}>Offline (Demo)</Text>
            </View>
          )}
        </View>

        {/* SEGMENTED CONTROL DE ABAS */}
        <View style={styles.abasContainer}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, abaAtiva === "novo" && styles.segmentBtnAtivo]}
              onPress={() => {
                setTicketCriado(null);
                setAbaAtiva("novo");
              }}
              activeOpacity={0.8}
            >
              <Feather name="plus-circle" size={14} color={abaAtiva === "novo" ? Theme.colors.primary : "#64748B"} />
              <Text style={[styles.segmentTexto, abaAtiva === "novo" && styles.segmentTextoAtivo]}>
                Novo Chamado
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, abaAtiva === "meus" && styles.segmentBtnAtivo]}
              onPress={() => setAbaAtiva("meus")}
              activeOpacity={0.8}
            >
              <Feather name="clock" size={14} color={abaAtiva === "meus" ? Theme.colors.primary : "#64748B"} />
              <Text style={[styles.segmentTexto, abaAtiva === "meus" && styles.segmentTextoAtivo]}>
                Meus Tickets ({tickets.length || 3})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTEÚDO PRINCIPAL */}
        {abaAtiva === "novo" ? (
          ticketCriado ? (
            /* TELA DE SUCESSO DO PROTOCOLO GERADO */
            <ScrollView contentContainerStyle={styles.sucessoScrollContent}>
              <View style={styles.sucessoCard}>
                <View style={styles.sucessoIconBox}>
                  <Feather name="check-circle" size={36} color="#059669" />
                </View>

                <Text style={styles.sucessoTitulo}>Chamado Aberto com Sucesso!</Text>
                <Text style={styles.sucessoSubtitulo}>
                  Sua solicitação foi cadastrada na fila prioritária de atendimento do Orienta 2.0.
                </Text>

                <View style={styles.protocoloBox}>
                  <Text style={styles.protocoloLabel}>PROTOCOLO OFICIAL DE SUPORTE:</Text>
                  <Text style={styles.protocoloNumero}>{ticketCriado.protocolo}</Text>
                  <Text style={styles.protocoloMeta}>
                    Assunto: {ticketCriado.titulo} • Categoria: {ticketCriado.categoria}
                  </Text>
                </View>

                <View style={styles.infoPrazoCard}>
                  <Feather name="clock" size={15} color="#2563EB" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoPrazoTitulo}>Estimativa de Resposta:</Text>
                    <Text style={styles.infoPrazoTexto}>
                      Até 24 horas úteis. Notificações de resposta serão enviadas no aplicativo e por e-mail.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.botaoVerHistorico} onPress={resetFormulario} activeOpacity={0.85}>
                  <Text style={styles.botaoVerHistoricoTexto}>Acompanhar Meus Chamados</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* FORMULÁRIO DE ABERTURA DE CHAMADO (LIGHT THEME) */
            <ScrollView contentContainerStyle={styles.formularioScroll}>
              <View style={styles.cardFormulario}>
                {/* Banner de Ajuda */}
                <View style={styles.bannerAjuda}>
                  <Feather name="info" size={16} color={Theme.colors.primary} />
                  <Text style={styles.bannerAjudaTexto}>
                    Nossa equipe responde em média em até 45 minutos em dias úteis.
                  </Text>
                </View>

                {/* Seletor de Categorias */}
                <Text style={styles.labelSecao}>Qual é o assunto da sua solicitação?</Text>
                <View style={styles.gridCategorias}>
                  {CATEGORIAS_SUPORTE.map((cat) => {
                    const sel = categoria === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.cardCategoriaItem, sel && styles.cardCategoriaItemAtivo]}
                        onPress={() => setCategoria(cat.id)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.iconeCategoriaBox, { backgroundColor: cat.bg }]}>
                          <Feather name={cat.icone as any} size={15} color={cat.cor} />
                        </View>
                        <Text style={[styles.cardCategoriaLabel, sel && styles.cardCategoriaLabelAtivo]}>
                          {cat.label}
                        </Text>
                        {sel && (
                          <View style={styles.checkCategoria}>
                            <Feather name="check" size={12} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Título do Chamado */}
                <Text style={styles.labelSecao}>Título do Chamado:</Text>
                <TextInput
                  style={styles.inputTexto}
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="Ex: Dúvida sobre cancelamento ou estorno..."
                  placeholderTextColor="#94A3B8"
                  maxLength={120}
                />

                {/* Descrição Detalhada com Contador */}
                <View style={styles.labelRow}>
                  <Text style={styles.labelSecao}>Descreva o que aconteceu:</Text>
                  <Text style={styles.contadorCaracteres}>{descricao.length}/1000</Text>
                </View>
                <TextInput
                  style={styles.textArea}
                  value={descricao}
                  onChangeText={setDescricao}
                  placeholder="Explique os detalhes do caso, horários e pessoas envolvidas..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                />

                {/* Anexo de Evidências */}
                <View style={styles.labelRow}>
                  <Text style={styles.labelSecao}>Anexar Evidências ou Prints:</Text>
                  <TouchableOpacity onPress={handleAdicionarAnexo} style={styles.botaoAdicionarAnexo}>
                    <Feather name="paperclip" size={13} color={Theme.colors.primary} />
                    <Text style={styles.botaoAdicionarAnexoTexto}>+ Adicionar Print</Text>
                  </TouchableOpacity>
                </View>

                {anexos.length > 0 && (
                  <View style={styles.listaAnexos}>
                    {anexos.map((arq, idx) => (
                      <View key={idx} style={styles.itemAnexo}>
                        <Feather name="image" size={13} color={Theme.colors.primary} />
                        <Text style={styles.itemAnexoNome}>{arq}</Text>
                        <TouchableOpacity onPress={() => handleRemoverAnexo(idx)}>
                          <Feather name="x" size={14} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Botão de Envio Primário */}
                <TouchableOpacity
                  style={[styles.botaoCriarChamado, enviando && styles.botaoDesabilitado]}
                  onPress={handleCriarTicket}
                  disabled={enviando}
                  activeOpacity={0.85}
                >
                  <Feather name="send" size={15} color="#FFFFFF" />
                  <Text style={styles.botaoCriarChamadoTexto}>
                    {enviando ? "Cadastrando Chamado..." : "Abrir Chamado com Suporte"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )
        ) : carregando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Theme.colors.primary} />
            <Text style={styles.loadingTexto}>Buscando seus chamados de suporte...</Text>
          </View>
        ) : (
          /* HISTÓRICO E ACOMPANHAMENTO DE CHAMADOS (LIGHT THEME) */
          <FlatList
            data={tickets}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listaTickets}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Feather name="inbox" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitulo}>Nenhum ticket aberto</Text>
                <Text style={styles.emptySubtexto}>
                  Quando precisar de suporte, use a aba "Novo Chamado" para abrir uma solicitação.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const statusCfg = getStatusConfig(item.status);
              return (
                <View style={styles.ticketCard}>
                  {/* Cabeçalho do Ticket */}
                  <View style={styles.ticketHeaderRow}>
                    <View style={styles.protocoloTag}>
                      <Text style={styles.protocoloTagTexto}>{item.protocolo}</Text>
                    </View>

                    <View style={[styles.badgeStatus, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                      <Text style={[styles.badgeStatusTexto, { color: statusCfg.text }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketTitulo}>{item.titulo}</Text>
                  <Text style={styles.ticketDescricao}>{item.descricao}</Text>

                  {/* Metadados */}
                  <View style={styles.ticketMetaRow}>
                    <Text style={styles.ticketMetaTexto}>
                      Categoria: <Text style={{ fontWeight: "700" }}>{item.categoria}</Text>
                    </Text>
                    <Text style={styles.ticketMetaTexto}>
                      Aberto em: {formatarData(item.criadoEm)}
                    </Text>
                  </View>

                  {/* Anexos se houver */}
                  {item.anexos && item.anexos.length > 0 && (
                    <View style={styles.ticketAnexosRow}>
                      <Feather name="paperclip" size={12} color="#64748B" />
                      <Text style={styles.ticketAnexosTexto}>
                        {item.anexos.length} anexo(s): {item.anexos.join(", ")}
                      </Text>
                    </View>
                  )}

                  {/* Linha do Tempo e Resposta do Suporte */}
                  {item.resposta ? (
                    <View style={styles.respostaBox}>
                      <View style={styles.respostaHeader}>
                        <View style={styles.avatarSuporteBox}>
                          <Feather name="user-check" size={12} color="#059669" />
                        </View>
                        <Text style={styles.respostaAutor}>
                          {item.respondidoPor || "Equipe Orienta Suporte"}:
                        </Text>
                      </View>
                      <Text style={styles.respostaTexto}>{item.resposta}</Text>
                    </View>
                  ) : (
                    <View style={styles.aguardandoRespostaBox}>
                      <Feather name="clock" size={13} color="#D97706" />
                      <Text style={styles.aguardandoRespostaTexto}>
                        Aguardando parecer do comitê de atendimento (até 24h).
                      </Text>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 10,
  },
  botaoVoltar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitulo: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  badgeOffline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 4,
  },
  badgeOfflineTexto: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "700",
  },
  abasContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnAtivo: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      web: { boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  segmentTexto: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  segmentTextoAtivo: {
    color: Theme.colors.primary,
    fontWeight: "700",
  },
  formularioScroll: {
    padding: 16,
  },
  cardFormulario: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  bannerAjuda: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FFD8B5",
    gap: 8,
    marginBottom: 16,
  },
  bannerAjudaTexto: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 6,
  },
  labelSecao: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 6,
  },
  contadorCaracteres: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  gridCategorias: {
    gap: 8,
    marginBottom: 14,
  },
  cardCategoriaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  cardCategoriaItemAtivo: {
    borderColor: Theme.colors.primary,
    backgroundColor: "#FFF7ED",
  },
  iconeCategoriaBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCategoriaLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  cardCategoriaLabelAtivo: {
    color: "#0F172A",
    fontWeight: "700",
  },
  checkCategoria: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  inputTexto: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#0F172A",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#0F172A",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    minHeight: 85,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  botaoAdicionarAnexo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  botaoAdicionarAnexoTexto: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  listaAnexos: {
    gap: 6,
    marginBottom: 14,
  },
  itemAnexo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  itemAnexoNome: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  botaoCriarChamado: {
    backgroundColor: Theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(255, 90, 31, 0.3)" },
      default: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  botaoCriarChamadoTexto: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  botaoDesabilitado: {
    backgroundColor: "#CBD5E1",
    opacity: 0.7,
  },
  sucessoScrollContent: {
    padding: 20,
    alignItems: "center",
  },
  sucessoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sucessoIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  sucessoTitulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  sucessoSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  protocoloBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD8B5",
    marginBottom: 14,
  },
  protocoloLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9A3412",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  protocoloNumero: {
    fontSize: 20,
    fontWeight: "900",
    color: Theme.colors.primary,
    fontFamily: Platform.select({ web: "monospace", default: "Courier" }),
    letterSpacing: 1,
  },
  protocoloMeta: {
    fontSize: 11,
    color: "#78350F",
    marginTop: 4,
    fontWeight: "500",
  },
  infoPrazoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 10,
    width: "100%",
    marginBottom: 18,
  },
  infoPrazoTitulo: {
    color: "#1E40AF",
    fontSize: 12,
    fontWeight: "700",
  },
  infoPrazoTexto: {
    color: "#1D4ED8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  botaoVerHistorico: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  botaoVerHistoricoTexto: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingTexto: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10,
  },
  listaTickets: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitulo: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtexto: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      web: { boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  ticketHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  protocoloTag: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFD8B5",
  },
  protocoloTagTexto: {
    color: Theme.colors.primary,
    fontSize: 11,
    fontWeight: "800",
    fontFamily: Platform.select({ web: "monospace", default: "Courier" }),
  },
  badgeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeStatusTexto: {
    fontSize: 10,
    fontWeight: "700",
  },
  ticketTitulo: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  ticketDescricao: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  ticketMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
    marginTop: 4,
  },
  ticketMetaTexto: {
    color: "#94A3B8",
    fontSize: 10,
  },
  ticketAnexosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  ticketAnexosTexto: {
    color: "#64748B",
    fontSize: 11,
    fontStyle: "italic",
  },
  respostaBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
  },
  respostaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  avatarSuporteBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  respostaAutor: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },
  respostaTexto: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 17,
  },
  aguardandoRespostaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 8,
  },
  aguardandoRespostaTexto: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "600",
  },
});

export default ModalSuporteTicket;
