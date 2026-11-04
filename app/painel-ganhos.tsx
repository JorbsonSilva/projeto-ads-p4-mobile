/**
 * @file painel-ganhos.tsx
 * @description Dashboard Analítico de Desempenho e Painel Financeiro do Professor [ORI-020 / IMG-013].
 * Alinhado estritamente à referência visual oficial (DashBoard.png) com:
 * 1. Card Azul Marinho Superior ("Seus resultados") com gráfico de linha luminosa e métricas 2x2.
 * 2. Gráfico Donut de distribuição das aulas (66,7% Pagas, 25% Gratuitas, 8,3% Pendentes).
 * 3. Barras de volume proporcional por disciplina lecionada.
 * 4. Extrato financeiro recente com filtros por status e badges semânticos.
 * 5. CTAs integrados para Solicitação de Saque (/saque) e Gestão de Aulas (/solicitacoes).
 * 6. Barra de navegação inferior oficial de 5 abas (Professor) com a aba Ganhos ativa.
 * 7. Serviço híbrido resiliente com fallback offline e badge semântico.
 */

import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { useAuth } from "../context/AuthContext";
import {
  DadosDesempenho,
  DADOS_DESEMPENHO_MOCK,
  ItemVolumeDisciplina,
  obterDadosDesempenho,
  SegmentoDistribuicao,
  TransacaoExtrato,
} from "../services/painelGanhosService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PainelGanhosScreen() {
  const insets = useSafeAreaInsets();
  const { usuarioId } = useAuth() as any;

  // Estados de dados e carregamento
  const [dados, setDados] = useState<DadosDesempenho>(DADOS_DESEMPENHO_MOCK);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [ocultarValores, setOcultarValores] = useState(false);
  const [semanaSelecionada, setSemanaSelecionada] = useState<number | null>(3); // Default última semana
  const [filtroExtrato, setFiltroExtrato] = useState<"TODAS" | "PAGAS" | "GRATUITAS" | "PENDENTES">("TODAS");

  /**
   * Carrega os dados analíticos via serviço resiliente
   */
  const carregarPainel = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    try {
      const res = await obterDadosDesempenho(usuarioId ? Number(usuarioId) : undefined);
      setDados(res);
    } catch {
      setDados(DADOS_DESEMPENHO_MOCK);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    carregarPainel();
  }, [carregarPainel]);

  // Formatação monetária segura
  const formatarMoeda = (valor: number) => {
    if (ocultarValores) return "R$ ••••••";
    return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filtragem do extrato recente
  const extratoFiltrado = dados.extratoRecente.filter((item) => {
    if (filtroExtrato === "TODAS") return true;
    if (filtroExtrato === "PAGAS") return item.tipo === "PAGA" && item.status === "RECEBIDA";
    if (filtroExtrato === "GRATUITAS") return item.tipo === "GRATUITA";
    if (filtroExtrato === "PENDENTES") return item.status === "EM_ANALISE" || item.status === "PROCESSANDO";
    return true;
  });

  // Dimensões do Gráfico de Linha Superior
  const CHART_WIDTH = Math.min(SCREEN_WIDTH - 64, 340);
  const CHART_HEIGHT = 110;
  const paddingX = 28;
  const paddingY = 16;
  const graphWidth = CHART_WIDTH - paddingX * 2;
  const graphHeight = CHART_HEIGHT - paddingY * 2;

  // Cálculo das coordenadas dos 4 pontos do gráfico de linha
  const pontos = dados.graficoEvolucao.map((p, index) => {
    const x = paddingX + (index / (dados.graficoEvolucao.length - 1)) * graphWidth;
    // Escala normalizada entre R$ 300 e R$ 900
    const minVal = 300;
    const maxVal = 900;
    const normalizedY = (p.valor - minVal) / (maxVal - minVal);
    const y = CHART_HEIGHT - paddingY - normalizedY * graphHeight;
    return { ...p, x, y };
  });

  // Caminho da linha curva SVG e da área de preenchimento
  const linePath = pontos.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (p.x - prev.x) / 2;
    const cp2y = p.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
  }, "");

  const areaPath = `${linePath} L ${pontos[pontos.length - 1].x} ${CHART_HEIGHT} L ${pontos[0].x} ${CHART_HEIGHT} Z`;

  // Cálculos do Donut Chart (Raio = 42, Centro = 55, 55)
  const donutRadius = 38;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const strokeWidth = 14;

  const pagasRatio = (dados.distribuicaoAulas[0]?.percentual || 66.7) / 100;
  const gratisRatio = (dados.distribuicaoAulas[1]?.percentual || 25.0) / 100;
  const pendentesRatio = (dados.distribuicaoAulas[2]?.percentual || 8.3) / 100;

  const pagasDash = pagasRatio * donutCircumference;
  const gratisDash = gratisRatio * donutCircumference;
  const pendentesDash = pendentesRatio * donutCircumference;

  const pagasOffset = 0;
  const gratisOffset = -pagasDash;
  const pendentesOffset = -(pagasDash + gratisDash);

  return (
    <SafeAreaView style={estilos.container} edges={["top"]}>
      {/* ============================================================== */}
      {/* 1. HEADER FIXO SUPERIOR DA TELA COM CONTEXTO E VOLTAR          */}
      {/* ============================================================== */}
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => router.push("/home-professor" as any)}
          style={estilos.botaoVoltar}
          activeOpacity={0.7}
          accessibilityLabel="Voltar para a Home do Professor"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={estilos.headerInfo}>
          <Text style={estilos.headerTitulo}>Painel de Ganhos</Text>
          <Text style={estilos.headerSubtitulo}>{dados.periodoReferencia} • Visão Analítica</Text>
        </View>

        <TouchableOpacity
          onPress={() => carregarPainel(true)}
          style={estilos.botaoRefresh}
          activeOpacity={0.7}
          disabled={atualizando}
          accessibilityLabel="Atualizar métricas de faturamento"
        >
          {atualizando ? (
            <ActivityIndicator size="small" color="#FF5A1F" />
          ) : (
            <Feather name="refresh-cw" size={19} color="#475569" />
          )}
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 2. BADGE DE RESILIÊNCIA / MODO SIMULAÇÃO                       */}
      {/* ============================================================== */}
      <View style={estilos.faixaModoSimulacao}>
        <Ionicons
          name={dados.isSimulado ? "information-circle-outline" : "checkmark-circle-outline"}
          size={14}
          color={dados.isSimulado ? "#D97706" : "#059669"}
          style={{ marginRight: 6 }}
        />
        <Text style={[estilos.textoModoSimulacao, { color: dados.isSimulado ? "#92400E" : "#065F46" }]}>
          {dados.isSimulado
            ? "⚠️ Modo Simulação: Dados offline em exibição (IMG-013)"
            : "✅ Dados sincronizados em tempo real com a API"}
        </Text>
      </View>

      {/* ============================================================== */}
      {/* 3. CONTEÚDO PRINCIPAL COM SCROLL                               */}
      {/* ============================================================== */}
      <ScrollView
        style={estilos.scrollArea}
        contentContainerStyle={[
          estilos.scrollContent,
          { paddingBottom: insets.bottom + 85 }, // Espaço para a Tab Bar fixa
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => carregarPainel(true)}
            colors={["#FF5A1F"]}
            tintColor="#FF5A1F"
          />
        }
      >
        {carregando ? (
          <View style={estilos.loadingContainer}>
            <ActivityIndicator size="large" color="#FF5A1F" />
            <Text style={estilos.loadingText}>Processando inteligência analítica...</Text>
          </View>
        ) : (
          <>
            {/* ============================================================== */}
            {/* CARD 1: AZUL MARINHO PROFUNDO ("SEUS RESULTADOS" / EVOLUÇÃO)   */}
            {/* ============================================================== */}
            <View style={estilos.cardResultadosNavy}>
              {/* Cabeçalho do Card */}
              <View style={estilos.cardNavyHeader}>
                <View>
                  <View style={estilos.linhaTagCard}>
                    <Text style={estilos.tituloSeusResultados}>Seus resultados</Text>
                    <View style={estilos.badgeCrescimento}>
                      <Ionicons name="trending-up" size={13} color="#10B981" style={{ marginRight: 3 }} />
                      <Text style={estilos.textoBadgeCrescimento}>+18,5%</Text>
                    </View>
                  </View>
                  <Text style={estilos.subtituloSeusResultados}>
                    Desempenho acumulado no mês de {dados.periodoReferencia.split("/")[0].trim()}
                  </Text>
                </View>

                {/* Alternador de Visibilidade do Saldo */}
                <TouchableOpacity
                  onPress={() => setOcultarValores(!ocultarValores)}
                  style={estilos.botaoOlho}
                  activeOpacity={0.8}
                  accessibilityLabel="Ocultar ou exibir valores"
                >
                  <Ionicons
                    name={ocultarValores ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>

              {/* GRÁFICO DE LINHA LUMINOSA SVG */}
              <View style={estilos.graficoContainer}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={estilos.svgLinha}>
                  <Defs>
                    {/* Gradiente da Linha */}
                    <LinearGradient id="linhaGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#FF7A3D" stopOpacity="1" />
                      <Stop offset="50%" stopColor="#FF5A1F" stopOpacity="1" />
                      <Stop offset="100%" stopColor="#FFA629" stopOpacity="1" />
                    </LinearGradient>
                    {/* Gradiente da Área Subjacente */}
                    <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.35" />
                      <Stop offset="100%" stopColor="#FF5A1F" stopOpacity="0.0" />
                    </LinearGradient>
                  </Defs>

                  {/* Linhas de grade sutis horizontais */}
                  <Path
                    d={`M ${paddingX} ${CHART_HEIGHT / 3} L ${CHART_WIDTH - paddingX} ${CHART_HEIGHT / 3}`}
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <Path
                    d={`M ${paddingX} ${(CHART_HEIGHT / 3) * 2} L ${CHART_WIDTH - paddingX} ${(CHART_HEIGHT / 3) * 2}`}
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />

                  {/* Área preenchida */}
                  <Path d={areaPath} fill="url(#areaGrad)" />

                  {/* Linha de dados */}
                  <Path
                    d={linePath}
                    fill="none"
                    stroke="url(#linhaGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Pontos Luminosos */}
                  {pontos.map((p, idx) => {
                    const isSelected = semanaSelecionada === idx;
                    return (
                      <G key={`point-${idx}`}>
                        {/* Glow externo */}
                        <Circle
                          cx={p.x}
                          cy={p.y}
                          r={isSelected ? 9 : 6}
                          fill="#FF5A1F"
                          opacity={isSelected ? 0.35 : 0.15}
                        />
                        {/* Ponto sólido */}
                        <Circle
                          cx={p.x}
                          cy={p.y}
                          r={isSelected ? 5 : 3.8}
                          fill="#FFFFFF"
                          stroke="#FF5A1F"
                          strokeWidth="2.5"
                        />
                      </G>
                    );
                  })}
                </Svg>

                {/* Etiquetas Semanais Abaixo do Gráfico */}
                <View style={estilos.linhaSemanas}>
                  {dados.graficoEvolucao.map((p, idx) => {
                    const isSelected = semanaSelecionada === idx;
                    return (
                      <TouchableOpacity
                        key={`label-${idx}`}
                        style={[estilos.itemSemanaChip, isSelected && estilos.itemSemanaChipAtivo]}
                        onPress={() => setSemanaSelecionada(idx)}
                        activeOpacity={0.7}
                      >
                        <Text style={[estilos.textoSemanaLabel, isSelected && estilos.textoSemanaLabelAtivo]}>
                          {p.label}
                        </Text>
                        <Text style={[estilos.textoSemanaValor, isSelected && estilos.textoSemanaValorAtivo]}>
                          {ocultarValores ? "•••" : `R$ ${p.valor}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Banner de detalhe da semana selecionada */}
                {semanaSelecionada !== null && (
                  <View style={estilos.bannerSemanaDetalhe}>
                    <Ionicons name="sparkles" size={13} color="#FFA629" style={{ marginRight: 6 }} />
                    <Text style={estilos.textoBannerSemana}>
                      <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
                        {dados.graficoEvolucao[semanaSelecionada].label}:{" "}
                      </Text>
                      {dados.graficoEvolucao[semanaSelecionada].aulas} aulas ministradas •{" "}
                      {formatarMoeda(dados.graficoEvolucao[semanaSelecionada].valor)} gerados
                    </Text>
                  </View>
                )}
              </View>

              {/* GRADE DE 4 MÉTRICAS 2x2 COM ÍCONES E VARIAÇÃO */}
              <View style={estilos.gridMetricasNavy}>
                {/* 1. Aulas */}
                <View style={estilos.cardMetricaNavy}>
                  <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "rgba(255, 90, 31, 0.15)" }]}>
                    <FontAwesome5 name="chalkboard-teacher" size={15} color="#FF7A3D" />
                  </View>
                  <Text style={estilos.labelMetricaNavy}>Aulas</Text>
                  <Text style={estilos.valorMetricaNavy}>{dados.metricas.aulasMinistradas}</Text>
                  <Text style={estilos.variacaoMetricaNavy}>{dados.metricas.variacaoAulas}</Text>
                </View>

                {/* 2. Horas */}
                <View style={estilos.cardMetricaNavy}>
                  <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "rgba(37, 99, 235, 0.15)" }]}>
                    <Feather name="clock" size={15} color="#60A5FA" />
                  </View>
                  <Text style={estilos.labelMetricaNavy}>Horas</Text>
                  <Text style={estilos.valorMetricaNavy}>{dados.metricas.horasDedicadas}h</Text>
                  <Text style={estilos.variacaoMetricaNavy}>{dados.metricas.variacaoHoras}</Text>
                </View>

                {/* 3. Alunos */}
                <View style={estilos.cardMetricaNavy}>
                  <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                    <Feather name="users" size={15} color="#34D399" />
                  </View>
                  <Text style={estilos.labelMetricaNavy}>Alunos</Text>
                  <Text style={estilos.valorMetricaNavy}>{dados.metricas.alunosAtendidos}</Text>
                  <Text style={estilos.variacaoMetricaNavy}>{dados.metricas.variacaoAlunos}</Text>
                </View>

                {/* 4. Ganhos */}
                <View style={estilos.cardMetricaNavy}>
                  <View style={[estilos.iconeMetricaWrapper, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                    <MaterialCommunityIcons name="currency-usd" size={17} color="#FBBF24" />
                  </View>
                  <Text style={estilos.labelMetricaNavy}>Ganhos</Text>
                  <Text style={[estilos.valorMetricaNavy, { color: "#34D399" }]}>
                    {formatarMoeda(dados.metricas.ganhosMes)}
                  </Text>
                  <Text style={[estilos.variacaoMetricaNavy, { color: "#34D399" }]}>
                    {dados.metricas.variacaoGanhos}
                  </Text>
                </View>
              </View>
            </View>

            {/* ============================================================== */}
            {/* ATALHO PRIORITÁRIO: SAQUE RÁPIDO & CARTEIRA ORIENTA (ORI-014)   */}
            {/* ============================================================== */}
            <View style={estilos.cardAtalhoSaque}>
              <View style={estilos.conteudoAtalhoSaque}>
                <View style={estilos.iconeSaqueCircle}>
                  <Ionicons name="wallet-outline" size={22} color="#FF5A1F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.tituloAtalhoSaque}>Saldo disponível para saque</Text>
                  <Text style={estilos.valorAtalhoSaque}>
                    {formatarMoeda(dados.metricas.saldoDisponivelSaque)}
                  </Text>
                  <Text style={estilos.pendenteAtalhoSaque}>
                    + {formatarMoeda(dados.metricas.saldoPendente)} em análise de compensação
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={estilos.botaoSacarAgora}
                onPress={() => router.push("/saque" as any)}
                activeOpacity={0.85}
                accessibilityLabel="Ir para tela de solicitação de saque"
              >
                <Text style={estilos.textoBotaoSacarAgora}>Solicitar Saque</Text>
                <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            {/* ============================================================== */}
            {/* CARD 2: GRÁFICO DONUT DE DISTRIBUIÇÃO DAS AULAS (IMG-013)      */}
            {/* ============================================================== */}
            <View style={estilos.cardSecao}>
              <View style={estilos.headerSecao}>
                <View>
                  <Text style={estilos.tituloSecao}>Distribuição das Aulas</Text>
                  <Text style={estilos.subtituloSecao}>Total de {dados.metricas.aulasMinistradas} aulas registradas</Text>
                </View>
                <View style={estilos.chipTotalAulas}>
                  <FontAwesome5 name="chart-pie" size={12} color="#FF5A1F" style={{ marginRight: 5 }} />
                  <Text style={estilos.textoChipTotalAulas}>Mês Atual</Text>
                </View>
              </View>

              <View style={estilos.rowDonutChart}>
                {/* SVG DONUT CHART */}
                <View style={estilos.donutWrapper}>
                  <Svg width={110} height={110} viewBox="0 0 110 110">
                    <G rotation="-90" origin="55, 55">
                      {/* Segmento 1: Aulas Pagas (Laranja) */}
                      <Circle
                        cx="55"
                        cy="55"
                        r={donutRadius}
                        stroke="#FF5A1F"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${pagasDash} ${donutCircumference}`}
                        strokeDashoffset={pagasOffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      {/* Segmento 2: Aulas Gratuitas (Azul) */}
                      <Circle
                        cx="55"
                        cy="55"
                        r={donutRadius}
                        stroke="#2563EB"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${gratisDash} ${donutCircumference}`}
                        strokeDashoffset={gratisOffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      {/* Segmento 3: Pendentes (Cinza) */}
                      <Circle
                        cx="55"
                        cy="55"
                        r={donutRadius}
                        stroke="#CBD5E1"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${pendentesDash} ${donutCircumference}`}
                        strokeDashoffset={pendentesOffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </G>
                    {/* Contador Central */}
                    <SvgText
                      x="55"
                      y="52"
                      textAnchor="middle"
                      fontSize="17"
                      fontWeight="bold"
                      fill="#0F172A"
                    >
                      {dados.metricas.aulasMinistradas}
                    </SvgText>
                    <SvgText
                      x="55"
                      y="67"
                      textAnchor="middle"
                      fontSize="10"
                      fill="#64748B"
                      fontWeight="500"
                    >
                      aulas
                    </SvgText>
                  </Svg>
                </View>

                {/* Legendas e Percentuais ao Lado */}
                <View style={estilos.legendasDonut}>
                  {dados.distribuicaoAulas.map((seg) => (
                    <View key={seg.id} style={estilos.itemLegendaDonut}>
                      <View style={[estilos.bulletLegenda, { backgroundColor: seg.cor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.labelLegenda}>{seg.label}</Text>
                        <Text style={estilos.subLegenda}>{seg.quantidade} mentorias</Text>
                      </View>
                      <View style={[estilos.badgePercentualDonut, { backgroundColor: `${seg.cor}15` }]}>
                        <Text style={[estilos.textoPercentualDonut, { color: seg.cor }]}>
                          {seg.percentual.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* ============================================================== */}
            {/* CARD 3: VOLUME POR DISCIPLINA (PROGRESS BARS HORIZONTAIS)      */}
            {/* ============================================================== */}
            <View style={estilos.cardSecao}>
              <View style={estilos.headerSecao}>
                <View>
                  <Text style={estilos.tituloSecao}>Volume por Disciplina</Text>
                  <Text style={estilos.subtituloSecao}>Rentabilidade e demanda de ensino</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/solicitacoes" as any)}
                  activeOpacity={0.7}
                  style={estilos.linkVerSolicitacoes}
                >
                  <Text style={estilos.textoLinkVerSolicitacoes}>Solicitações &gt;</Text>
                </TouchableOpacity>
              </View>

              <View style={estilos.listaBarrasDisciplina}>
                {dados.volumePorDisciplina.map((disc) => (
                  <View key={disc.id} style={estilos.itemBarraDisciplina}>
                    <View style={estilos.topoBarraDisciplina}>
                      <Text style={estilos.nomeDisciplina}>{disc.disciplina}</Text>
                      <View style={estilos.valoresDisciplina}>
                        <Text style={estilos.faturamentoDisciplina}>
                          {formatarMoeda(disc.faturamento)}
                        </Text>
                        <Text style={estilos.percentualDisciplina}>({disc.percentual}%)</Text>
                      </View>
                    </View>

                    {/* Barra de Progresso com Trilho */}
                    <View style={estilos.trilhoBarra}>
                      <View
                        style={[
                          estilos.preenchimentoBarra,
                          {
                            width: `${disc.percentual}%`,
                            backgroundColor: disc.cor,
                          },
                        ]}
                      />
                    </View>

                    <Text style={estilos.rodapeBarraDisciplina}>
                      {disc.aulas} aulas ministradas no período
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ============================================================== */}
            {/* CARD 4: EXTRATO E ATIVIDADE RECENTE COM FILTROS DE STATUS      */}
            {/* ============================================================== */}
            <View style={estilos.cardSecao}>
              <View style={estilos.headerSecao}>
                <View>
                  <Text style={estilos.tituloSecao}>Extrato &amp; Atividade Recente</Text>
                  <Text style={estilos.subtituloSecao}>Lançamentos e créditos recentes</Text>
                </View>
              </View>

              {/* CHIPS DE FILTRO DO EXTRATO */}
              <View style={estilos.rowFiltrosExtrato}>
                {(
                  [
                    { id: "TODAS", label: "Todas" },
                    { id: "PAGAS", label: "Recebidas" },
                    { id: "GRATUITAS", label: "Gratuitas" },
                    { id: "PENDENTES", label: "Em análise" },
                  ] as const
                ).map((filtro) => {
                  const isActive = filtroExtrato === filtro.id;
                  return (
                    <TouchableOpacity
                      key={filtro.id}
                      style={[estilos.chipFiltroExtrato, isActive && estilos.chipFiltroExtratoAtivo]}
                      onPress={() => setFiltroExtrato(filtro.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          estilos.textoChipFiltroExtrato,
                          isActive && estilos.textoChipFiltroExtratoAtivo,
                        ]}
                      >
                        {filtro.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* LISTAGEM DE TRANSAÇÕES */}
              <View style={estilos.listaTransacoes}>
                {extratoFiltrado.length === 0 ? (
                  <View style={estilos.emptyTransacoes}>
                    <Feather name="inbox" size={32} color="#CBD5E1" />
                    <Text style={estilos.emptyTransacoesTexto}>
                      Nenhum lançamento encontrado para este filtro.
                    </Text>
                  </View>
                ) : (
                  extratoFiltrado.map((item) => (
                    <View key={item.id} style={estilos.itemTransacao}>
                      <Image source={{ uri: item.alunoFoto }} style={estilos.avatarTransacao} />

                      <View style={{ flex: 1 }}>
                        <View style={estilos.topoItemTransacao}>
                          <Text style={estilos.nomeAlunoTransacao}>{item.alunoNome}</Text>
                          <Text
                            style={[
                              estilos.valorTransacao,
                              item.valor > 0 ? estilos.valorPositivo : estilos.valorNeutro,
                            ]}
                          >
                            {item.valor > 0 ? `+ ${formatarMoeda(item.valor)}` : "Gratuita"}
                          </Text>
                        </View>

                        <Text style={estilos.materiaTransacao}>{item.materia}</Text>
                        <Text style={estilos.descricaoTransacao}>{item.descricao}</Text>

                        <View style={estilos.rodapeItemTransacao}>
                          <View style={estilos.chipDataTransacao}>
                            <Feather name="clock" size={10} color="#64748B" style={{ marginRight: 3 }} />
                            <Text style={estilos.textoDataTransacao}>
                              {item.data}, {item.horario}
                            </Text>
                          </View>

                          <View
                            style={[
                              estilos.badgeStatusTransacao,
                              item.status === "RECEBIDA"
                                ? estilos.badgeRecebida
                                : item.status === "CONFIRMADA"
                                ? estilos.badgeConfirmada
                                : estilos.badgeAnalise,
                            ]}
                          >
                            <Text
                              style={[
                                estilos.textoStatusTransacao,
                                item.status === "RECEBIDA"
                                  ? estilos.textoRecebida
                                  : item.status === "CONFIRMADA"
                                  ? estilos.textoConfirmada
                                  : estilos.textoAnalise,
                              ]}
                            >
                              {item.status === "RECEBIDA"
                                ? "✔ Recebida"
                                : item.status === "CONFIRMADA"
                                ? "Confirmada"
                                : "Em análise"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* AÇÕES DE RODAPÉ AUXILIARES */}
            <View style={estilos.blocoBotoesAuxiliares}>
              <TouchableOpacity
                style={estilos.botaoSecundarioAulas}
                onPress={() => router.push("/solicitacoes" as any)}
                activeOpacity={0.8}
              >
                <Feather name="calendar" size={16} color="#FF5A1F" style={{ marginRight: 8 }} />
                <Text style={estilos.textoBotaoSecundarioAulas}>Gerenciar Solicitações de Aula</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* 5. BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS PROFESSOR - RN) */}
      {/* ============================================================== */}
      <View
        style={[
          estilos.tabBarContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/home-professor" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Home Professor"
        >
          <FontAwesome5 name="home" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/notificacoes" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Notícias"
        >
          <Feather name="bell" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Notícias</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/agenda" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Agenda"
        >
          <FontAwesome5 name="calendar-alt" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => {}}
          activeOpacity={0.8}
          accessibilityLabel="Aba Ganhos (Ativa)"
        >
          <FontAwesome5 name="chart-line" size={19} color="#FF5A1F" />
          <Text style={[estilos.tabLabel, estilos.tabLabelAtiva]}>Ganhos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/perfil?persona=professor" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Perfil"
        >
          <FontAwesome5 name="user-alt" size={19} color="#64748B" />
          <Text style={estilos.tabLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==============================================================
// ESTILOS E TOKENS DE DESIGN (DESIGN SYSTEM ORIENTA 2.0)
// ==============================================================
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  botaoVoltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitulo: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  botaoRefresh: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  faixaModoSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  textoModoSimulacao: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
  },

  // CARD AZUL MARINHO "SEUS RESULTADOS"
  cardResultadosNavy: {
    backgroundColor: "#0B1728",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  cardNavyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  linhaTagCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tituloSeusResultados: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  badgeCrescimento: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  textoBadgeCrescimento: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  subtituloSeusResultados: {
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 3,
  },
  botaoOlho: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  // GRÁFICO
  graficoContainer: {
    alignItems: "center",
    marginVertical: 4,
  },
  svgLinha: {
    overflow: "visible",
  },
  linhaSemanas: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  itemSemanaChip: {
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  itemSemanaChipAtivo: {
    backgroundColor: "rgba(255, 90, 31, 0.25)",
    borderWidth: 1,
    borderColor: "#FF5A1F",
  },
  textoSemanaLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  textoSemanaLabelAtivo: {
    color: "#FF7A3D",
    fontWeight: "700",
  },
  textoSemanaValor: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E2E8F0",
    marginTop: 2,
  },
  textoSemanaValorAtivo: {
    color: "#FFFFFF",
  },
  bannerSemanaDetalhe: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
    width: "100%",
  },
  textoBannerSemana: {
    fontSize: 11,
    color: "#CBD5E1",
  },

  // GRID 2x2 NAVY
  gridMetricasNavy: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  cardMetricaNavy: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  iconeMetricaWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  labelMetricaNavy: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  valorMetricaNavy: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  variacaoMetricaNavy: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
    fontWeight: "500",
  },

  // CARD ATALHO SAQUE
  cardAtalhoSaque: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    gap: 12,
  },
  conteudoAtalhoSaque: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconeSaqueCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
  },
  tituloAtalhoSaque: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  valorAtalhoSaque: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  pendenteAtalhoSaque: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  botaoSacarAgora: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5A1F",
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: "#FF5A1F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  textoBotaoSacarAgora: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // CARDS DE SEÇÃO COMUNS
  cardSecao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerSecao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  tituloSecao: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtituloSecao: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  chipTotalAulas: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  textoChipTotalAulas: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // DONUT ROW
  rowDonutChart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  donutWrapper: {
    width: 110,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
  },
  legendasDonut: {
    flex: 1,
    gap: 10,
  },
  itemLegendaDonut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulletLegenda: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  labelLegenda: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  subLegenda: {
    fontSize: 10,
    color: "#64748B",
  },
  badgePercentualDonut: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  textoPercentualDonut: {
    fontSize: 11,
    fontWeight: "700",
  },

  // VOLUME POR DISCIPLINA
  linkVerSolicitacoes: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  textoLinkVerSolicitacoes: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  listaBarrasDisciplina: {
    gap: 14,
  },
  itemBarraDisciplina: {
    gap: 5,
  },
  topoBarraDisciplina: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nomeDisciplina: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  valoresDisciplina: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  faturamentoDisciplina: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  percentualDisciplina: {
    fontSize: 11,
    color: "#64748B",
  },
  trilhoBarra: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  preenchimentoBarra: {
    height: "100%",
    borderRadius: 4,
  },
  rodapeBarraDisciplina: {
    fontSize: 10,
    color: "#94A3B8",
  },

  // EXTRATO
  rowFiltrosExtrato: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  chipFiltroExtrato: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipFiltroExtratoAtivo: {
    backgroundColor: "#FF5A1F",
    borderColor: "#FF5A1F",
  },
  textoChipFiltroExtrato: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  textoChipFiltroExtratoAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listaTransacoes: {
    gap: 12,
  },
  emptyTransacoes: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyTransacoesTexto: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  itemTransacao: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatarTransacao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  topoItemTransacao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nomeAlunoTransacao: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  valorTransacao: {
    fontSize: 13,
    fontWeight: "800",
  },
  valorPositivo: {
    color: "#059669",
  },
  valorNeutro: {
    color: "#64748B",
  },
  materiaTransacao: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#FF5A1F",
    marginTop: 1,
  },
  descricaoTransacao: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  rodapeItemTransacao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  chipDataTransacao: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoDataTransacao: {
    fontSize: 10.5,
    color: "#64748B",
  },
  badgeStatusTransacao: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeRecebida: {
    backgroundColor: "#ECFDF5",
  },
  badgeConfirmada: {
    backgroundColor: "#EFF6FF",
  },
  badgeAnalise: {
    backgroundColor: "#FEF3C7",
  },
  textoStatusTransacao: {
    fontSize: 10,
    fontWeight: "700",
  },
  textoRecebida: {
    color: "#047857",
  },
  textoConfirmada: {
    color: "#1D4ED8",
  },
  textoAnalise: {
    color: "#B45309",
  },

  // BOTÕES AUXILIARES
  blocoBotoesAuxiliares: {
    marginTop: 4,
    marginBottom: 8,
  },
  botaoSecundarioAulas: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFD3B6",
    paddingVertical: 12,
    borderRadius: 14,
  },
  textoBotaoSecundarioAulas: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // TAB BAR DOCKADA
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 3,
  },
  tabLabelAtiva: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
});
