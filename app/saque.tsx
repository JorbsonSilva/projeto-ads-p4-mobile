/**
 * @file saque.tsx
 * @description Tela de Carteira e Solicitação de Saque do Professor - Orienta 2.0 [ORI-014].
 * Implementada com total fidelidade à especificação visual Tela de Solicitação de Saque do Professor.jpeg (IMG-010).
 * 
 * Funcionalidades:
 * - Header com botão voltar, título centralizado e link "❓ Como funciona?" com modal de regras
 * - Card azul marinho de saldo disponível com alternador de visibilidade (olho) e valor pendente
 * - Card comparativo de resumo financeiro (ganhos do mês, saques realizados, total recebido e link de extrato)
 * - Passo 1: Escolha do valor do saque com chips rápidos (R$ 50, R$ 100, R$ 250, R$ 500 e botão destaque "Sacar tudo")
 * - Passo 2: Escolha da forma de recebimento (Pix Recomendado, Transferência bancária, Conta Orienta Carteira)
 * - Box informativo sobre horário limite de processamento (17h)
 * - Passo 3: Revisão discriminada com valor solicitado, forma de recebimento, taxa da plataforma e valor líquido a receber
 * - Sticky Action Footer com botão degradê laranja "Solicitar saque"
 * - Modal de comprovante de transferência com protocolo e novo saldo
 * - Serviço híbrido resiliente saqueService.ts com fallback offline e badge de modo de simulação
 */

import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  MetodoRecebimento,
  obterResumoSaqueProfessor,
  ResultadoResumoFinanceiro,
  ResumoFinanceiroProfessor,
  SolicitacaoSaqueResponse,
  solicitarSaqueProfessor,
} from "../services/saqueService";

const RESUMO_SAQUE_INICIAL: ResumoFinanceiroProfessor = {
  saldoDisponivel: 0,
  valorPendente: 0,
  ganhosMes: 0,
  saquesRealizados: 0,
  totalRecebido: 0,
  chavePixPadrao: "",
  tipoChavePix: "CPF",
  bancoPadrao: {
    banco: "",
    agencia: "",
    conta: "",
  },
};

