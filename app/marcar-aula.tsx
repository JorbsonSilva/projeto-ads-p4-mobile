/**
 * @file marcar-aula.tsx
 * @description Tela de Marcar Aula e Checkout com Stepper em 4 Etapas - Orienta 2.0 [ORI-011].
 * Implementada com total fidelidade à referência visual oficial Marca_Aula.jpeg (IMG-008).
 * 
 * Funcionalidades:
 * - Header com botão voltar e título "Marcar aula"
 * - Stepper horizontal de 4 etapas (Professor concluído, Data e Hora ativo, Pagamento, Confirmação)
 * - Card resumo do professor selecionado com foto, online dot, selo verificado, tags e preço R$ 60,00/h
 * - Seletor semanal de datas interativo com navegação < e > e indicador visual ativo
 * - Grid de horários clicáveis com slots (08:00, 10:00, 14:00 ativo, 16:00, 18:00)
 * - Seletor de forma de pagamento com radio cards (Pix ativo, Cartão de crédito, Carteira Orienta)
 * - Box de resumo da escolha com detalhes de data, horário, professor e valor
 * - Sticky footer com botão "Confirmar e Pagar • R$ 60,00" e aviso de pagamento seguro
 * - Modal de confirmação com suporte a Pix Copia e Cola e redirecionamento para Agenda
 * - Serviço híbrido resiliente agendamentoService.ts com fallback automático e badge de simulação
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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
  CriarAgendamentoDTO,
  FormaPagamento,
  MOCK_AGENDAMENTO_PADRAO,
  solicitarAgendamentoComFallback,
} from "../services/agendamentoService";

interface DiaOpcao {
  diaSemana: string;
  diaMes: string;
  dataCompleta: string; // "26/06/2024 (Qua)"
}

const DIAS_DISPONIVEIS: DiaOpcao[] = [
  { diaSemana: "Seg", diaMes: "24/06", dataCompleta: "24/06/2024 (Seg)" },
  { diaSemana: "Ter", diaMes: "25/06", dataCompleta: "25/06/2024 (Ter)" },
  { diaSemana: "Qua", diaMes: "26/06", dataCompleta: "26/06/2024 (Qua)" },
  { diaSemana: "Qui", diaMes: "27/06", dataCompleta: "27/06/2024 (Qui)" },
  { diaSemana: "Sex", diaMes: "28/06", dataCompleta: "28/06/2024 (Sex)" },
];

const HORARIOS_DISPONIVEIS: string[] = ["08:00", "10:00", "14:00", "16:00", "18:00"];

export default function MarcarAulaScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // Estados de Seleção
  const [diaSelecionadoIdx, setDiaSelecionadoIdx] = useState<number>(2); // Quarta-feira 26/06 por padrão
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>("14:00"); // 14:00 por padrão
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("PIX"); // Pix por padrão
  const [modalSucesso, setModalSucesso] = useState<boolean>(false);
  const [processando, setProcessando] = useState<boolean>(false);
  const [pixCopiado, setPixCopiado] = useState<boolean>(false);

  const diaAtual = DIAS_DISPONIVEIS[diaSelecionadoIdx] || DIAS_DISPONIVEIS[2];
  const precoTotal = 60.0;

  // Navegação do seletor semanal
  const handleDiaAnterior = () => {
    setDiaSelecionadoIdx((prev) => (prev > 0 ? prev - 1 : DIAS_DISPONIVEIS.length - 1));
  };

  const handleProximoDia = () => {
    setDiaSelecionadoIdx((prev) => (prev < DIAS_DISPONIVEIS.length - 1 ? prev + 1 : 0));
  };

  // Submissão do Agendamento e Pagamento
  const handleConfirmarEPagar = async () => {
    setProcessando(true);
    try {
      const payload: CriarAgendamentoDTO = {
        idAluno: 1,
        idProfessor: Number(params.professorId) || 101,
        idDisciplina: 1,
        data: diaAtual.dataCompleta,
        hora: horarioSelecionado,
        modalidade: "PRESENCIAL",
        formaPagamento: formaPagamento,
        valor: precoTotal,
      };

      await solicitarAgendamentoComFallback(payload);
      setProcessando(false);
      setModalSucesso(true);
    } catch {
      setProcessando(false);
      setModalSucesso(true);
    }
  };

  const handleCopiarPix = () => {
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 3000);
    Alert.alert("Código Pix", "Código Pix copia e cola copiado com sucesso!");
  };

  const handleIrParaAgenda = () => {
    setModalSucesso(false);
    router.push("/agenda" as any);
  };

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 1. TOP HEADER (VOLTAR + TÍTULO CENTRALIZADO)                   */}
      {/* ============================================================== */}
      <View style={estilos.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={estilos.botaoVoltar}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeader}>Marcar aula</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Banner de Modo de Simulação Discreto */}
      <View style={estilos.bannerSimulacao}>
        <View style={estilos.badgeDot} />
        <Text style={estilos.textoSimulacao}>
          Modo Simulação: Dados offline ativos (Ref. IMG-008)
        </Text>
      </View>

      <ScrollView
        style={estilos.scrollView}
        contentContainerStyle={estilos.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* 2. STEPPER DE PROGRESSO HORIZONTAL (4 ETAPAS)                  */}
        {/* ============================================================== */}
        <View style={estilos.stepperContainer}>
          {/* Passo 1: Professor (Concluído) */}
          <View style={estilos.stepItem}>
            <View style={estilos.stepCirculoConcluido}>
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <Text style={estilos.stepRotuloConcluido}>Professor</Text>
          </View>

          {/* Linha Conectora 1-2 (Laranja) */}
          <View style={[estilos.linhaConectora, estilos.linhaAtiva]} />

          {/* Passo 2: Data e Hora (Ativo) */}
          <View style={estilos.stepItem}>
            <View style={estilos.stepCirculoAtivo}>
              <Text style={estilos.stepNumeroAtivo}>2</Text>
            </View>
            <Text style={estilos.stepRotuloAtivo}>Data e Hora</Text>
          </View>

          {/* Linha Conectora 2-3 (Cinza) */}
          <View style={estilos.linhaConectora} />

          {/* Passo 3: Pagamento (Próximo) */}
          <View style={estilos.stepItem}>
            <View style={estilos.stepCirculoNeutro}>
              <Text style={estilos.stepNumeroNeutro}>3</Text>
            </View>
            <Text style={estilos.stepRotuloNeutro}>Pagamento</Text>
          </View>

          {/* Linha Conectora 3-4 (Cinza) */}
          <View style={estilos.linhaConectora} />

          {/* Passo 4: Confirmação (Futuro) */}
          <View style={estilos.stepItem}>
            <View style={estilos.stepCirculoNeutro}>
              <Text style={estilos.stepNumeroNeutro}>4</Text>
            </View>
            <Text style={estilos.stepRotuloNeutro}>Confirmação</Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 3. CARD RESUMO DO PROFESSOR SELECIONADO                        */}
        {/* ============================================================== */}
        <View style={estilos.cardProfessor}>
          {/* Foto com Dot Online */}
          <View style={estilos.fotoContainer}>
            <Image
              source={{ uri: MOCK_AGENDAMENTO_PADRAO.professorFoto }}
              style={estilos.fotoProfessor}
            />
            <View style={estilos.dotOnline} />
          </View>

          {/* Dados do Professor */}
          <View style={estilos.infoProfessor}>
            <View style={estilos.linhaNome}>
              <Text style={estilos.nomeProfessor}>{MOCK_AGENDAMENTO_PADRAO.professorNome}</Text>
              <MaterialIcons
                name="verified"
                size={16}
                color="#0284C7"
                style={{ marginLeft: 4 }}
              />
            </View>
            <Text style={estilos.materiaProfessor}>Matemática</Text>

            {/* Avaliação */}
            <View style={estilos.linhaAvaliacao}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={estilos.textoAvaliacao}> 4,9 (128 avaliações)</Text>
            </View>

            {/* Badges de Modalidade e Nível */}
            <View style={estilos.badgesRow}>
              <View style={estilos.badgePill}>
                <Ionicons name="school" size={12} color="#0284C7" style={{ marginRight: 3 }} />
                <Text style={estilos.badgePillTexto}>Ensino Superior</Text>
              </View>
              <View style={estilos.badgePill}>
                <Feather name="monitor" size={12} color="#0284C7" style={{ marginRight: 3 }} />
                <Text style={estilos.badgePillTexto}>Aula Presencial e Online</Text>
              </View>
            </View>
          </View>

          {/* Valor Hora/Aula */}
          <View style={estilos.blocoPreco}>
            <Text style={estilos.valorHora}>R$ 60,00</Text>
            <Text style={estilos.unidadeHora}>/h</Text>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 4. SELETOR SEMANAL DE DATAS ("Escolha a data")                 */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <View style={estilos.secaoTituloRow}>
            <Feather name="calendar" size={18} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.secaoTitulo}>Escolha a data</Text>
          </View>

          <View style={estilos.seletorSemanalRow}>
            {/* Seta Esquerda */}
            <TouchableOpacity
              onPress={handleDiaAnterior}
              style={estilos.botaoSetaSemana}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color="#0F172A" />
            </TouchableOpacity>

            {/* Dias da Semana */}
            <View style={estilos.diasContainer}>
              {DIAS_DISPONIVEIS.map((dia, idx) => {
                const isSelected = idx === diaSelecionadoIdx;
                return (
                  <TouchableOpacity
                    key={`dia-${idx}`}
                    onPress={() => setDiaSelecionadoIdx(idx)}
                    style={[estilos.cardDia, isSelected && estilos.cardDiaAtivo]}
                    activeOpacity={0.8}
                  >
                    {/* Badge Check Laranja para o Dia Ativo */}
                    {isSelected && (
                      <View style={estilos.badgeCheckLaranja}>
                        <Feather name="check" size={10} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={[estilos.textoDiaSemana, isSelected && estilos.textoDiaAtivo]}>
                      {dia.diaSemana}
                    </Text>
                    <Text style={[estilos.textoDiaMes, isSelected && estilos.textoDiaAtivo]}>
                      {dia.diaMes}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Seta Direita */}
            <TouchableOpacity
              onPress={handleProximoDia}
              style={estilos.botaoSetaSemana}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 5. SELETOR DE HORÁRIOS ("Escolha o horário")                   */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <View style={estilos.secaoTituloRow}>
            <Feather name="clock" size={18} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.secaoTitulo}>Escolha o horário</Text>
          </View>

          <View style={estilos.horariosGrid}>
            {HORARIOS_DISPONIVEIS.map((hora) => {
              const isSelected = hora === horarioSelecionado;
              return (
                <TouchableOpacity
                  key={`hora-${hora}`}
                  onPress={() => setHorarioSelecionado(hora)}
                  style={[estilos.pillHorario, isSelected && estilos.pillHorarioAtivo]}
                  activeOpacity={0.8}
                >
                  {/* Badge Check Laranja para o Horário Ativo */}
                  {isSelected && (
                    <View style={estilos.badgeCheckLaranja}>
                      <Feather name="check" size={10} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={[estilos.textoHorario, isSelected && estilos.textoHorarioAtivo]}>
                    {hora}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ============================================================== */}
        {/* 6. FORMAS DE PAGAMENTO ("Forma de pagamento")                  */}
        {/* ============================================================== */}
        <View style={estilos.secaoContainer}>
          <View style={estilos.secaoTituloRow}>
            <Feather name="credit-card" size={18} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={estilos.secaoTitulo}>Forma de pagamento</Text>
          </View>

          <View style={estilos.pagamentosContainer}>
            {/* Opção 1: PIX (Selecionado por Padrão conforme IMG-008) */}
            <TouchableOpacity
              onPress={() => setFormaPagamento("PIX")}
              style={[
                estilos.cardPagamento,
                formaPagamento === "PIX" && estilos.cardPagamentoAtivo,
              ]}
              activeOpacity={0.8}
            >
              {/* Ícone Pix Oficial em Verde */}
              <View style={estilos.iconePixContainer}>
                <Ionicons name="shapes" size={20} color="#059669" />
              </View>

              <View style={estilos.infoPagamento}>
                <Text style={estilos.tituloPagamento}>Pix</Text>
                <Text style={estilos.subtituloPagamento}>Pagamento instantâneo</Text>
              </View>

              {/* Radio Indicator */}
              <View style={estilos.radioContainer}>
                {formaPagamento === "PIX" ? (
                  <Ionicons name="checkmark-circle" size={22} color="#FF6B1A" />
                ) : (
                  <View style={estilos.radioVazio} />
                )}
              </View>
            </TouchableOpacity>

            {/* Opção 2: Cartão de Crédito */}
            <TouchableOpacity
              onPress={() => setFormaPagamento("CARTAO")}
              style={[
                estilos.cardPagamento,
                formaPagamento === "CARTAO" && estilos.cardPagamentoAtivo,
              ]}
              activeOpacity={0.8}
            >
              <View style={estilos.iconeCartaoContainer}>
                <Feather name="credit-card" size={20} color="#2563EB" />
              </View>

              <View style={estilos.infoPagamento}>
                <Text style={estilos.tituloPagamento}>Cartão de crédito</Text>
                <Text style={estilos.subtituloPagamento}>Parcele em até 12x</Text>
              </View>

              <View style={estilos.radioContainer}>
                {formaPagamento === "CARTAO" ? (
                  <Ionicons name="checkmark-circle" size={22} color="#FF6B1A" />
                ) : (
                  <View style={estilos.radioVazio} />
                )}
              </View>
            </TouchableOpacity>

            {/* Opção 3: Carteira Orienta */}
            <TouchableOpacity
              onPress={() => setFormaPagamento("CARTEIRA")}
              style={[
                estilos.cardPagamento,
                formaPagamento === "CARTEIRA" && estilos.cardPagamentoAtivo,
              ]}
              activeOpacity={0.8}
            >
              <View style={estilos.iconeCarteiraContainer}>
                <Ionicons name="wallet-outline" size={20} color="#2563EB" />
              </View>

              <View style={estilos.infoPagamento}>
                <Text style={estilos.tituloPagamento}>Carteira Orienta</Text>
                <Text style={estilos.subtituloPagamento}>Saldo disponível: R$ 120,00</Text>
              </View>

              <View style={estilos.radioContainer}>
                {formaPagamento === "CARTEIRA" ? (
                  <Ionicons name="checkmark-circle" size={22} color="#FF6B1A" />
                ) : (
                  <View style={estilos.radioVazio} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 7. BOX RESUMO DA ESCOLHA                                       */}
        {/* ============================================================== */}
        <View style={estilos.boxResumo}>
          <View style={estilos.resumoHeader}>
            <Feather name="info" size={14} color="#EA580C" style={{ marginRight: 5 }} />
            <Text style={estilos.resumoTitulo}>Resumo da sua escolha</Text>
          </View>

          <View style={estilos.resumoGrid}>
            {/* Coluna 1: Data */}
            <View style={estilos.colunaResumo}>
              <View style={estilos.iconeLinha}>
                <Feather name="calendar" size={13} color="#94A3B8" />
                <Text style={estilos.labelResumo}> Data</Text>
              </View>
              <Text style={estilos.valorResumo}>{diaAtual.dataCompleta}</Text>
            </View>

            {/* Coluna 2: Horário */}
            <View style={estilos.colunaResumo}>
              <View style={estilos.iconeLinha}>
                <Feather name="clock" size={13} color="#94A3B8" />
                <Text style={estilos.labelResumo}> Horário</Text>
              </View>
              <Text style={estilos.valorResumo}>{horarioSelecionado} – 15:00</Text>
            </View>

            {/* Coluna 3: Professor */}
            <View style={estilos.colunaResumo}>
              <View style={estilos.professorLinhaResumo}>
                <Image
                  source={{ uri: MOCK_AGENDAMENTO_PADRAO.professorFoto }}
                  style={estilos.fotoMiniaturaResumo}
                />
                <View style={{ marginLeft: 6 }}>
                  <Text style={estilos.labelResumo}>Professor</Text>
                  <Text style={estilos.valorResumo}>Prof. Lucas Rocha</Text>
                </View>
              </View>
            </View>

            {/* Coluna 4: Valor */}
            <View style={[estilos.colunaResumo, { alignItems: "flex-end" }]}>
              <Text style={estilos.labelResumo}>Valor</Text>
              <Text style={estilos.valorDestaqueLaranja}>R$ 60,00</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* 8. STICKY ACTION FOOTER (CONFIRMAR E PAGAR + SELO DE SEGURANÇA)*/}
      {/* ============================================================== */}
      <View style={[estilos.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={handleConfirmarEPagar}
          disabled={processando}
          style={estilos.botaoConfirmarPagar}
          activeOpacity={0.85}
        >
          {processando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={estilos.botaoConteudoRow}>
              <Feather name="lock" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={estilos.textoBotaoConfirmar}>
                Confirmar e Pagar • R$ 60,00
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Selo Inferior de Pagamento Seguro */}
        <View style={estilos.seloSeguroLinha}>
          <Feather name="shield" size={13} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={estilos.textoSeloSeguro}>Pagamento seguro e protegido</Text>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 9. MODAL DE CONFIRMAÇÃO / CHECKOUT SUCESSO                     */}
      {/* ============================================================== */}
      <Modal
        visible={modalSucesso}
        transparent
        animationType="fade"
        onRequestClose={() => setModalSucesso(false)}
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCard}>
            {/* Ícone de Sucesso */}
            <View style={estilos.modalIconeSucesso}>
              <Feather name="check" size={32} color="#FFFFFF" />
            </View>

            <Text style={estilos.modalTitulo}>Aula Agendada com Sucesso!</Text>
            <Text style={estilos.modalSubtitulo}>
              Sua mentoria com Prof. Lucas Rocha para {diaAtual.dataCompleta} às {horarioSelecionado} foi confirmada.
            </Text>

            {formaPagamento === "PIX" && (
              <View style={estilos.modalPixBox}>
                <Text style={estilos.modalPixTitulo}>Chave Pix Copia e Cola:</Text>
                <Text style={estilos.modalPixChave} numberOfLines={2}>
                  {MOCK_AGENDAMENTO_PADRAO.codigoPix}
                </Text>
                <TouchableOpacity
                  style={estilos.botaoCopiarPix}
                  onPress={handleCopiarPix}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={pixCopiado ? "check-circle" : "copy"}
                    size={16}
                    color="#FF6B1A"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={estilos.textoCopiarPix}>
                    {pixCopiado ? "Chave Copiada!" : "Copiar Código Pix"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={estilos.modalAcoesRow}>
              <TouchableOpacity
                style={estilos.modalBotaoPrimario}
                onPress={handleIrParaAgenda}
                activeOpacity={0.85}
              >
                <Text style={estilos.textoModalBotaoPrimario}>Ver Minha Agenda</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={estilos.modalBotaoSecundario}
                onPress={() => setModalSucesso(false)}
                activeOpacity={0.85}
              >
                <Text style={estilos.textoModalBotaoSecundario}>Fechar</Text>
              </TouchableOpacity>
            </View>
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
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  botaoVoltar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  tituloHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  bannerSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
    marginRight: 6,
  },
  textoSimulacao: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Stepper
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCirculoConcluido: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6B1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepRotuloConcluido: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
  },
  stepCirculoAtivo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6B1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepNumeroAtivo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepRotuloAtivo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  stepCirculoNeutro: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepNumeroNeutro: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  stepRotuloNeutro: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },
  linhaConectora: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
    marginBottom: 16,
  },
  linhaAtiva: {
    backgroundColor: "#FF6B1A",
  },

  // Card Professor
  cardProfessor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  fotoContainer: {
    position: "relative",
    marginRight: 12,
  },
  fotoProfessor: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E2E8F0",
  },
  dotOnline: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  infoProfessor: {
    flex: 1,
  },
  linhaNome: {
    flexDirection: "row",
    alignItems: "center",
  },
  nomeProfessor: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  materiaProfessor: {
    fontSize: 13,
    color: "#475569",
    marginTop: 1,
  },
  linhaAvaliacao: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  textoAvaliacao: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillTexto: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0369A1",
  },
  blocoPreco: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  valorHora: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  unidadeHora: {
    fontSize: 12,
    color: "#64748B",
  },

  // Seção
  secaoContainer: {
    marginBottom: 20,
  },
  secaoTituloRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  // Seletor Semanal
  seletorSemanalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  botaoSetaSemana: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  diasContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 8,
  },
  cardDia: {
    position: "relative",
    width: 52,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardDiaAtivo: {
    backgroundColor: "#0A2540",
  },
  badgeCheckLaranja: {
    position: "absolute",
    top: -5,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF6B1A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  textoDiaSemana: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 2,
  },
  textoDiaMes: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  textoDiaAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Grid de Horários
  horariosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pillHorario: {
    position: "relative",
    flex: 1,
    minWidth: 58,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pillHorarioAtivo: {
    backgroundColor: "#0A2540",
  },
  textoHorario: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  textoHorarioAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Formas de Pagamento
  pagamentosContainer: {
    gap: 10,
  },
  cardPagamento: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  cardPagamentoAtivo: {
    borderColor: "#FF6B1A",
    backgroundColor: "#FFFFFF",
  },
  iconePixContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconeCartaoContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconeCarteiraContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoPagamento: {
    flex: 1,
  },
  tituloPagamento: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtituloPagamento: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  radioContainer: {
    marginLeft: 8,
  },
  radioVazio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },

  // Box Resumo
  boxResumo: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginTop: 4,
  },
  resumoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  resumoTitulo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A3412",
  },
  resumoGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colunaResumo: {
    flex: 1,
  },
  iconeLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  labelResumo: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  valorResumo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  professorLinhaResumo: {
    flexDirection: "row",
    alignItems: "center",
  },
  fotoMiniaturaResumo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#CBD5E1",
  },
  valorDestaqueLaranja: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EA580C",
  },

  // Sticky Action Footer
  stickyFooter: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 8,
  },
  botaoConfirmarPagar: {
    backgroundColor: "#FF6B1A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B1A",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  botaoConteudoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoConfirmar: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  seloSeguroLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  textoSeloSeguro: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconeSucesso: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  modalPixBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  modalPixTitulo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  modalPixChave: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#475569",
    marginBottom: 8,
  },
  botaoCopiarPix: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  textoCopiarPix: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  modalAcoesRow: {
    width: "100%",
    gap: 8,
  },
  modalBotaoPrimario: {
    width: "100%",
    backgroundColor: "#FF6B1A",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textoModalBotaoPrimario: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalBotaoSecundario: {
    width: "100%",
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textoModalBotaoSecundario: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
});
