/**
 * @file [id].tsx
 * @description Tela de Detalhes do Professor (Página de Vendas / Vitrine).
 * 🟢 ATUALIZADO: Corrigido o bug do Rodapé (Sticky Footer) ficando atrás dos botões
 * nativos do celular. Implementado o 'useSafeAreaInsets' para calcular o respiro dinâmico.
 */

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// 🟢 Importamos o useSafeAreaInsets para calcular o tamanho dos botões do celular
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BotaoCustomizado } from "../../components/BotaoCustomizado";
import CardAptidao from "../../components/CardAptidao";
import SectionTitle from "../../components/SectionTitle";
import { API_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ==========================================
// 1. CONTRATOS DE TIPAGEM
// ==========================================
interface Saber {
  id: number;
  nome: string;
  categoria: string;
}

interface Aptidao {
  id: number;
  precoHora: number;
  saber: Saber;
}

interface Disponibilidade {
  id: number;
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
}

interface ProfessorDetalhe {
  id: number;
  nome: string;
  bioProfessor?: string;
  fotoUrl?: string;
  notaMedia?: number;
  totalAvaliacoes?: number;
  aptidoes?: Aptidao[];
  disponibilidades?: Disponibilidade[];
}

const diasDaSemanaNome = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const mapaDiasBackend = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================
export default function ProfessorDetalhes() {
  const { id } = useLocalSearchParams();
  const { usuarioId } = useAuth() as any;

  // 🟢 Hook que calcula os recuos do sistema (Dynamic Safe Area)
  const insets = useSafeAreaInsets();

  const [professor, setProfessor] = useState<ProfessorDetalhe | null>(null);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>(
    [],
  );
  const [carregando, setCarregando] = useState(true);

  const [aptidaoSelecionada, setAptidaoSelecionada] = useState<Aptidao | null>(
    null,
  );

  const [modalAgendamentoVisivel, setModalAgendamentoVisivel] = useState(false);
  const [dataSelecionadaStr, setDataSelecionadaStr] = useState<string>("");
  const [horaSelecionada, setHoraSelecionada] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  // ==========================================
  // CARGA DE DADOS DA API REST
  // ==========================================
  const carregarDadosEfetivos = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    try {
      const resProf = await fetch(`${API_URL}/api/usuarios/${id}`);
      if (resProf.ok) {
        const dadosProf: ProfessorDetalhe = await resProf.json();
        setProfessor(dadosProf);

        if (dadosProf.aptidoes && dadosProf.aptidoes.length > 0) {
          setAptidaoSelecionada(dadosProf.aptidoes[0]);
        }

        if (dadosProf.disponibilidades) {
          setDisponibilidades(dadosProf.disponibilidades);
        }
      }
    } catch (error) {
      console.error("Falha ao sincronizar dados do especialista:", error);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDadosEfetivos();
  }, [carregarDadosEfetivos]);

  // ==========================================
  // MOTOR DE PROCESSAMENTO CRONOLÓGICO INTELIGENTE
  // ==========================================
  const obterDatasDisponiveis = () => {
    const diasProximos = [];
    const hoje = new Date();

    if (disponibilidades && disponibilidades.length > 0) {
      for (let i = 1; i <= 14; i++) {
        const proximoDia = new Date(hoje);
        proximoDia.setDate(hoje.getDate() + i);
        const nomeDiaBackend = mapaDiasBackend[proximoDia.getDay()];

        if (disponibilidades.some((d) => d.diaSemana === nomeDiaBackend)) {
          diasProximos.push(proximoDia.toISOString().split("T")[0]);
        }
      }
      return diasProximos;
    }
    return [];
  };

  const obterHorariosParaData = (dataStr: string) => {
    if (!dataStr) return [];

    const partes = dataStr.split("-");
    const objData = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2]),
    );
    const nomeDiaBackend = mapaDiasBackend[objData.getDay()];

    const configsDoDia = disponibilidades.filter(
      (d) => d.diaSemana === nomeDiaBackend,
    );

    let slots: string[] = [];
    configsDoDia.forEach((config) => {
      const hInicio = parseInt(config.horaInicio.split(":")[0], 10);
      const hFim = parseInt(config.horaFim.split(":")[0], 10);

      for (let h = hInicio; h < hFim; h++) {
        slots.push(`${String(h).padStart(2, "0")}:00`);
      }
    });

    return Array.from(new Set(slots)).sort();
  };

  const solicitarAgendamento = async () => {
    if (!aptidaoSelecionada) {
      Alert.alert(
        "Atenção",
        "Por favor, selecione qual matéria você deseja agendar.",
      );
      return;
    }

    if (!dataSelecionadaStr || !horaSelecionada) {
      Alert.alert("Atenção", "Selecione um dia e um horário para agendar.");
      return;
    }

    setSalvando(true);
    try {
      const horaFormatada = `${horaSelecionada}:00`;

      const payload = {
        aluno: { id: usuarioId || 1 },
        professor: { id: professor?.id },
        data: dataSelecionadaStr,
        hora: horaFormatada,
      };

      await axios.post(`${API_URL}/agendamentos`, payload);

      Alert.alert(
        "Solicitação Enviada!",
        "O professor receberá seu pedido e confirmará em breve.",
        [
          {
            text: "Ver minha Agenda",
            onPress: () => {
              setModalAgendamentoVisivel(false);
              router.push("/agenda");
            },
          },
        ],
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Horário Indisponível",
        "Este horário já foi reservado. Tente outro.",
      );
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <View style={estilos.telaCarregamento}>
        <ActivityIndicator size="large" color="#FF6B1A" />
      </View>
    );
  }

  if (!professor) {
    return (
      <View style={estilos.telaCarregamento}>
        <Feather name="user-x" size={48} color="#CCC" />
        <Text style={estilos.textoErro}>Professor não encontrado.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={estilos.botaoVoltarErro}
        >
          <Text style={estilos.textoBotaoErro}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const notaFormatada = professor.notaMedia
    ? professor.notaMedia.toString().replace(".", ",")
    : "5,0";
  const totalAvaliacoes = professor.totalAvaliacoes || 0;

  const listagemDatas = obterDatasDisponiveis();
  const temAgenda = listagemDatas.length > 0;
  const precoRodape = aptidaoSelecionada ? aptidaoSelecionada.precoHora : 0;

  return (
    <SafeAreaView style={estilos.telaGeral} edges={["top"]}>
      <View style={estilos.cabecalhoNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={estilos.botaoVoltarHeader}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeaderNav}>Perfil do Mentor</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        // 🟢 Adicionamos o paddingBottom do insets ao scroll para o usuário conseguir rolar até o final
        contentContainerStyle={[
          estilos.conteudoScroll,
          { paddingBottom: 150 + insets.bottom },
        ]}
      >
        <View style={estilos.perfilAutoridade}>
          <Image
            source={{
              uri:
                professor.fotoUrl ||
                `https://i.pravatar.cc/300?u=${professor.id}`,
            }}
            style={estilos.fotoPerfilDestaque}
          />
          <View style={estilos.nomeVerificadoContainer}>
            <Text style={estilos.nomeProfessorDestaque}>{professor.nome}</Text>
            <MaterialIcons name="verified" size={22} color="#0057B8" />
          </View>
          <View style={estilos.containerTagsMetricas}>
            <View style={estilos.tagMetrica}>
              <MaterialIcons name="star" size={16} color="#F5A623" />
              <Text style={estilos.textoTagMetrica}>{notaFormatada}</Text>
            </View>
            <View style={estilos.tagMetrica}>
              <Feather name="users" size={14} color="#666" />
              <Text style={estilos.textoTagMetrica}>
                {totalAvaliacoes} avaliações
              </Text>
            </View>
          </View>
        </View>

        <View style={estilos.secaoBase}>
          <SectionTitle titulo="O que eu ensino" />
          {professor.aptidoes && professor.aptidoes.length > 0 ? (
            <View style={estilos.gridAptidoes}>
              {professor.aptidoes.map((aptidao) => (
                <CardAptidao
                  key={aptidao.id}
                  nomeSaber={aptidao.saber.nome}
                  preco={aptidao.precoHora}
                  selecionado={aptidaoSelecionada?.id === aptidao.id}
                  onPress={() => setAptidaoSelecionada(aptidao)}
                />
              ))}
            </View>
          ) : (
            <Text style={estilos.textoDescritivo}>
              Nenhuma especialidade cadastrada no momento.
            </Text>
          )}
        </View>

        <View style={estilos.secaoBase}>
          <SectionTitle titulo="Sobre o especialista" />
          <Text style={estilos.textoDescritivoBio}>
            {professor.bioProfessor ||
              "Este mentor ainda não inseriu uma descrição em seu perfil."}
          </Text>
        </View>
      </ScrollView>

      {/* 🟢 O segredo está aqui: o paddingBottom soma o valor do insets (área de botões do celular) */}
      <View
        style={[
          estilos.stickyFooter,
          { paddingBottom: Math.max(insets.bottom + 10, 20) },
        ]}
      >
        <View style={estilos.infoFooter}>
          <Text style={estilos.textoRodapePequeno}>
            {aptidaoSelecionada ? "Valor da aula" : "A partir de"}
          </Text>
          <Text style={estilos.textoPrecoDestaque}>
            R$ {precoRodape.toFixed(2).replace(".", ",")}
          </Text>
        </View>

        <View style={{ width: 180 }}>
          <BotaoCustomizado
            text="Agendar"
            aoClicar={() => {
              if (!aptidaoSelecionada) {
                Alert.alert("Atenção", "Selecione uma disciplina primeiro!");
              } else if (!temAgenda) {
                Alert.alert(
                  "Aviso",
                  "Este professor ainda não configurou horários de atendimento na plataforma.",
                );
              } else {
                setModalAgendamentoVisivel(true);
              }
            }}
          />
        </View>
      </View>

      {/* ===================================== */}
      {/* MODAL DE AGENDAMENTO INTERATIVO       */}
      {/* ===================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalAgendamentoVisivel}
        onRequestClose={() => setModalAgendamentoVisivel(false)}
      >
        <View style={estilos.modalFundo}>
          {/* 🟢 Aplicamos o paddingBottom do insets ao modal também, para o botão "Enviar Solicitação" não colar em baixo */}
          <View
            style={[
              estilos.modalCartao,
              { paddingBottom: Math.max(insets.bottom + 20, 25) },
            ]}
          >
            <View style={estilos.modalCabecalho}>
              <Text style={estilos.modalTitulo}>Escolha um horário</Text>
              <TouchableOpacity
                onPress={() => setModalAgendamentoVisivel(false)}
              >
                <Feather name="x" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <Text style={estilos.modalLabel}>
              Dias disponíveis mapeados no banco:
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={estilos.scrollDias}
            >
              {listagemDatas.map((dataString, index) => {
                const isSelecionado = dataSelecionadaStr === dataString;
                const partes = dataString.split("-");
                const objetoData = new Date(
                  Number(partes[0]),
                  Number(partes[1]) - 1,
                  Number(partes[2]),
                );
                const diaNumero = partes[2];
                const diaSemana = diasDaSemanaNome[objetoData.getDay()];

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      estilos.cardDia,
                      isSelecionado ? estilos.cardDiaSelecionado : null,
                    ]}
                    onPress={() => {
                      setDataSelecionadaStr(dataString);
                      setHoraSelecionada("");
                    }}
                  >
                    <Text
                      style={[
                        estilos.textoDiaSemana,
                        isSelecionado ? estilos.textoBranco : null,
                      ]}
                    >
                      {diaSemana}
                    </Text>
                    <Text
                      style={[
                        estilos.textoDiaNumero,
                        isSelecionado ? estilos.textoBranco : null,
                      ]}
                    >
                      {diaNumero}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {dataSelecionadaStr !== "" && (
              <>
                <Text style={estilos.modalLabel}>
                  Horários livres encontrados:
                </Text>
                <View style={estilos.gridHorarios}>
                  {obterHorariosParaData(dataSelecionadaStr).map((hora) => {
                    const isHoraSelecionada = horaSelecionada === hora;
                    return (
                      <TouchableOpacity
                        key={hora}
                        style={[
                          estilos.cardHora,
                          isHoraSelecionada
                            ? estilos.cardHoraSelecionada
                            : null,
                        ]}
                        onPress={() => setHoraSelecionada(hora)}
                      >
                        <Text
                          style={[
                            estilos.textoHora,
                            isHoraSelecionada ? estilos.textoBranco : null,
                          ]}
                        >
                          {hora}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={{ marginTop: 10 }}>
              <BotaoCustomizado
                text="Enviar Solicitação"
                carregando={salvando}
                aoClicar={solicitarAgendamento}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// 3. ESTILOS LOCAIS (STYLESHEET)
// ==========================================
const estilos = StyleSheet.create({
  telaCarregamento: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    gap: 15,
  },
  textoErro: { fontSize: 16, color: "#666", marginTop: 10 },
  botaoVoltarErro: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#EEF5FF",
    borderRadius: 12,
    marginTop: 15,
  },
  textoBotaoErro: { color: "#0057B8", fontWeight: "bold" },
  telaGeral: { flex: 1, backgroundColor: "#FFF" },
  cabecalhoNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  botaoVoltarHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  tituloHeaderNav: { fontSize: 16, fontWeight: "bold", color: "#111" },
  conteudoScroll: { padding: 20 },

  perfilAutoridade: { alignItems: "center", marginTop: 10, marginBottom: 20 },
  fotoPerfilDestaque: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#E1F0FF",
    borderWidth: 4,
    borderColor: "#FFF",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  nomeVerificadoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 6,
  },
  nomeProfessorDestaque: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111",
    letterSpacing: -0.5,
  },
  containerTagsMetricas: { flexDirection: "row", gap: 12, marginTop: 10 },
  tagMetrica: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    gap: 6,
  },
  textoTagMetrica: { fontSize: 13, fontWeight: "700", color: "#333" },

  secaoBase: { marginBottom: 25 },
  textoDescritivo: { fontSize: 15, color: "#666", fontStyle: "italic" },
  textoDescritivoBio: { fontSize: 15, lineHeight: 26, color: "#444" },
  gridAptidoes: { gap: 12 },

  textoHora: { fontSize: 15, fontWeight: "600", color: "#333" },
  textoBranco: { color: "#FFF" },

  // 🟢 Estilo ajustado: Removemos o paddingVertical fixo daqui porque agora ele é gerado dinamicamente no componente
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  infoFooter: { flex: 1, justifyContent: "center" },
  textoRodapePequeno: { fontSize: 12, color: "#777", marginBottom: 2 },
  textoPrecoDestaque: { fontSize: 22, fontWeight: "900", color: "#111" },

  modalFundo: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCartao: {
    backgroundColor: "#FFF",
    width: "100%",
    paddingHorizontal: 25,
    paddingTop: 25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: 400,
  },
  modalCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitulo: { fontSize: 20, fontWeight: "bold", color: "#111" },
  modalLabel: {
    fontSize: 15,
    color: "#333",
    marginBottom: 12,
    fontWeight: "700",
    marginTop: 10,
  },
  scrollDias: { flexDirection: "row", marginBottom: 15, maxHeight: 85 },
  cardDia: {
    width: 65,
    height: 75,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#FFF",
  },
  cardDiaSelecionado: { backgroundColor: "#FF6B1A", borderColor: "#FF6B1A" },
  textoDiaSemana: { fontSize: 12, color: "#777", marginBottom: 4 },
  textoDiaNumero: { fontSize: 20, fontWeight: "bold", color: "#111" },

  gridHorarios: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  cardHora: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#FFF",
  },
  cardHoraSelecionada: { backgroundColor: "#0057B8", borderColor: "#0057B8" },
});