export default function SaqueScreen() {
  const insets = useSafeAreaInsets();

  const [carregando, setCarregando] = useState<boolean>(true);
  const [isSimulado, setIsSimulado] = useState<boolean>(false);
  const [resumo, setResumo] = useState<ResumoFinanceiroProfessor>(RESUMO_SAQUE_INICIAL);

  // Estados Interativos
  const [saldoVisivel, setSaldoVisivel] = useState<boolean>(true);
  const [valorSaque, setValorSaque] = useState<number>(2480.0);
  const [valorInputTexto, setValorInputTexto] = useState<string>("2480,00");
  const [metodoSelecionado, setMetodoSelecionado] = useState<MetodoRecebimento>("PIX");
  const [chavePixEditada, setChavePixEditada] = useState<string>("prof.lucas@orienta.com.br");

  // Modais de Apoio
  const [modalComoFunciona, setModalComoFunciona] = useState<boolean>(false);
  const [modalComprovante, setModalComprovante] = useState<boolean>(false);
  const [comprovanteDados, setComprovanteDados] = useState<SolicitacaoSaqueResponse | null>(null);
  const [solicitando, setSolicitando] = useState<boolean>(false);

  const carregarDadosFinanceiros = useCallback(async () => {
    try {
      const res: ResultadoResumoFinanceiro = await obterResumoSaqueProfessor(101);
      setResumo(res.resumo);
      setIsSimulado(res.isSimulado);
      setChavePixEditada(res.resumo.chavePixPadrao);
    } catch {
      setIsSimulado(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosFinanceiros();
  }, [carregarDadosFinanceiros]);

  const handleDefinirValor = (val: number) => {
    const valorAjustado = Math.min(val, resumo.saldoDisponivel);
    setValorSaque(valorAjustado);
    setValorInputTexto(valorAjustado.toFixed(2).replace(".", ","));
  };

  const handleInputChange = (texto: string) => {
    // Permite digitação livre de números e vírgula
    const limpo = texto.replace(/[^0-9,]/g, "");
    setValorInputTexto(limpo);
    const num = parseFloat(limpo.replace(",", "."));
    if (!isNaN(num)) {
      setValorSaque(num);
    } else {
      setValorSaque(0);
    }
  };

  const taxaPlataforma = 0.0;
  const valorLiquidoReceber = Math.max(0, valorSaque - taxaPlataforma);
  const valorMinimo = 50.0;
  const valorInvalido = valorSaque < valorMinimo || valorSaque > resumo.saldoDisponivel;

  const handleSolicitarSaque = async () => {
    if (valorInvalido) {
      if (valorSaque < valorMinimo) {
        Alert.alert("Atenção", `O valor mínimo para saque é de R$ ${valorMinimo.toFixed(2).replace(".", ",")}.`);
      } else {
        Alert.alert("Atenção", "O valor solicitado ultrapassa seu saldo disponível para saque.");
      }
      return;
    }

    setSolicitando(true);
    try {
      const res = await solicitarSaqueProfessor({
        professorId: 101,
        valor: valorSaque,
        metodo: metodoSelecionado,
        chavePix: chavePixEditada,
      });

      setComprovanteDados(res.resultado);
      setModalComprovante(true);
      // Atualiza saldo localmente
      setResumo((prev) => ({
        ...prev,
        saldoDisponivel: res.resultado.novoSaldoDisponivel,
      }));
    } catch {
      Alert.alert("Erro", "Não foi possível concluir a solicitação de saque no momento.");
    } finally {
      setSolicitando(false);
    }
  };

  if (carregando) {
    return (
      <View style={[estilos.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF5A1F" />
        <Text style={estilos.loadingTexto}>Carregando dados da sua carteira...</Text>
      </View>
    );
  }

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 0. BANNER DISCRETO DE SIMULAÇÃO OFFLINE                        */}
      {/* ============================================================== */}
      {isSimulado && (
        <View style={estilos.bannerSimulacao}>
          <Ionicons name="information-circle" size={14} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={estilos.textoBannerSimulacao}>
            ⚠️ Modo Simulação: Dados offline em exibição
          </Text>
        </View>
      )}

      {/* ============================================================== */}
      {/* 1. HEADER SUPERIOR COM TÍTULO E AJUDA                          */}
      {/* ============================================================== */}
      <View style={estilos.header}>
        <TouchableOpacity
          style={estilos.botaoVoltar}
          onPress={() => router.push("/painel-ganhos" as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>

        <Text style={estilos.headerTitulo}>Saque</Text>

        <TouchableOpacity
          style={estilos.botaoComoFunciona}
          onPress={() => setModalComoFunciona(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={16} color="#FF5A1F" style={{ marginRight: 4 }} />
          <Text style={estilos.textoComoFunciona}>Como funciona?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[estilos.scrollContent, { paddingBottom: 110 }]}
      >
        {/* ============================================================== */}
        {/* 2. CARDS SUPERIORES DE RESUMO FINANCEIRO (2 BLOCOS)            */}
        {/* ============================================================== */}
        <View style={estilos.cardsSuperioresRow}>
          {/* Card Principal: Saldo Disponível (Azul Escuro) */}
          <View style={estilos.cardSaldoDisponivel}>
            <View style={estilos.cardSaldoCabecalho}>
              <Text style={estilos.labelSaldoDisponivel}>Seu saldo disponível para saque</Text>
              <TouchableOpacity
                onPress={() => setSaldoVisivel(!saldoVisivel)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={saldoVisivel ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            <Text style={estilos.valorSaldoPrincipal}>
              {saldoVisivel
                ? `R$ ${resumo.saldoDisponivel.toFixed(2).replace(".", ",")}`
                : "R$ •••••••"}
            </Text>

            <View style={estilos.divisorCardSaldo} />

            <View style={estilos.saldoPendenteLinha}>
              <Text style={estilos.labelSaldoPendente}>
                Valor pendente{" "}
                <Ionicons name="help-circle-outline" size={12} color="#64748B" />
              </Text>
              <Text style={estilos.valorSaldoPendente}>
                {saldoVisivel
                  ? `R$ ${resumo.valorPendente.toFixed(2).replace(".", ",")}`
                  : "••••"}
              </Text>
            </View>
          </View>

          {/* Card Secundário: Resumo Financeiro (Ganhos / Saques) */}
          <View style={estilos.cardResumoFinanceiro}>
            <View style={estilos.cardResumoCabecalho}>
              <Ionicons name="wallet-outline" size={18} color="#FF5A1F" style={{ marginRight: 6 }} />
              <Text style={estilos.tituloResumoFinanceiro}>Resumo financeiro</Text>
            </View>

            <View style={estilos.linhaMetricaFinanceira}>
              <Text style={estilos.metricaLabel}>Ganhos do mês:</Text>
              <Text style={estilos.metricaValorVerde}>
                R$ {resumo.ganhosMes.toFixed(2).replace(".", ",")}
              </Text>
            </View>

            <View style={estilos.linhaMetricaFinanceira}>
              <Text style={estilos.metricaLabel}>Saques realizados:</Text>
              <Text style={estilos.metricaValor}>
                R$ {resumo.saquesRealizados.toFixed(2).replace(".", ",")}
              </Text>
            </View>

            <View style={estilos.linhaMetricaFinanceira}>
              <Text style={estilos.metricaLabel}>Total recebido:</Text>
              <Text style={estilos.metricaValor}>
                R$ {resumo.totalRecebido.toFixed(2).replace(".", ",")}
              </Text>
            </View>

            <TouchableOpacity
              style={estilos.linkVerExtrato}
              onPress={() => router.push("/painel-ganhos" as any)}
              activeOpacity={0.7}
            >
              <Text style={estilos.textoLinkVerExtrato}>Ver extrato completo →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 3. PASSO 1 — ESCOLHA O VALOR DO SAQUE                           */}
        {/* ============================================================== */}
        <View style={estilos.secaoPassoContainer}>
          <View style={estilos.passoHeaderLinha}>
            <View style={estilos.passoBadge}>
              <Text style={estilos.passoBadgeTexto}>1</Text>
            </View>
            <View>
              <Text style={estilos.passoTitulo}>Escolha o valor do saque</Text>
              <Text style={estilos.passoSubtitulo}>
                Valor disponível:{" "}
                <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                  R$ {resumo.saldoDisponivel.toFixed(2).replace(".", ",")}
                </Text>
              </Text>
            </View>
          </View>

          {/* Campo de Input Monetário */}
          <View
            style={[
              estilos.inputMonetarioContainer,
              valorInvalido && estilos.inputMonetarioErro,
            ]}
          >
            <Text style={estilos.prefixoMoeda}>R$</Text>
            <TextInput
              style={estilos.inputValorNumerico}
              keyboardType="numeric"
              value={valorInputTexto}
              onChangeText={handleInputChange}
              placeholder="0,00"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={estilos.legendaMinimoLinha}>
            <Text
              style={[
                estilos.textoMinimoSaque,
                valorInvalido && { color: "#EF4444" },
              ]}
            >
              {valorSaque > resumo.saldoDisponivel
                ? "Valor excede o saldo disponível para saque."
                : `Mínimo de saque: R$ ${valorMinimo.toFixed(2).replace(".", ",")}`}
            </Text>
          </View>

          {/* Chips Rápidos de Valor */}
          <View style={estilos.chipsValoresGrid}>
            {[50, 100, 250, 500].map((v) => {
              const selecionado = valorSaque === v;
              return (
                <TouchableOpacity
                  key={`chip-val-${v}`}
                  style={[
                    estilos.chipValorBotao,
                    selecionado && estilos.chipValorBotaoAtivo,
                  ]}
                  onPress={() => handleDefinirValor(v)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      estilos.textoChipValor,
                      selecionado && estilos.textoChipValorAtivo,
                    ]}
                  >
                    R$ {v}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Botão Destaque: Sacar Tudo */}
            <TouchableOpacity
              style={estilos.botaoSacarTudo}
              onPress={() => handleDefinirValor(resumo.saldoDisponivel)}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={13} color="#FF5A1F" style={{ marginRight: 4 }} />
              <Text style={estilos.textoBotaoSacarTudo}>
                Sacar tudo R$ {resumo.saldoDisponivel.toFixed(2).replace(".", ",")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 4. PASSO 2 — ESCOLHA A FORMA DE RECEBIMENTO                    */}
        {/* ============================================================== */}
        <View style={estilos.secaoPassoContainer}>
          <View style={estilos.passoHeaderLinha}>
            <View style={estilos.passoBadge}>
              <Text style={estilos.passoBadgeTexto}>2</Text>
            </View>
            <View>
              <Text style={estilos.passoTitulo}>Escolha a forma de recebimento</Text>
              <Text style={estilos.passoSubtitulo}>
                Transferências instantâneas e sem tarifas bancárias
              </Text>
            </View>
          </View>

          <View style={estilos.listaMetodosRecebimento}>
            {/* Opção 1: PIX (Recomendado) */}
            <TouchableOpacity
              style={[
                estilos.cardMetodoRadio,
                metodoSelecionado === "PIX" && estilos.cardMetodoRadioSelecionado,
              ]}
              onPress={() => setMetodoSelecionado("PIX")}
              activeOpacity={0.85}
            >
              <View style={estilos.metodoRadioCorpo}>
                <View
                  style={[
                    estilos.circuloRadio,
                    metodoSelecionado === "PIX" && estilos.circuloRadioAtivo,
                  ]}
                >
                  {metodoSelecionado === "PIX" && <View style={estilos.dotRadio} />}
                </View>

                <View style={estilos.iconeMetodoWrapperVerde}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color="#10B981" />
                </View>

                <View style={estilos.metodoTextoColuna}>
                  <View style={estilos.metodoNomeLinha}>
                    <Text style={estilos.metodoNomeTexto}>Pix</Text>
                    <View style={estilos.tagRecomendado}>
                      <Text style={estilos.textoTagRecomendado}>Recomendado</Text>
                    </View>
                  </View>
                  <Text style={estilos.metodoDescricaoTexto}>
                    Receba na hora, todos os dias
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>

              {metodoSelecionado === "PIX" && (
                <View style={estilos.boxChavePix}>
                  <Text style={estilos.labelChavePix}>Chave Pix cadastrada:</Text>
                  <TextInput
                    style={estilos.inputChavePix}
                    value={chavePixEditada}
                    onChangeText={setChavePixEditada}
                    placeholder="Digite sua chave Pix"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Opção 2: Transferência Bancária */}
            <TouchableOpacity
              style={[
                estilos.cardMetodoRadio,
                metodoSelecionado === "TED" && estilos.cardMetodoRadioSelecionado,
              ]}
              onPress={() => setMetodoSelecionado("TED")}
              activeOpacity={0.85}
            >
              <View style={estilos.metodoRadioCorpo}>
                <View
                  style={[
                    estilos.circuloRadio,
                    metodoSelecionado === "TED" && estilos.circuloRadioAtivo,
                  ]}
                >
                  {metodoSelecionado === "TED" && <View style={estilos.dotRadio} />}
                </View>

                <View style={estilos.iconeMetodoWrapperRoxo}>
                  <FontAwesome5 name="university" size={16} color="#8B5CF6" />
                </View>

                <View style={estilos.metodoTextoColuna}>
                  <Text style={estilos.metodoNomeTexto}>Transferência bancária</Text>
                  <Text style={estilos.metodoDescricaoTexto}>Receba em 1 dia útil</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            {/* Opção 3: Conta Orienta (Carteira) */}
            <TouchableOpacity
              style={[
                estilos.cardMetodoRadio,
                metodoSelecionado === "CARTEIRA" && estilos.cardMetodoRadioSelecionado,
              ]}
              onPress={() => setMetodoSelecionado("CARTEIRA")}
              activeOpacity={0.85}
            >
              <View style={estilos.metodoRadioCorpo}>
                <View
                  style={[
                    estilos.circuloRadio,
                    metodoSelecionado === "CARTEIRA" && estilos.circuloRadioAtivo,
                  ]}
                >
                  {metodoSelecionado === "CARTEIRA" && <View style={estilos.dotRadio} />}
                </View>

                <View style={estilos.iconeMetodoWrapperAzul}>
                  <Ionicons name="wallet-outline" size={18} color="#0284C7" />
                </View>

                <View style={estilos.metodoTextoColuna}>
                  <Text style={estilos.metodoNomeTexto}>Conta Orienta (Carteira)</Text>
                  <Text style={estilos.metodoDescricaoTexto}>
                    Disponível na hora para usar na plataforma
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Box Informativo das 17h */}
          <View style={estilos.boxInformativoHorario}>
            <Ionicons name="information-circle" size={18} color="#0284C7" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={estilos.textoInformativoHorario}>
              <Text style={{ fontWeight: "700" }}>Importante:</Text> Saques realizados até às 17h serão processados no mesmo dia útil. Após esse horário, a liquidação ocorrerá no próximo dia útil.
            </Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 5. PASSO 3 — REVISE AS INFORMAÇÕES                             */}
        {/* ============================================================== */}
        <View style={estilos.secaoPassoContainer}>
          <View style={estilos.passoHeaderLinha}>
            <View style={estilos.passoBadge}>
              <Text style={estilos.passoBadgeTexto}>3</Text>
            </View>
            <View>
              <Text style={estilos.passoTitulo}>Revise as informações</Text>
              <Text style={estilos.passoSubtitulo}>
                Confira o extrato do seu repasse antes de confirmar
              </Text>
            </View>
          </View>

          {/* Grid de 4 Itens Discriminados */}
          <View style={estilos.cardRevisaoBox}>
            <View style={estilos.itemRevisaoLinha}>
              <Text style={estilos.itemRevisaoLabel}>Valor do saque:</Text>
              <Text style={estilos.itemRevisaoValor}>
                R$ {valorSaque.toFixed(2).replace(".", ",")}
              </Text>
            </View>

            <View style={estilos.itemRevisaoLinha}>
              <Text style={estilos.itemRevisaoLabel}>Forma de recebimento:</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name={metodoSelecionado === "PIX" ? "lightning-bolt" : "wallet"}
                  size={14}
                  color={metodoSelecionado === "PIX" ? "#10B981" : "#0284C7"}
                  style={{ marginRight: 4 }}
                />
                <Text style={estilos.itemRevisaoValor}>
                  {metodoSelecionado === "PIX"
                    ? "Pix (Instantâneo)"
                    : metodoSelecionado === "TED"
                      ? "TED Bancário"
                      : "Carteira Orienta"}
                </Text>
              </View>
            </View>

            <View style={estilos.itemRevisaoLinha}>
              <Text style={estilos.itemRevisaoLabel}>Taxa da plataforma:</Text>
              <Text style={[estilos.itemRevisaoValor, { color: "#10B981" }]}>
                R$ 0,00 (Gratuito)
              </Text>
            </View>

            <View style={estilos.divisorRevisao} />

            <View style={estilos.itemRevisaoTotalLinha}>
              <Text style={estilos.itemRevisaoTotalLabel}>Você receberá:</Text>
              <Text style={estilos.itemRevisaoTotalValor}>
                R$ {valorLiquidoReceber.toFixed(2).replace(".", ",")}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ============================================================== */}
      {/* 6. STICKY ACTION FOOTER                                        */}
      {/* ============================================================== */}
      <View style={[estilos.footerSticky, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[
            estilos.botaoSolicitarSaque,
            valorInvalido && estilos.botaoSolicitarDesativado,
          ]}
          onPress={handleSolicitarSaque}
          disabled={valorInvalido || solicitando}
          activeOpacity={0.85}
        >
          {solicitando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <Feather name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={estilos.textoBotaoSolicitar}>
                Solicitar saque • R$ {valorLiquidoReceber.toFixed(2).replace(".", ",")}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 7. MODAL "COMO FUNCIONA O SAQUE?"                              */}
      {/* ============================================================== */}
      <Modal visible={modalComoFunciona} transparent animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardGenerico}>
            <View style={estilos.modalCardHeader}>
              <Ionicons name="information-circle" size={24} color="#FF5A1F" />
              <Text style={estilos.modalCardTitulo}>Como funciona o saque?</Text>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <Text style={estilos.modalRegraItem}>
                <Text style={{ fontWeight: "700" }}>1. Sem taxas para Pix:</Text> O Orienta não cobra nenhuma taxa de repasse em transferências Pix para professores cadastrados.
              </Text>
              <Text style={estilos.modalRegraItem}>
                <Text style={{ fontWeight: "700" }}>2. Prazos de Compensação:</Text> Solicitações via Pix solicitadas até às 17h caem em até 15 minutos. Solicitações noturnas ou via TED podem levar até 1 dia útil.
              </Text>
              <Text style={estilos.modalRegraItem}>
                <Text style={{ fontWeight: "700" }}>3. Valor Mínimo:</Text> O valor mínimo para emissão de ordem de transferência bancária é de R$ 50,00.
              </Text>
              <Text style={estilos.modalRegraItem}>
                <Text style={{ fontWeight: "700" }}>4. Segurança e Auditoria:</Text> Todos os repasses são rastreados com protocolo seguro em conformidade com o Banco Central.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={estilos.botaoFecharModal}
              onPress={() => setModalComoFunciona(false)}
              activeOpacity={0.8}
            >
              <Text style={estilos.textoBotaoFecharModal}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 8. MODAL DE RECIBO / COMPROVANTE DE SAQUE                      */}
      {/* ============================================================== */}
      <Modal visible={modalComprovante} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardComprovante}>
            <View style={estilos.iconeSucessoComprovante}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>

            <Text style={estilos.tituloSucessoComprovante}>Solicitação Confirmada!</Text>
            <Text style={estilos.subtituloSucessoComprovante}>
              Seu pedido de repasse foi enviado para processamento com sucesso.
            </Text>

            {comprovanteDados && (
              <View style={estilos.tabelaComprovante}>
                <View style={estilos.linhaTabelaComprovante}>
                  <Text style={estilos.labelTabela}>Protocolo:</Text>
                  <Text style={estilos.valorTabelaDestaque}>{comprovanteDados.protocolo}</Text>
                </View>

                <View style={estilos.linhaTabelaComprovante}>
                  <Text style={estilos.labelTabela}>Valor Solicitado:</Text>
                  <Text style={estilos.valorTabela}>
                    R$ {comprovanteDados.valorSolicitado.toFixed(2).replace(".", ",")}
                  </Text>
                </View>

                <View style={estilos.linhaTabelaComprovante}>
                  <Text style={estilos.labelTabela}>Forma de Envio:</Text>
                  <Text style={estilos.valorTabela}>{comprovanteDados.metodo}</Text>
                </View>

                <View style={estilos.linhaTabelaComprovante}>
                  <Text style={estilos.labelTabela}>Destino:</Text>
                  <Text style={estilos.valorTabela} numberOfLines={1}>
                    {comprovanteDados.destino}
                  </Text>
                </View>

                <View style={estilos.linhaTabelaComprovante}>
                  <Text style={estilos.labelTabela}>Previsão:</Text>
                  <Text style={estilos.valorTabelaVerde}>{comprovanteDados.previsaoLiberacao}</Text>
                </View>

                <View style={estilos.divisorComprovante} />

                <View style={estilos.linhaTabelaComprovante}>
                  <Text style={estilos.labelTabela}>Novo Saldo Disponível:</Text>
                  <Text style={estilos.valorTabelaLaranja}>
                    R$ {comprovanteDados.novoSaldoDisponivel.toFixed(2).replace(".", ",")}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={estilos.botaoConcluirComprovante}
              onPress={() => {
                setModalComprovante(false);
                router.push("/painel-ganhos" as any);
              }}
              activeOpacity={0.85}
            >
              <Text style={estilos.textoBotaoConcluirComprovante}>Voltar para o Painel de Ganhos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingTexto: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  bannerSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  textoBannerSimulacao: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },

  // 1. Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  botaoVoltar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  botaoComoFunciona: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  textoComoFunciona: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF5A1F",
  },

  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // 2. Cards Superiores (Resumo Financeiro)
  cardsSuperioresRow: {
    flexDirection: "column",
    gap: 12,
  },
  cardSaldoDisponivel: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardSaldoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  labelSaldoDisponivel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  valorSaldoPrincipal: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  divisorCardSaldo: {
    height: 1,
    backgroundColor: "#1E293B",
    marginVertical: 12,
  },
  saldoPendenteLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelSaldoPendente: {
    fontSize: 12,
    color: "#94A3B8",
  },
  valorSaldoPendente: {
    fontSize: 13,
    fontWeight: "600",
    color: "#CBD5E1",
  },

  cardResumoFinanceiro: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardResumoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tituloResumoFinanceiro: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  linhaMetricaFinanceira: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  metricaLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  metricaValor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  metricaValorVerde: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  linkVerExtrato: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "flex-end",
  },
  textoLinkVerExtrato: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // Seção de Passos (1, 2, 3)
  secaoPassoContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  passoHeaderLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  passoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF5A1F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  passoBadgeTexto: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  passoTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  passoSubtitulo: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },

  // Passo 1: Input e Chips
  inputMonetarioContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 6,
  },
  inputMonetarioErro: {
    borderColor: "#EF4444",
  },
  prefixoMoeda: {
    fontSize: 20,
    fontWeight: "700",
    color: "#64748B",
    marginRight: 8,
  },
  inputValorNumerico: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    paddingVertical: 6,
  },
  legendaMinimoLinha: {
    marginTop: 6,
    marginBottom: 12,
  },
  textoMinimoSaque: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  chipsValoresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipValorBotao: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipValorBotaoAtivo: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  textoChipValor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  textoChipValorAtivo: {
    color: "#FFFFFF",
  },
  botaoSacarTudo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FF5A1F",
  },
  textoBotaoSacarTudo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // Passo 2: Métodos de Recebimento
  listaMetodosRecebimento: {
    gap: 10,
    marginTop: 6,
  },
  cardMetodoRadio: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  cardMetodoRadioSelecionado: {
    borderColor: "#FF5A1F",
    backgroundColor: "#FFFDFB",
  },
  metodoRadioCorpo: {
    flexDirection: "row",
    alignItems: "center",
  },
  circuloRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  circuloRadioAtivo: {
    borderColor: "#FF5A1F",
  },
  dotRadio: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5A1F",
  },
  iconeMetodoWrapperVerde: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconeMetodoWrapperRoxo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconeMetodoWrapperAzul: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  metodoTextoColuna: {
    flex: 1,
  },
  metodoNomeLinha: {
    flexDirection: "row",
    alignItems: "center",
  },
  metodoNomeTexto: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  tagRecomendado: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  textoTagRecomendado: {
    fontSize: 10,
    fontWeight: "700",
    color: "#065F46",
  },
  metodoDescricaoTexto: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  boxChavePix: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  labelChavePix: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  inputChavePix: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: "#0F172A",
  },
  boxInformativoHorario: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  textoInformativoHorario: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 18,
  },

  // Passo 3: Revisão
  cardRevisaoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemRevisaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  itemRevisaoLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  itemRevisaoValor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  divisorRevisao: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  itemRevisaoTotalLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  itemRevisaoTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  itemRevisaoTotalValor: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF5A1F",
  },

  // 6. Sticky Footer
  footerSticky: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 10,
  },
  botaoSolicitarSaque: {
    backgroundColor: "#FF5A1F",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoSolicitarDesativado: {
    backgroundColor: "#CBD5E1",
  },
  textoBotaoSolicitar: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCardGenerico: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  modalCardTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalRegraItem: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 10,
  },
  botaoFecharModal: {
    marginTop: 12,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  textoBotaoFecharModal: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Modal Comprovante
  modalCardComprovante: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  iconeSucessoComprovante: {
    marginBottom: 12,
  },
  tituloSucessoComprovante: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  subtituloSucessoComprovante: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  tabelaComprovante: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
  },
  linhaTabelaComprovante: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  labelTabela: {
    fontSize: 12,
    color: "#64748B",
  },
  valorTabela: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  valorTabelaDestaque: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284C7",
  },
  valorTabelaVerde: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  valorTabelaLaranja: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF5A1F",
  },
  divisorComprovante: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  botaoConcluirComprovante: {
    width: "100%",
    backgroundColor: "#FF5A1F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  textoBotaoConcluirComprovante: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
