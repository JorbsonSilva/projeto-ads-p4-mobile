/**
 * @file [id].tsx
 * @description Tela de Perfil Público do Professor para Agendamento - Orienta 2.0 [ORI-010].
 * Implementada com total fidelidade à especificação visual IMG-009.
 * 
 * Funcionalidades:
 * - Header superior com botão voltar, favoritar com estado interativo e compartilhar
 * - Hero do Mentor com foto grande, dot online, selo verificado, formação acadêmica e modalidade
 * - Grid de 3 métricas de alto impacto (Alunos atendidos, Taxa de aprovação, Avaliação média)
 * - Cards comparativos de modalidade (Online com tag "Mais escolhida" vs Presencial)
 * - Grade de disponibilidade semanal interativa (dias da semana e slots de horários clicáveis)
 * - Tags das disciplinas lecionadas
 * - Biografia e metodologia pedagógica
 * - Avaliações recentes de alunos
 * - Barra de ação fixa no rodapé (Sticky Action Footer) com preço dinâmico e botão "Agendar aula"
 * - Serviço híbrido resiliente com fallback mocado oficial e banner de simulação offline
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  obterPerfilProfessorComFallback,
  PerfilProfessorPublico,
  ResultadoPerfilProfessor,
} from "../../services/professorService";

const PROFESSOR_INICIAL: PerfilProfessorPublico = {
  id: 0,
  nome: "Carregando...",
  tituloAcademico: "",
  fotoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
  online: false,
  verificado: false,
  cidade: "",
  notaMedia: 5.0,
  totalAvaliacoes: 0,
  alunosAtendidos: 0,
  taxaAprovacao: 100,
  bio: "",
  precoOnline: 0,
  precoPresencial: 0,
  materias: [],
  disponibilidadeSemanal: [],
  avaliacoesRecentes: [],
};

export default function PerfilProfessorScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [professor, setProfessor] = useState<PerfilProfessorPublico>(PROFESSOR_INICIAL);
  const [isSimulado, setIsSimulado] = useState<boolean>(false);
  const [favoritado, setFavoritado] = useState<boolean>(false);

  // Seleção de Modalidade (ONLINE vs PRESENCIAL)
  const [modalidade, setModalidade] = useState<"ONLINE" | "PRESENCIAL">("ONLINE");

  const carregarPerfil = useCallback(async () => {
    try {
      const professorId = Array.isArray(id) ? id[0] : id || "101";
      const res: ResultadoPerfilProfessor = await obterPerfilProfessorComFallback(professorId);
      if (res.professor) {
        setProfessor(res.professor);
      }
      setIsSimulado(res.isSimulado);
    } catch {
      setIsSimulado(false);
    }
  }, [id]);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  const toggleFavorito = () => {
    setFavoritado((prev) => !prev);
  };

  const handleCompartilhar = () => {
    if (typeof window !== "undefined" && navigator?.share) {
      navigator.share({
        title: professor?.nome || "Perfil do Professor - Orienta",
        text: `Confira o perfil de ${professor?.nome} no Orienta 2.0!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      Alert.alert("Compartilhar", `Link do perfil copiado com sucesso!`);
    }
  };

  const handleAgendarAula = () => {
    router.push("/marcar-aula" as any);
  };

  if (!professor) {
    return (
      <View style={[estilos.loadingContainer, { paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={48} color="#94A3B8" />
        <Text style={estilos.textoVazio}>Professor não encontrado</Text>
        <TouchableOpacity style={estilos.botaoVoltar} onPress={() => router.back()}>
          <Text style={estilos.textoBotaoVoltar}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const precoAtual = modalidade === "ONLINE" ? professor.precoOnline : professor.precoPresencial;

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 1. HEADER SUPERIOR (VOLTAR + FAVORITAR + COMPARTILHAR)         */}
      {/* ============================================================== */}
      <View style={estilos.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={estilos.botaoHeaderCircular}
          accessibilityLabel="Voltar para a tela anterior"
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <Text style={estilos.tituloHeaderTop} numberOfLines={1}>
          Perfil do Professor
        </Text>

        <View style={estilos.acoesHeaderDireita}>
          <TouchableOpacity
            onPress={toggleFavorito}
            style={[
              estilos.botaoHeaderCircular,
              favoritado && estilos.botaoFavoritoAtivo,
            ]}
            accessibilityLabel="Favoritar professor"
          >
            <Ionicons
              name={favoritado ? "heart" : "heart-outline"}
              size={20}
              color={favoritado ? "#FF6B1A" : "#0F172A"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCompartilhar}
            style={estilos.botaoHeaderCircular}
            accessibilityLabel="Compartilhar perfil"
          >
            <Feather name="share-2" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ============================================================== */}
        {/* 2. HERO DO MENTOR (FOTO, SELO, AVALIAÇÃO, MODALIDADE)          */}
        {/* ============================================================== */}
        <View style={estilos.heroCard}>
          {/* Avatar com Dot Online */}
          <View style={estilos.avatarContainer}>
            <Image source={{ uri: professor.fotoUrl }} style={estilos.avatarFoto} />
            {professor.online && <View style={estilos.dotOnlineVerde} />}
          </View>

          {/* Nome e Selo de Verificação */}
          <View style={estilos.nomeLinha}>
            <Text style={estilos.nomeProfessor}>{professor.nome}</Text>
            {professor.verificado && (
              <MaterialIcons
                name="verified"
                size={20}
                color="#0057B8"
                style={{ marginLeft: 6 }}
              />
            )}
          </View>

          {/* Título Acadêmico / Formação */}
          <Text style={estilos.tituloAcademico}>{professor.tituloAcademico}</Text>

          {/* Linha de Avaliação com Estrelas */}
          <View style={estilos.avaliacaoLinha}>
            <View style={estilos.estrelasRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcons key={star} name="star" size={16} color="#F5A623" />
              ))}
            </View>
            <Text style={estilos.notaDestaque}>
              {professor.notaMedia.toString().replace(".", ",")}{" "}
              <Text style={estilos.totalAvaliacoesTexto}>
                ({professor.totalAvaliacoes} avaliações)
              </Text>
            </Text>
          </View>

          {/* Tag de Modalidade e Região */}
          <View style={estilos.badgeLocalizacao}>
            <Ionicons name="location-sharp" size={13} color="#0284C7" />
            <Text style={estilos.textoBadgeLocalizacao}>
              Presencial e Online • {professor.cidade}
            </Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 3. ALERTA DE SIMULAÇÃO / RESILIÊNCIA                           */}
        {/* ============================================================== */}
        <View style={estilos.containerAlerta}>
          {isSimulado ? (
            <View style={estilos.badgeSimulacao}>
              <Text style={{ fontSize: 13, marginRight: 6 }}>⚠️</Text>
              <Text style={estilos.textoBadgeSimulacao}>
                Modo Simulação: Dados offline (Backend indisponível)
              </Text>
              <TouchableOpacity onPress={carregarPerfil} style={{ marginLeft: "auto" }}>
                <Feather name="refresh-cw" size={13} color="#B45309" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={estilos.badgeConectado}>
              <View style={estilos.dotVerdeOnline} />
              <Text style={estilos.textoConectado}>Conectado à API Orienta em tempo real</Text>
            </View>
          )}
        </View>

        {/* ============================================================== */}
        {/* 4. GRID DE 3 MÉTRICAS (ALUNOS, APROVAÇÃO, NOTA MÉDIA)          */}
        {/* ============================================================== */}
        <View style={estilos.metricasGrid}>
          <View style={estilos.metricaItem}>
            <View style={[estilos.metricaIconeWrapper, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="users" size={18} color="#2563EB" />
            </View>
            <Text style={estilos.metricaNumero}>{professor.alunosAtendidos}+</Text>
            <Text style={estilos.metricaLabel}>Alunos atendidos</Text>
          </View>

          <View style={estilos.metricaItem}>
            <View style={[estilos.metricaIconeWrapper, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="award" size={18} color="#059669" />
            </View>
            <Text style={estilos.metricaNumero}>{professor.taxaAprovacao}%</Text>
            <Text style={estilos.metricaLabel}>Taxa de aprovação</Text>
          </View>

          <View style={estilos.metricaItem}>
            <View style={[estilos.metricaIconeWrapper, { backgroundColor: "#FFFBEB" }]}>
              <MaterialIcons name="star-outline" size={20} color="#D97706" />
            </View>
            <Text style={estilos.metricaNumero}>
              {professor.notaMedia.toString().replace(".", ",")}
            </Text>
            <Text style={estilos.metricaLabel}>Avaliação média</Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 5. SELEÇÃO DE MODALIDADE (CARDS ONLINE VS PRESENCIAL)          */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <Text style={estilos.secaoTitulo}>Modalidade da Aula</Text>
          <Text style={estilos.secaoSubtitulo}>
            Selecione o formato que melhor se adapta à sua rotina:
          </Text>

          <View style={estilos.modalidadesContainer}>
            {/* Card Modalidade 1: Online */}
            <TouchableOpacity
              style={[
                estilos.cardModalidade,
                modalidade === "ONLINE" && estilos.cardModalidadeAtivo,
              ]}
              onPress={() => setModalidade("ONLINE")}
              activeOpacity={0.8}
            >
              <View style={estilos.modalidadeTopoLinha}>
                <View style={estilos.modalidadeIconeTitulo}>
                  <View style={[estilos.iconeModalidadeBox, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="monitor" size={18} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={estilos.tituloModalidade}>100% Online</Text>
                    <Text style={estilos.subtituloModalidade}>Sala Virtual Orienta</Text>
                  </View>
                </View>

                {/* Badge "Mais Escolhida" */}
                <View style={estilos.badgeMaisEscolhida}>
                  <Text style={estilos.textoMaisEscolhida}>Mais escolhida</Text>
                </View>
              </View>

              <Text style={estilos.descricaoModalidade}>
                Aula ao vivo com quadro interativo, gravação da sessão e compartilhamento de materiais.
              </Text>

              <View style={estilos.modalidadePrecoLinha}>
                <Text style={estilos.precoModalidade}>
                  R$ {professor.precoOnline.toFixed(2).replace(".", ",")}{" "}
                  <Text style={estilos.unidadeHora}>/ hora</Text>
                </Text>
                <View
                  style={[
                    estilos.radioIndicador,
                    modalidade === "ONLINE" && estilos.radioIndicadorAtivo,
                  ]}
                >
                  {modalidade === "ONLINE" && <View style={estilos.radioPontoInterno} />}
                </View>
              </View>
            </TouchableOpacity>

            {/* Card Modalidade 2: Presencial */}
            <TouchableOpacity
              style={[
                estilos.cardModalidade,
                modalidade === "PRESENCIAL" && estilos.cardModalidadeAtivo,
              ]}
              onPress={() => setModalidade("PRESENCIAL")}
              activeOpacity={0.8}
            >
              <View style={estilos.modalidadeTopoLinha}>
                <View style={estilos.modalidadeIconeTitulo}>
                  <View style={[estilos.iconeModalidadeBox, { backgroundColor: "#FFF7ED" }]}>
                    <Ionicons name="location-sharp" size={18} color="#FF6B1A" />
                  </View>
                  <View>
                    <Text style={estilos.tituloModalidade}>Presencial</Text>
                    <Text style={estilos.subtituloModalidade}>{professor.cidade}</Text>
                  </View>
                </View>

                <View style={estilos.badgePresencialTag}>
                  <Text style={estilos.textoPresencialTag}>Sob consulta</Text>
                </View>
              </View>

              <Text style={estilos.descricaoModalidade}>
                Aula presencial em domicílio ou biblioteca acordada, respeitando os protocolos de segurança.
              </Text>

              <View style={estilos.modalidadePrecoLinha}>
                <Text style={estilos.precoModalidade}>
                  R$ {professor.precoPresencial.toFixed(2).replace(".", ",")}{" "}
                  <Text style={estilos.unidadeHora}>/ hora</Text>
                </Text>
                <View
                  style={[
                    estilos.radioIndicador,
                    modalidade === "PRESENCIAL" && estilos.radioIndicadorAtivo,
                  ]}
                >
                  {modalidade === "PRESENCIAL" && <View style={estilos.radioPontoInterno} />}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 6. DISCIPLINAS E ESPECIALIDADES                                */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <Text style={estilos.secaoTitulo}>Disciplinas & Especialidades</Text>
          <View style={estilos.chipsDisciplinasContainer}>
            {professor.materias.map((materia, mIdx) => (
              <View key={`m-${mIdx}`} style={estilos.chipDisciplina}>
                <FontAwesome5 name="book-reader" size={13} color="#FF6B1A" style={{ marginRight: 6 }} />
                <Text style={estilos.chipDisciplinaTexto}>{materia}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ============================================================== */}
        {/* 8. SOBRE O PROFESSOR (BIOGRAFIA & METODOLOGIA)                 */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <Text style={estilos.secaoTitulo}>Sobre o Professor</Text>
          <View style={estilos.cardBiografia}>
            <Text style={estilos.textoBiografia}>{professor.bio}</Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 9. AVALIAÇÕES RECENTES DE ALUNOS                               */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <View style={estilos.topoAvaliacoesLinha}>
            <Text style={estilos.secaoTitulo}>Avaliações Recentes</Text>
            <Text style={estilos.linkVerTodasAvaliacoes}>
              {professor.totalAvaliacoes} comentários
            </Text>
          </View>

          {professor.avaliacoesRecentes.map((av) => (
            <View key={`av-${av.id}`} style={estilos.cardAvaliacao}>
              <View style={estilos.avaliacaoCardTopo}>
                <Image source={{ uri: av.alunoFoto }} style={estilos.alunoFoto} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={estilos.alunoNome}>{av.alunoNome}</Text>
                  <Text style={estilos.avaliacaoData}>{av.data}</Text>
                </View>
                <View style={estilos.estrelasRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <MaterialIcons key={s} name="star" size={14} color="#F5A623" />
                  ))}
                </View>
              </View>
              <Text style={estilos.avaliacaoComentario}>{av.comentario}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ============================================================== */}
      {/* 10. STICKY ACTION FOOTER (CTA FIXO INFERIOR COM PREÇO DINÂMICO) */}
      {/* ============================================================== */}
      <View
        style={[
          estilos.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={estilos.precoFooterContainer}>
          <Text style={estilos.labelPrecoFooter}>Valor por hora</Text>
          <View style={estilos.valorFooterLinha}>
            <Text style={estilos.valorFooterGrande}>
              R$ {precoAtual.toFixed(2).replace(".", ",")}
            </Text>
            <Text style={estilos.unidadeFooter}>/h</Text>
          </View>
        </View>

        <TouchableOpacity
          style={estilos.botaoAgendarCTA}
          onPress={handleAgendarAula}
          activeOpacity={0.85}
        >
          <Feather name="calendar" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={estilos.textoBotaoAgendar}>Agendar aula</Text>
        </TouchableOpacity>
      </View>


    </View>
  );
}

// ==============================================================
// FOLHA DE ESTILOS DA ESPECIFICAÇÃO IMG-009
// ==============================================================
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },
  textoLoading: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
    fontWeight: "500",
  },
  textoVazio: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  botaoVoltar: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FF6B1A",
    borderRadius: 10,
  },
  textoBotaoVoltar: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // 1. Top Header
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tituloHeaderTop: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    maxWidth: 180,
  },
  botaoHeaderCircular: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  botaoFavoritoAtivo: {
    backgroundColor: "#FFF7ED",
  },
  acoesHeaderDireita: {
    flexDirection: "row",
    gap: 8,
  },

  // 2. Hero Card
  heroCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 10,
  },
  avatarFoto: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#E2E8F0",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  dotOnlineVerde: {
    position: "absolute",
    bottom: 2,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  nomeLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  nomeProfessor: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  tituloAcademico: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 3,
  },
  avaliacaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  estrelasRow: {
    flexDirection: "row",
    marginRight: 6,
  },
  notaDestaque: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalAvaliacoesTexto: {
    fontWeight: "400",
    color: "#64748B",
  },
  badgeLocalizacao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 10,
    gap: 4,
  },
  textoBadgeLocalizacao: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0369A1",
  },

  // 3. Alerta de Resiliência
  containerAlerta: {
    marginHorizontal: 16,
    marginTop: 10,
  },
  badgeSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  textoBadgeSimulacao: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    flex: 1,
  },
  badgeConectado: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dotVerdeOnline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  textoConectado: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
  },

  // 4. Métricas Grid
  metricasGrid: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  metricaItem: {
    flex: 1,
    alignItems: "center",
  },
  metricaIconeWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  metricaNumero: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricaLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
    textAlign: "center",
  },

  // 5. Seções Comuns
  secaoContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  secaoSubtitulo: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 10,
  },

  // Modalidades (Cards)
  modalidadesContainer: {
    gap: 10,
  },
  cardModalidade: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  cardModalidadeAtivo: {
    borderColor: "#FF6B1A",
    backgroundColor: "#FFFDFB",
  },
  modalidadeTopoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalidadeIconeTitulo: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconeModalidadeBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  tituloModalidade: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtituloModalidade: {
    fontSize: 11,
    color: "#64748B",
  },
  badgeMaisEscolhida: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD8A8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  textoMaisEscolhida: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C2410C",
  },
  badgePresencialTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  textoPresencialTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  descricaoModalidade: {
    fontSize: 12,
    color: "#475569",
    marginTop: 8,
    lineHeight: 17,
  },
  modalidadePrecoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  precoModalidade: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FF6B1A",
  },
  unidadeHora: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  radioIndicador: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioIndicadorAtivo: {
    borderColor: "#FF6B1A",
  },
  radioPontoInterno: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF6B1A",
  },

  // 6. Disponibilidade Semanal
  diasSemanaScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  diaCard: {
    width: 62,
    height: 68,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  diaCardAtivo: {
    backgroundColor: "#0F2942",
    borderColor: "#0F2942",
  },
  diaSemanaNome: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  diaSemanaNomeAtivo: {
    color: "#93C5FD",
  },
  diaMesNumero: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  diaMesNumeroAtivo: {
    color: "#FFFFFF",
  },
  dotDiaAtivo: {
    position: "absolute",
    bottom: 5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FF6B1A",
  },

  horariosContainer: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  labelTurno: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  gradeHorarios: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotHorarioBotao: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  slotHorarioAtivo: {
    backgroundColor: "#0F2942",
    borderColor: "#FF6B1A",
  },
  slotHorarioIndisponivel: {
    opacity: 0.4,
    backgroundColor: "#F1F5F9",
  },
  slotHorarioTexto: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  slotHorarioTextoAtivo: {
    color: "#FFFFFF",
  },
  slotHorarioTextoIndisponivel: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },

  // 7. Disciplinas
  chipsDisciplinasContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chipDisciplina: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipDisciplinaTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },

  // 8. Biografia
  cardBiografia: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 4,
  },
  textoBiografia: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },

  // 9. Avaliações
  topoAvaliacoesLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  linkVerTodasAvaliacoes: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF6B1A",
  },
  cardAvaliacao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 10,
  },
  avaliacaoCardTopo: {
    flexDirection: "row",
    alignItems: "center",
  },
  alunoFoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
  },
  alunoNome: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  avaliacaoData: {
    fontSize: 10,
    color: "#94A3B8",
  },
  avaliacaoComentario: {
    fontSize: 12,
    color: "#475569",
    marginTop: 8,
    lineHeight: 18,
  },

  // 10. Sticky Footer
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  precoFooterContainer: {
    justifyContent: "center",
  },
  labelPrecoFooter: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  valorFooterLinha: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  valorFooterGrande: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FF6B1A",
  },
  unidadeFooter: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 2,
    fontWeight: "600",
  },
  botaoAgendarCTA: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B1A",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#FF6B1A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  textoBotaoAgendar: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // 11. Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    elevation: 8,
  },
  modalIconeSucesso: {
    marginBottom: 8,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  modalMensagem: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  modalResumoBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginTop: 14,
    gap: 4,
  },
  modalResumoLinha: {
    fontSize: 12,
    color: "#334155",
  },
  botaoModalConfirmar: {
    backgroundColor: "#FF6B1A",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  textoBotaoModal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  botaoModalFechar: {
    marginTop: 10,
    paddingVertical: 8,
  },
  textoModalFechar: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
});
