/**
 * @file busca-presencial.tsx
 * @description Tela de Busca Presencial com Mapa - Orienta 2.0 [ORI-009B].
 * Implementada com total fidelidade à especificação visual IMG-007B (Buscar_Presencial.jpeg).
 * 
 * Funcionalidades:
 * - Cabeçalho oficial com Logo Orienta e sino com badge de notificações
 * - Título "Professores Próximos" e subtítulo explicativo
 * - Barra de localização "Sua localização: Caruaru - PE" com botão GPS "Usar minha localização"
 * - Componente de Mapa Interativo Web-Safe com visual cartográfico limpo, radar pulsante do usuário ("Você está aqui"), pins acadêmicos dos professores e FAB de centralização
 * - Barra de filtros com chips horizontais: [Filtros], "Todas as áreas ⌄", "Presencial ⌄", "↑↓ Ordenar por ⌄"
 * - Banner discreto de resiliência e simulação (identifica se os dados vêm da API Spring Boot ou do fallback offline)
 * - Feed de professores com distância de pedestre destacada (🚶 1,2 km), foto com dot online, selo verificado, badges de nível e botão [Ver perfil]
 * - Banner interurbano "Você também pode buscar por outras cidades >"
 * - Barra de navegação inferior (Tabs) do Orienta 2.0
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  buscarProfessoresPresencialComFallback,
  ProfessorPresencial,
  ResultadoBuscaPresencial,
} from "../services/buscaPresencialService";

const AREAS_DISPONIVEIS = [
  "Todas as áreas",
  "Matemática",
  "Física",
  "Programação",
  "Química",
  "História",
  "Biologia",
  "Inglês",
];

const OPCOES_ORDENACAO = [
  { id: "proximidade", label: "Mais próximos" },
  { id: "avaliacao", label: "Melhor avaliação" },
  { id: "precoMenor", label: "Menor preço" },
];

export default function BuscaPresencialScreen() {
  const insets = useSafeAreaInsets();

  const [carregando, setCarregando] = useState<boolean>(true);
  const [professores, setProfessores] = useState<ProfessorPresencial[]>([]);
  const [isSimulado, setIsSimulado] = useState<boolean>(true);
  const [motivoStatus, setMotivoStatus] = useState<string>("");
  const [cidadeAtual, setCidadeAtual] = useState<string>("Caruaru – PE");
  const [gpsAtivo, setGpsAtivo] = useState<boolean>(false);
  const [professorSelecionadoId, setProfessorSelecionadoId] = useState<number | null>(null);

  // Estados de Filtros
  const [areaSelecionada, setAreaSelecionada] = useState<string>("Todas as áreas");
  const [ordenacao, setOrdenacao] = useState<string>("proximidade");
  const [modalAreaVisivel, setModalAreaVisivel] = useState<boolean>(false);
  const [modalOrdenacaoVisivel, setModalOrdenacaoVisivel] = useState<boolean>(false);
  const [modalCidadeVisivel, setModalCidadeVisivel] = useState<boolean>(false);

  // Animação de pulso do radar do usuário
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Carregamento de dados com serviço híbrido resiliente
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const res: ResultadoBuscaPresencial = await buscarProfessoresPresencialComFallback({
        area: areaSelecionada,
        raioKm: 15,
      });

      let lista = [...res.professores];

      // Aplica ordenação
      if (ordenacao === "proximidade") {
        lista.sort((a, b) => a.distanciaKm - b.distanciaKm);
      } else if (ordenacao === "avaliacao") {
        lista.sort((a, b) => b.notaMedia - a.notaMedia);
      } else if (ordenacao === "precoMenor") {
        lista.sort((a, b) => a.precoHora - b.precoHora);
      }

      setProfessores(lista);
      setIsSimulado(res.isSimulado);
      setMotivoStatus(res.motivoStatus);
      if (res.cidadeAtual) setCidadeAtual(res.cidadeAtual);
    } catch {
      setIsSimulado(true);
      setMotivoStatus("Erro ao processar dados");
    } finally {
      setCarregando(false);
    }
  }, [areaSelecionada, ordenacao]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Ação de ativar localização via GPS
  const handleUsarMinhaLocalizacao = () => {
    setGpsAtivo(true);
    if (typeof window !== "undefined" && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setCidadeAtual("Caruaru – PE (GPS)");
          carregarDados();
        },
        () => {
          setCidadeAtual("Caruaru – PE");
        },
        { timeout: 5000 }
      );
    } else {
      setCidadeAtual("Caruaru – PE (Local)");
    }
  };

  const handleRecentralizarMapa = () => {
    setProfessorSelecionadoId(null);
    handleUsarMinhaLocalizacao();
  };

  const handleSelecionarPinProfessor = (profId: number) => {
    setProfessorSelecionadoId((prev) => (prev === profId ? null : profId));
  };

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 1. HEADER INSTITUCIONAL (LOGO ORIENTA + SINO DE NOTIFICAÇÕES)  */}
      {/* ============================================================== */}
      <View style={estilos.topHeader}>
        <View style={estilos.logoRow}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.8}
            style={estilos.logoBotao}
          >
            <View style={estilos.logoSimbolo}>
              <View style={estilos.logoCirculoInterno} />
            </View>
            <Text style={estilos.logoTexto}>Orienta</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/noticias")}
          style={estilos.sinoBotao}
          accessibilityLabel="Central de Notificações"
        >
          <Feather name="bell" size={22} color="#0F172A" />
          <View style={estilos.sinoBadge}>
            <Text style={estilos.sinoBadgeTexto}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ============================================================== */}
        {/* 2. TÍTULO E SUBTÍTULO DA TELA (PROFESSORES PRÓXIMOS)           */}
        {/* ============================================================== */}
        <View style={estilos.secaoTitulo}>
          <Text style={estilos.tituloPrincipal}>Professores Próximos</Text>
          <Text style={estilos.subtituloPrincipal}>
            Encontre profissionais perto de você para aulas presenciais.
          </Text>
        </View>

        {/* ============================================================== */}
        {/* 3. BARRA DE LOCALIZAÇÃO (SELETOR DE CIDADE + BOTÃO GPS)         */}
        {/* ============================================================== */}
        <View style={estilos.localizacaoBarra}>
          <TouchableOpacity
            style={estilos.seletorCidadeContainer}
            onPress={() => setModalCidadeVisivel(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={20} color="#0F172A" style={{ marginRight: 6 }} />
            <View>
              <Text style={estilos.labelLocalizacao}>Sua localização</Text>
              <View style={estilos.cidadeLinha}>
                <Text style={estilos.nomeCidade}>{cidadeAtual}</Text>
                <Ionicons name="chevron-down" size={14} color="#0F172A" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[estilos.botaoGPS, gpsAtivo && estilos.botaoGPSAtivo]}
            onPress={handleUsarMinhaLocalizacao}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="my-location"
              size={16}
              color={gpsAtivo ? "#FF6B1A" : "#0F172A"}
              style={{ marginRight: 5 }}
            />
            <Text style={[estilos.textoBotaoGPS, gpsAtivo && { color: "#FF6B1A" }]}>
              Usar minha localização
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* 4. COMPONENTE DE MAPA INTERATIVO (WEB-SAFE & ALTA FIDELIDADE)  */}
        {/* ============================================================== */}
        <View style={estilos.mapaContainer}>
          {/* Fundo do Mapa: Malha Urbana Estilizada */}
          <View style={estilos.mapaCanvas}>
            {/* Vias e Ruas Diagonais / Horizontais / Verticais */}
            <View style={[estilos.rua, { top: "28%", left: 0, right: 0, height: 16, transform: [{ rotate: "-12deg" }] }]} />
            <View style={[estilos.rua, { top: "62%", left: 0, right: 0, height: 18, transform: [{ rotate: "8deg" }] }]} />
            <View style={[estilos.rua, { top: 0, bottom: 0, left: "30%", width: 14, transform: [{ rotate: "15deg" }] }]} />
            <View style={[estilos.rua, { top: 0, bottom: 0, right: "28%", width: 16, transform: [{ rotate: "-10deg" }] }]} />

            {/* Áreas Verdes / Praças / Parques */}
            <View style={[estilos.parqueVerde, { top: 12, left: 12, width: 80, height: 50 }]} />
            <View style={[estilos.parqueVerde, { top: 18, right: 16, width: 65, height: 45 }]} />
            <View style={[estilos.parqueVerde, { bottom: 16, right: 28, width: 75, height: 55 }]} />

            {/* Linhas de Tráfego / Detalhes */}
            <View style={[estilos.faixaTracejada, { top: "29%", left: 0, right: 0, transform: [{ rotate: "-12deg" }] }]} />
            <View style={[estilos.faixaTracejada, { top: "63%", left: 0, right: 0, transform: [{ rotate: "8deg" }] }]} />

            {/* Marcador Central do Usuário (Você está aqui) */}
            <View style={estilos.pontoUsuarioContainer}>
              {/* Radar Pulsante */}
              <Animated.View
                style={[
                  estilos.radarPulso,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <View style={estilos.radarPulsoInterno} />

              {/* Ponto Central Azul */}
              <View style={estilos.pontoAzulCore} />

              {/* Balão / Tooltip "Você está aqui" */}
              <View style={estilos.balaoUsuario}>
                <Text style={estilos.textoBalaoUsuario}>Você está aqui</Text>
                <View style={estilos.trianguloBalao} />
              </View>
            </View>

            {/* Pins de Professores Espalhados nas Ruas */}
            {professores.map((prof) => {
              const selecionado = professorSelecionadoId === prof.id;
              return (
                <TouchableOpacity
                  key={`pin-${prof.id}`}
                  style={[
                    estilos.pinProfessor,
                    {
                      top: `${prof.mapPin.topPercent}%`,
                      left: `${prof.mapPin.leftPercent}%`,
                    },
                    selecionado && estilos.pinProfessorSelecionado,
                  ]}
                  onPress={() => handleSelecionarPinProfessor(prof.id)}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 name="graduation-cap" size={14} color="#FFFFFF" />

                  {/* Tooltip dinâmico quando o pin é clicado */}
                  {selecionado && (
                    <View style={estilos.tooltipPin}>
                      <Text style={estilos.tooltipNome} numberOfLines={1}>
                        {prof.nome.replace("Prof. ", "").replace("Profa. ", "")}
                      </Text>
                      <Text style={estilos.tooltipDistancia}>{prof.distanciaKm} km</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Botão Flutuante (FAB) de Centralização */}
            <TouchableOpacity
              style={estilos.fabCentralizar}
              onPress={handleRecentralizarMapa}
              activeOpacity={0.8}
              accessibilityLabel="Centralizar mapa na minha localização"
            >
              <MaterialIcons name="my-location" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 5. ALERTA DE SIMULAÇÃO / RESILIÊNCIA (REQUISITO ESTREITO)      */}
        {/* ============================================================== */}
        <View style={estilos.containerAlerta}>
          {isSimulado ? (
            <View style={estilos.badgeSimulacaoOffline}>
              <View style={estilos.iconeAlerta}>
                <Text style={{ fontSize: 13 }}>⚠️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.textoBadgeOffline}>
                  Modo Simulação: Dados offline (Fallback resiliente ativo)
                </Text>
                <Text style={estilos.subtextoBadgeOffline}>
                  Exibindo professores locais de Caruaru – PE conforme referência oficial.
                </Text>
              </View>
              <TouchableOpacity
                onPress={carregarDados}
                style={estilos.botaoReconectar}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="refresh-cw" size={14} color="#B45309" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={estilos.badgeConectadoAPI}>
              <View style={estilos.dotVerdeOnline} />
              <Text style={estilos.textoConectado}>
                Conectado à API Spring Boot em tempo real
              </Text>
            </View>
          )}
        </View>

        {/* ============================================================== */}
        {/* 6. BARRA DE FILTROS HORIZONTAIS (CHIPS)                        */}
        {/* ============================================================== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.filtrosScroll}
        >
          {/* Botão [Filtros] Azul Marinho Sólido */}
          <TouchableOpacity
            style={estilos.chipBotaoFiltros}
            onPress={() => setModalAreaVisivel(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={estilos.textoBotaoFiltros}>Filtros</Text>
          </TouchableOpacity>

          {/* Dropdown "Todas as áreas ⌄" */}
          <TouchableOpacity
            style={[
              estilos.chipDropdown,
              areaSelecionada !== "Todas as áreas" && estilos.chipDropdownAtivo,
            ]}
            onPress={() => setModalAreaVisivel(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                estilos.textoChipDropdown,
                areaSelecionada !== "Todas as áreas" && estilos.textoChipDropdownAtivo,
              ]}
            >
              {areaSelecionada}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={areaSelecionada !== "Todas as áreas" ? "#FF6B1A" : "#64748B"}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>

          {/* Chip Dropdown "Presencial ⌄" */}
          <View style={[estilos.chipDropdown, estilos.chipPresencialFixo]}>
            <Text style={estilos.textoChipDropdown}>Presencial</Text>
            <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 4 }} />
          </View>

          {/* Dropdown "↑↓ Ordenar por ⌄" */}
          <TouchableOpacity
            style={[
              estilos.chipDropdown,
              ordenacao !== "proximidade" && estilos.chipDropdownAtivo,
            ]}
            onPress={() => setModalOrdenacaoVisivel(true)}
            activeOpacity={0.8}
          >
            <Text style={estilos.iconeOrdenacaoTexto}>↑↓</Text>
            <Text
              style={[
                estilos.textoChipDropdown,
                ordenacao !== "proximidade" && estilos.textoChipDropdownAtivo,
                { marginLeft: 4 },
              ]}
            >
              Ordenar por
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={ordenacao !== "proximidade" ? "#FF6B1A" : "#64748B"}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </ScrollView>

        {/* ============================================================== */}
        {/* 7. FEED DE CARDS DE PROFESSORES PRÓXIMOS                       */}
        {/* ============================================================== */}
        <View style={estilos.feedProfessores}>
          {carregando ? (
            <View style={estilos.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B1A" />
              <Text style={estilos.textoCarregando}>Buscando professores próximos...</Text>
            </View>
          ) : professores.length === 0 ? (
            <View style={estilos.vazioContainer}>
              <Ionicons name="location-outline" size={48} color="#94A3B8" />
              <Text style={estilos.vazioTitulo}>Nenhum professor encontrado</Text>
              <Text style={estilos.vazioSubtitulo}>
                Não encontramos professores presenciais nessa área no raio atual.
              </Text>
              <TouchableOpacity
                style={estilos.botaoLimparFiltros}
                onPress={() => {
                  setAreaSelecionada("Todas as áreas");
                  setOrdenacao("proximidade");
                }}
              >
                <Text style={estilos.textoLimpar}>Limpar filtros</Text>
              </TouchableOpacity>
            </View>
          ) : (
            professores.map((prof) => {
              const estaSelecionado = professorSelecionadoId === prof.id;

              return (
                <View
                  key={`prof-${prof.id}`}
                  style={[
                    estilos.cardProfessor,
                    estaSelecionado && estilos.cardProfessorFocado,
                  ]}
                >
                  {/* Topo do Card: Avatar, Dados e Distância Pedestre */}
                  <View style={estilos.cardLinhaTopo}>
                    {/* Coluna 1: Avatar com Dot Online */}
                    <View style={estilos.avatarContainer}>
                      <Image source={{ uri: prof.fotoUrl }} style={estilos.avatarFoto} />
                      {prof.online && <View style={estilos.dotOnlineVerde} />}
                    </View>

                    {/* Coluna 2: Informações Principais */}
                    <View style={estilos.dadosContainer}>
                      {/* Nome e Selo de Verificado */}
                      <View style={estilos.nomeLinha}>
                        <Text style={estilos.nomeProfessor} numberOfLines={1}>
                          {prof.nome}
                        </Text>
                        <MaterialIcons
                          name="verified"
                          size={16}
                          color="#0057B8"
                          style={{ marginLeft: 4 }}
                        />
                      </View>

                      {/* Matéria */}
                      <Text style={estilos.materiaTexto}>{prof.materia}</Text>

                      {/* Linha de Avaliação */}
                      <View style={estilos.avaliacaoLinha}>
                        <MaterialIcons name="star" size={15} color="#F5A623" />
                        <Text style={estilos.notaTexto}>
                          {prof.notaMedia.toString().replace(".", ",")}{" "}
                          <Text style={estilos.avaliacoesContagem}>
                            ({prof.totalAvaliacoes} avaliações)
                          </Text>
                        </Text>
                      </View>

                      {/* Linha de Distância e Modalidade */}
                      <View style={estilos.localizacaoLinha}>
                        <Ionicons name="location-sharp" size={12} color="#64748B" />
                        <Text style={estilos.distanciaTexto}>
                          A {prof.distanciaKm.toString().replace(".", ",")} km • Presencial
                        </Text>
                      </View>

                      {/* Tags / Especialidades */}
                      <View style={estilos.tagsLinha}>
                        {prof.tags.map((tag, idx) => (
                          <View key={`tag-${idx}`} style={estilos.tagPill}>
                            <Text style={estilos.tagTexto}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Coluna 3: Distância Pedestre e Botão [Ver perfil] */}
                    <View style={estilos.colunaAcoesDireita}>
                      {/* Distância Pedestre no Canto Superior Direito */}
                      <View style={estilos.badgeDistanciaPedestre}>
                        <Ionicons name="walk" size={15} color="#0F172A" style={{ marginRight: 3 }} />
                        <Text style={estilos.textoDistanciaPedestre}>
                          {prof.distanciaKm.toString().replace(".", ",")} km
                        </Text>
                      </View>

                      {/* Botão de Ação [Ver perfil] */}
                      <TouchableOpacity
                        style={estilos.botaoVerPerfil}
                        onPress={() => router.push(`/professor/${prof.id}` as any)}
                        activeOpacity={0.8}
                      >
                        <Text style={estilos.textoVerPerfil}>Ver perfil</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ============================================================== */}
        {/* 8. BANNER RODAPÉ INTERURBANO                                  */}
        {/* ============================================================== */}
        <TouchableOpacity
          style={estilos.bannerInterurbano}
          onPress={() => setModalCidadeVisivel(true)}
          activeOpacity={0.8}
        >
          <View style={estilos.bannerInterurbanoConteudo}>
            <Ionicons name="location-sharp" size={18} color="#0284C7" style={{ marginRight: 8 }} />
            <Text style={estilos.textoBannerInterurbano}>
              Você também pode buscar por outras cidades
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#0284C7" />
        </TouchableOpacity>
      </ScrollView>

      {/* ============================================================== */}
      {/* 9. MODAIS DE FILTROS & SELEÇÃO                                 */}
      {/* ============================================================== */}

      {/* Modal: Selecionar Área / Matéria */}
      <Modal visible={modalAreaVisivel} transparent animationType="fade">
        <TouchableOpacity
          style={estilos.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalAreaVisivel(false)}
        >
          <View style={estilos.modalCard}>
            <Text style={estilos.modalTitulo}>Filtrar por Área</Text>
            {AREAS_DISPONIVEIS.map((area) => (
              <TouchableOpacity
                key={area}
                style={[
                  estilos.modalItem,
                  areaSelecionada === area && estilos.modalItemAtivo,
                ]}
                onPress={() => {
                  setAreaSelecionada(area);
                  setModalAreaVisivel(false);
                }}
              >
                <Text
                  style={[
                    estilos.modalItemTexto,
                    areaSelecionada === area && estilos.modalItemTextoAtivo,
                  ]}
                >
                  {area}
                </Text>
                {areaSelecionada === area && (
                  <Feather name="check" size={18} color="#FF6B1A" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Ordenação */}
      <Modal visible={modalOrdenacaoVisivel} transparent animationType="fade">
        <TouchableOpacity
          style={estilos.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalOrdenacaoVisivel(false)}
        >
          <View style={estilos.modalCard}>
            <Text style={estilos.modalTitulo}>Ordenar Resultados</Text>
            {OPCOES_ORDENACAO.map((opcao) => (
              <TouchableOpacity
                key={opcao.id}
                style={[
                  estilos.modalItem,
                  ordenacao === opcao.id && estilos.modalItemAtivo,
                ]}
                onPress={() => {
                  setOrdenacao(opcao.id);
                  setModalOrdenacaoVisivel(false);
                }}
              >
                <Text
                  style={[
                    estilos.modalItemTexto,
                    ordenacao === opcao.id && estilos.modalItemTextoAtivo,
                  ]}
                >
                  {opcao.label}
                </Text>
                {ordenacao === opcao.id && (
                  <Feather name="check" size={18} color="#FF6B1A" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Selecionar Cidade */}
      <Modal visible={modalCidadeVisivel} transparent animationType="fade">
        <TouchableOpacity
          style={estilos.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalCidadeVisivel(false)}
        >
          <View style={estilos.modalCard}>
            <Text style={estilos.modalTitulo}>Selecionar Cidade de Busca</Text>
            {["Caruaru – PE", "Recife – PE", "Campina Grande – PB", "João Pessoa – PB"].map(
              (cid) => (
                <TouchableOpacity
                  key={cid}
                  style={[
                    estilos.modalItem,
                    cidadeAtual === cid && estilos.modalItemAtivo,
                  ]}
                  onPress={() => {
                    setCidadeAtual(cid);
                    setModalCidadeVisivel(false);
                    carregarDados();
                  }}
                >
                  <Text
                    style={[
                      estilos.modalItemTexto,
                      cidadeAtual === cid && estilos.modalItemTextoAtivo,
                    ]}
                  >
                    {cid}
                  </Text>
                  {cidadeAtual === cid && (
                    <Feather name="check" size={18} color="#FF6B1A" />
                  )}
                </TouchableOpacity>
              )
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================== */}
      {/* 10. TAB BAR INFERIOR PADRÃO ORIENTA 2.0                        */}
      {/* ============================================================== */}
      <View style={[estilos.tabBarInferior, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.replace("/(tabs)")}
        >
          <Feather name="home" size={20} color="#94A3B8" />
          <Text style={estilos.tabLabel}>Início</Text>
        </TouchableOpacity>

        <TouchableOpacity style={estilos.tabItem}>
          <Feather name="search" size={20} color="#FF6B1A" />
          <Text style={[estilos.tabLabel, estilos.tabLabelAtivo]}>Buscar</Text>
          <View style={estilos.tabIndicadorAtivo} />
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/agenda")}
        >
          <Feather name="calendar" size={20} color="#94A3B8" />
          <Text style={estilos.tabLabel}>Minhas aulas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/noticias")}
        >
          <View style={{ position: "relative" }}>
            <Feather name="message-square" size={20} color="#94A3B8" />
            <View style={estilos.tabBadge}>
              <Text style={estilos.tabBadgeTexto}>3</Text>
            </View>
          </View>
          <Text style={estilos.tabLabel}>Mensagens</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/perfil")}
        >
          <Feather name="user" size={20} color="#94A3B8" />
          <Text style={estilos.tabLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==============================================================
// FOLHA DE ESTILOS COM MEDIDAS PRECISAS DA REFERÊNCIA VISUAL
// ==============================================================
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // 1. Top Header
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBotao: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoSimbolo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FF6B1A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  logoCirculoInterno: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  logoTexto: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  sinoBotao: {
    position: "relative",
    padding: 6,
  },
  sinoBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#FF6B1A",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  sinoBadgeTexto: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  // 2. Seção Título
  secaoTitulo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  tituloPrincipal: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtituloPrincipal: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  // 3. Barra de Localização
  localizacaoBarra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  seletorCidadeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelLocalizacao: {
    fontSize: 11,
    color: "#64748B",
  },
  cidadeLinha: {
    flexDirection: "row",
    alignItems: "center",
  },
  nomeCidade: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  botaoGPS: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  botaoGPSAtivo: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  textoBotaoGPS: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },

  // 4. Mapa Interativo
  mapaContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    height: 250,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  mapaCanvas: {
    flex: 1,
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  rua: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  parqueVerde: {
    position: "absolute",
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
  },
  faixaTracejada: {
    position: "absolute",
    height: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  pontoUsuarioContainer: {
    position: "absolute",
    top: "48%",
    left: "50%",
    transform: [{ translateX: -40 }, { translateY: -40 }],
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  radarPulso: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(59, 130, 246, 0.25)",
    borderWidth: 1.5,
    borderColor: "rgba(37, 99, 235, 0.4)",
  },
  radarPulsoInterno: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
  pontoAzulCore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  balaoUsuario: {
    position: "absolute",
    top: -26,
    backgroundColor: "#0F2942",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
  },
  textoBalaoUsuario: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  trianguloBalao: {
    position: "absolute",
    bottom: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#0F2942",
  },

  // Pins dos Professores
  pinProfessor: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B1A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pinProfessorSelecionado: {
    backgroundColor: "#0F172A",
    borderColor: "#FF6B1A",
    transform: [{ scale: 1.15 }],
  },
  tooltipPin: {
    position: "absolute",
    bottom: 34,
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  tooltipNome: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tooltipDistancia: {
    color: "#FDBA74",
    fontSize: 9,
    fontWeight: "600",
  },
  fabCentralizar: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  // 5. Alerta de Resiliência / Simulação
  containerAlerta: {
    marginHorizontal: 16,
    marginTop: 10,
  },
  badgeSimulacaoOffline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  iconeAlerta: {
    marginRight: 8,
  },
  textoBadgeOffline: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  subtextoBadgeOffline: {
    fontSize: 10,
    color: "#B45309",
    marginTop: 1,
  },
  botaoReconectar: {
    padding: 6,
    marginLeft: 6,
  },
  badgeConectadoAPI: {
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
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  textoConectado: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
  },

  // 6. Barra de Filtros (Chips)
  filtrosScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
  },
  chipBotaoFiltros: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#002B49",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  textoBotaoFiltros: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  chipDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipDropdownAtivo: {
    borderColor: "#FF6B1A",
    backgroundColor: "#FFF7ED",
  },
  chipPresencialFixo: {
    backgroundColor: "#F8FAFC",
  },
  textoChipDropdown: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  textoChipDropdownAtivo: {
    color: "#FF6B1A",
  },
  iconeOrdenacaoTexto: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },

  // 7. Feed de Professores
  feedProfessores: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  cardProfessor: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  cardProfessorFocado: {
    borderColor: "#FF6B1A",
    borderWidth: 1.5,
    backgroundColor: "#FFFDFB",
  },
  cardLinhaTopo: {
    flexDirection: "row",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
    alignSelf: "flex-start",
  },
  avatarFoto: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#E2E8F0",
  },
  dotOnlineVerde: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  dadosContainer: {
    flex: 1,
    justifyContent: "center",
  },
  nomeLinha: {
    flexDirection: "row",
    alignItems: "center",
  },
  nomeProfessor: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    maxWidth: 160,
  },
  materiaTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginTop: 1,
  },
  avaliacaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  notaTexto: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginLeft: 3,
  },
  avaliacoesContagem: {
    fontWeight: "400",
    color: "#64748B",
  },
  localizacaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  distanciaTexto: {
    fontSize: 11,
    color: "#64748B",
    marginLeft: 3,
  },
  tagsLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tagPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagTexto: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  colunaAcoesDireita: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 8,
  },
  badgeDistanciaPedestre: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textoDistanciaPedestre: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  botaoVerPerfil: {
    borderWidth: 1.5,
    borderColor: "#FF6B1A",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  textoVerPerfil: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B1A",
  },

  // 8. Banner Interurbano
  bannerInterurbano: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
  },
  bannerInterurbanoConteudo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  textoBannerInterurbano: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0369A1",
    flex: 1,
  },

  // 9. Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    padding: 20,
    elevation: 8,
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalItemAtivo: {
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  modalItemTexto: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  modalItemTextoAtivo: {
    color: "#FF6B1A",
    fontWeight: "700",
  },

  // 10. Tab Bar Inferior
  tabBarInferior: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    elevation: 10,
  },
  tabItem: {
    alignItems: "center",
    position: "relative",
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "600",
  },
  tabLabelAtivo: {
    color: "#FF6B1A",
    fontWeight: "700",
  },
  tabIndicadorAtivo: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#FF6B1A",
    marginTop: 3,
  },
  tabBadge: {
    position: "absolute",
    top: -3,
    right: -8,
    backgroundColor: "#FF6B1A",
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBadgeTexto: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  // Loading & Vazio
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  textoCarregando: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
    fontWeight: "500",
  },
  vazioContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  vazioTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
  },
  vazioSubtitulo: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 24,
  },
  botaoLimparFiltros: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FF6B1A",
    borderRadius: 8,
  },
  textoLimpar: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
