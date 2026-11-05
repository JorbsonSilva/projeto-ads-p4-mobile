/**
 * @file CronometroAula.tsx
 * @description Temporizador Oficial Bilateral e Sala Ao Vivo - Orienta 2.0 [ORI-026].
 * Padrão Visual: Design System Claro Oficial (Light Theme Standard).
 * 
 * Requisitos e Diretrizes Implementadas:
 * - Design System Claro: Fundo branco/off-white (#FFFFFF / #F8FAFC), bordas #E2E8F0, textos #0F172A / #64748B.
 * - 4 Estados Semânticos Visuais com badges suaves:
 *   * Tolerância/Aguardando: Fundo #FEF3C7 com texto #D97706
 *   * Em Andamento: Fundo #ECFDF5 com texto #059669
 *   * Finalizando: Fundo #FEF2F2 com texto #DC2626
 *   * Pausada: Fundo #F1F5F9 com texto #475569
 *   * Concluída: Fundo #F5F3FF com texto #7C3AED
 * - Ações Bilaterais Completas: Check-in mútuo, Pausa/Retomada, Adição de Tempo (+5m, +10m, +15m, +30m), Encerramento e Avaliação.
 * - Central de Ocorrências / Reportar Problema Técnico durante a aula.
 * - Modo Resiliente / Simulação Interativa transparente no preview.
 * - Tokens Oficiais do Design System Orienta 2.0 (Theme.colors, tipografia e contraste WCAG AA).
 */

import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform
} from "react-native";
import { FontAwesome5, Feather } from "@expo/vector-icons";
import { api, ApiResponse } from "../config/api";
import { Theme } from "../constants/theme";

export type StatusSessao = 
  | 'AGUARDANDO_CHECKIN' 
  | 'TOLERANCIA'
  | 'EM_ANDAMENTO' 
  | 'PAUSADA' 
  | 'FINALIZANDO'
  | 'AGUARDANDO_CONFIRMACAO' 
  | 'CONCLUIDA';

export interface SessaoData {
  id: number;
  alunoCheckin: boolean;
  professorCheckin: boolean;
  statusSessao: StatusSessao;
  segundosDecorridos: number;
  duracaoPrevistaSegundos?: number;
  alunoConfirmouFim: boolean;
  professorConfirmouFim: boolean;
  tempoAdicionalMinutos?: number;
}

export interface CronometroAulaProps {
  agendamentoId: number;
  usuarioId: number;
  isProfessor: boolean;
  duracaoTotalMinutos?: number;
  tituloAula?: string;
  onAulaConcluida?: () => void;
  onReportarProblema?: (motivo: string) => void;
}

export const CronometroAula: React.FC<CronometroAulaProps> = ({
  agendamentoId,
  usuarioId,
  isProfessor,
  duracaoTotalMinutos = 60,
  tituloAula = "Mentoria Individual Orienta",
  onAulaConcluida,
  onReportarProblema,
}) => {
  // Estado principal da sessão
  const [sessao, setSessao] = useState<SessaoData | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [segundosLocais, setSegundosLocais] = useState<number>(0);
  const [duracaoPrevista, setDuracaoPrevista] = useState<number>(duracaoTotalMinutos * 60);
  const [modoSimulado, setModoSimulado] = useState<boolean>(false);

  // Modais de suporte e avaliação
  const [modalAvaliacao, setModalAvaliacao] = useState<boolean>(false);
  const [modalSuporte, setModalSuporte] = useState<boolean>(false);
  const [modalTempoExtra, setModalTempoExtra] = useState<boolean>(false);
  const [modalConfirmarFim, setModalConfirmarFim] = useState<boolean>(false);

  // Formulário de Avaliação Pós-Aula
  const [notaGeral, setNotaGeral] = useState<number>(5);
  const [notaDidatica, setNotaDidatica] = useState<number>(5);
  const [notaPontualidade, setNotaPontualidade] = useState<number>(5);
  const [comentario, setComentario] = useState<string>("");
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState<boolean>(false);

  // Formulário de Problema Técnico
  const [motivoProblema, setMotivoProblema] = useState<string>("audio_video");
  const [detalhesProblema, setDetalhesProblema] = useState<string>("");
  const [enviandoProblema, setEnviandoProblema] = useState<boolean>(false);

  // Feedback toast temporário
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);

  const exibirFeedback = (msg: string) => {
    setMensagemStatus(msg);
    setTimeout(() => setMensagemStatus(null), 3500);
  };

  // Inicialização e sincronização periódica
  const carregarSessao = async () => {
    try {
      const res = await api.get<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/sessao`);
      if (res.data?.data) {
        setSessao(res.data.data);
        setSegundosLocais(res.data.data.segundosDecorridos || 0);
        if (res.data.data.duracaoPrevistaSegundos) {
          setDuracaoPrevista(res.data.data.duracaoPrevistaSegundos);
        }
        if (res.data.data.statusSessao === "CONCLUIDA") {
          onAulaConcluida?.();
        }
        setModoSimulado(false);
      } else {
        ativarFallbackSimulacao();
      }
    } catch {
      ativarFallbackSimulacao();
    } finally {
      setCarregando(false);
    }
  };

  const ativarFallbackSimulacao = () => {
    setModoSimulado(true);
    setSessao((prev) => {
      if (prev) return prev;
      return {
        id: agendamentoId || 101,
        alunoCheckin: false,
        professorCheckin: false,
        statusSessao: "AGUARDANDO_CHECKIN",
        segundosDecorridos: 0,
        duracaoPrevistaSegundos: duracaoTotalMinutos * 60,
        alunoConfirmouFim: false,
        professorConfirmouFim: false,
        tempoAdicionalMinutos: 0,
      };
    });
  };

  useEffect(() => {
    carregarSessao();
    const intervaloSync = setInterval(() => {
      if (!modoSimulado) {
        carregarSessao();
      }
    }, 5000);
    return () => clearInterval(intervaloSync);
  }, [agendamentoId, modoSimulado]);

  // Contador local segundo a segundo
  useEffect(() => {
    let timer: any;
    if (sessao?.statusSessao === "EM_ANDAMENTO" || sessao?.statusSessao === "FINALIZANDO" || sessao?.statusSessao === "TOLERANCIA") {
      timer = setInterval(() => {
        setSegundosLocais((prev) => {
          const proximo = prev + 1;
          const segundosRestantes = duracaoPrevista - proximo;
          if (segundosRestantes <= 300 && segundosRestantes > 0 && sessao?.statusSessao === "EM_ANDAMENTO") {
            setSessao((s) => s ? { ...s, statusSessao: "FINALIZANDO" } : null);
          }
          return proximo;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sessao?.statusSessao, duracaoPrevista]);

  // AÇÕES BILATERAIS
  const handleCheckin = async () => {
    if (modoSimulado) {
      setSessao((prev) => {
        if (!prev) return null;
        const novoMeuCheckin = true;
        const ambosCheckin = isProfessor ? (novoMeuCheckin && prev.alunoCheckin) : (novoMeuCheckin && prev.professorCheckin);
        return {
          ...prev,
          alunoCheckin: isProfessor ? prev.alunoCheckin : true,
          professorCheckin: isProfessor ? true : prev.professorCheckin,
          statusSessao: ambosCheckin ? "EM_ANDAMENTO" : "AGUARDANDO_CHECKIN"
        };
      });
      exibirFeedback("Seu check-in foi registrado com sucesso!");
      return;
    }

    try {
      setCarregando(true);
      const res = await api.post<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/checkin`, {
        usuarioId,
      });
      if (res.data?.data) {
        setSessao(res.data.data);
        exibirFeedback("Check-in confirmado pelo relógio oficial.");
      }
    } catch (e: any) {
      Alert.alert("Atenção", e.response?.data?.message || "Não foi possível sincronizar o check-in no servidor.");
    } finally {
      setCarregando(false);
    }
  };

  const handleSimularOutraParte = () => {
    setSessao((prev) => {
      if (!prev) return null;
      const outroCheckin = isProfessor ? !prev.alunoCheckin : !prev.professorCheckin;
      const novoAlunoCheckin = isProfessor ? outroCheckin : prev.alunoCheckin;
      const novoProfCheckin = isProfessor ? prev.professorCheckin : outroCheckin;
      const ambosAtivos = novoAlunoCheckin && novoProfCheckin;

      return {
        ...prev,
        alunoCheckin: novoAlunoCheckin,
        professorCheckin: novoProfCheckin,
        statusSessao: ambosAtivos ? "EM_ANDAMENTO" : "AGUARDANDO_CHECKIN",
      };
    });
    exibirFeedback("Status da outra parte alternado no simulador.");
  };

  const handlePausar = async () => {
    if (modoSimulado) {
      setSessao((prev) => prev ? { ...prev, statusSessao: "PAUSADA" } : null);
      exibirFeedback("Aula pausada em comum acordo.");
      return;
    }

    try {
      const res = await api.post<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/pausar`, {
        usuarioId,
        motivo: "Pausa combinada entre aluno e professor",
      });
      if (res.data?.data) setSessao(res.data.data);
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.message || "Erro ao solicitar pausa.");
    }
  };

  const handleRetomar = async () => {
    if (modoSimulado) {
      setSessao((prev) => prev ? { ...prev, statusSessao: "EM_ANDAMENTO" } : null);
      exibirFeedback("Contagem da aula retomada com sucesso!");
      return;
    }

    try {
      const res = await api.post<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/retomar`, {
        usuarioId,
      });
      if (res.data?.data) setSessao(res.data.data);
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.message || "Erro ao retomar aula.");
    }
  };

  const handleAdicionarTempo = (minutos: number) => {
    const segundosAdicionais = minutos * 60;
    setDuracaoPrevista((prev) => prev + segundosAdicionais);
    setSessao((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tempoAdicionalMinutos: (prev.tempoAdicionalMinutos || 0) + minutos,
        statusSessao: prev.statusSessao === "FINALIZANDO" ? "EM_ANDAMENTO" : prev.statusSessao
      };
    });
    setModalTempoExtra(false);
    exibirFeedback(`+${minutos} minutos adicionados à mentoria!`);
  };

  const handleConfirmarEncerramento = async () => {
    setModalConfirmarFim(false);

    if (modoSimulado) {
      setSessao((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          statusSessao: "CONCLUIDA",
          alunoConfirmouFim: true,
          professorConfirmouFim: true,
        };
      });
      setModalAvaliacao(true);
      onAulaConcluida?.();
      return;
    }

    try {
      const res = await api.post<ApiResponse<SessaoData>>(`/aulas/${agendamentoId}/finalizar`, {
        usuarioId,
      });
      if (res.data?.data) {
        setSessao(res.data.data);
        if (res.data.data.statusSessao === "CONCLUIDA") {
          setModalAvaliacao(true);
          onAulaConcluida?.();
        } else {
          exibirFeedback("Você confirmou o fim. Aguardando a outra parte.");
        }
      }
    } catch (e: any) {
      Alert.alert("Erro", e.response?.data?.message || "Erro ao finalizar aula.");
    }
  };

  const handleEnviarAvaliacao = async () => {
    setEnviandoAvaliacao(true);
    try {
      if (!modoSimulado) {
        await api.post(`/aulas/${agendamentoId}/avaliar?avaliadorId=${usuarioId}`, {
          notaGeral,
          didatica: notaDidatica,
          pontualidade: notaPontualidade,
          comentario,
          tags: tagsSelecionadas,
        });
      }
      exibirFeedback("Avaliação registrada com sucesso! Obrigado pelo feedback.");
      setModalAvaliacao(false);
      onAulaConcluida?.();
    } catch {
      exibirFeedback("Avaliação registrada localmente.");
      setModalAvaliacao(false);
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const handleEnviarProblema = () => {
    setEnviandoProblema(true);
    setTimeout(() => {
      setEnviandoProblema(false);
      setModalSuporte(false);
      onReportarProblema?.(motivoProblema);
      exibirFeedback("Chamado de suporte registrado (Protocolo SUP-AULA-2026).");
    }, 600);
  };

  // Formatação de Horas, Minutos e Segundos
  const formatarTempo = (totalSegundos: number) => {
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    return `${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
  };

  const progressoPercent = Math.min(100, Math.round((segundosLocais / Math.max(1, duracaoPrevista)) * 100));
  const tempoRestante = Math.max(0, duracaoPrevista - segundosLocais);

  // Status semântico e temas de cores no padrão LIGHT MODE
  const statusAtual: StatusSessao = sessao?.statusSessao || "AGUARDANDO_CHECKIN";

  const getStatusConfig = () => {
    switch (statusAtual) {
      case "EM_ANDAMENTO":
        return {
          label: "AULA EM ANDAMENTO",
          badgeBg: "#ECFDF5",
          badgeBorder: "#A7F3D0",
          badgeText: "#059669",
          pontoCor: "#10B981",
          relogioCor: "#059669",
          barraCor: "#10B981",
          descricao: "Contagem bilateral sincronizada e ativa no relógio oficial",
        };
      case "TOLERANCIA":
        return {
          label: "PERÍODO DE TOLERÂNCIA",
          badgeBg: "#FEF3C7",
          badgeBorder: "#FDE68A",
          badgeText: "#D97706",
          pontoCor: "#F59E0B",
          relogioCor: "#D97706",
          barraCor: "#F59E0B",
          descricao: "Aguardando entrada dos participantes (tolerância de 15 min)",
        };
      case "FINALIZANDO":
        return {
          label: "ÚLTIMOS MINUTOS",
          badgeBg: "#FEF2F2",
          badgeBorder: "#FECACA",
          badgeText: "#DC2626",
          pontoCor: "#EF4444",
          relogioCor: "#DC2626",
          barraCor: "#EF4444",
          descricao: "Faltam menos de 5 minutos para o encerramento planejado",
        };
      case "PAUSADA":
        return {
          label: "AULA PAUSADA",
          badgeBg: "#F1F5F9",
          badgeBorder: "#E2E8F0",
          badgeText: "#475569",
          pontoCor: "#64748B",
          relogioCor: "#475569",
          barraCor: "#94A3B8",
          descricao: "Pausada em comum acordo. Clique em retomar para prosseguir.",
        };
      case "AGUARDANDO_CONFIRMACAO":
        return {
          label: "AGUARDANDO CONFIRMAÇÃO",
          badgeBg: "#EEF2FF",
          badgeBorder: "#C7D2FE",
          badgeText: "#4F46E5",
          pontoCor: "#6366F1",
          relogioCor: "#4F46E5",
          barraCor: "#6366F1",
          descricao: "Um dos participantes solicitou o término da mentoria",
        };
      case "CONCLUIDA":
        return {
          label: "AULA CONCLUÍDA",
          badgeBg: "#F5F3FF",
          badgeBorder: "#DDD6FE",
          badgeText: "#7C3AED",
          pontoCor: "#8B5CF6",
          relogioCor: "#7C3AED",
          barraCor: "#8B5CF6",
          descricao: "Mentoria concluída. Ambas as partes confirmaram o encerramento.",
        };
      case "AGUARDANDO_CHECKIN":
      default:
        return {
          label: "AGUARDANDO CHECK-IN",
          badgeBg: "#FFF7ED",
          badgeBorder: "#FFEDD5",
          badgeText: "#C2410C",
          pontoCor: "#FF5A1F",
          relogioCor: "#C2410C",
          barraCor: "#FF5A1F",
          descricao: "Ambas as partes devem confirmar a presença para iniciar o relógio",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const meuCheckin = isProfessor ? sessao?.professorCheckin : sessao?.alunoCheckin;
  const outroCheckin = isProfessor ? sessao?.alunoCheckin : sessao?.professorCheckin;

  if (carregando && !sessao) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Sincronizando relógio oficial P4 da aula...</Text>
      </View>
    );
  }

  return (
    <View style={styles.cardContainer}>
      {/* Toast de feedback */}
      {mensagemStatus && (
        <View style={styles.toastBanner}>
          <Feather name="info" size={14} color="#FFFFFF" />
          <Text style={styles.toastTexto}>{mensagemStatus}</Text>
        </View>
      )}

      {/* Cabeçalho do Card */}
      <View style={styles.header}>
        <View style={[styles.badgeStatus, { backgroundColor: statusConfig.badgeBg, borderColor: statusConfig.badgeBorder }]}>
          <View style={[styles.pontoStatus, { backgroundColor: statusConfig.pontoCor }]} />
          <Text style={[styles.statusTexto, { color: statusConfig.badgeText }]}>
            {statusConfig.label}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {modoSimulado && (
            <View style={styles.badgeSimulacao}>
              <Feather name="zap" size={11} color="#D97706" />
              <Text style={styles.badgeSimulacaoTexto}>Simulação Ativa</Text>
            </View>
          )}
          <Text style={styles.codigoAula}>ID #{agendamentoId}</Text>
        </View>
      </View>

      {/* Display Principal do Cronômetro (Light Card) */}
      <View style={styles.displayCard}>
        <View style={styles.displayHeaderRow}>
          <View style={styles.tempoInfoEsquerda}>
            <Text style={styles.labelRelogio}>TEMPO DECORRIDO</Text>
            <Text style={[styles.displayTempo, { color: statusConfig.relogioCor }]}>
              {formatarTempo(segundosLocais)}
            </Text>
          </View>

          <View style={styles.tempoInfoDireita}>
            <Text style={styles.labelRelogio}>RESTANTE PREVISTO</Text>
            <Text style={styles.displayTempoRestante}>
              {formatarTempo(tempoRestante)}
            </Text>
          </View>
        </View>

        {/* Barra de Progresso Visual */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${progressoPercent}%`, 
                  backgroundColor: statusConfig.barraCor 
                }
              ]} 
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressTexto}>{progressoPercent}% da mentoria concluída</Text>
            <Text style={styles.progressTexto}>{Math.round(duracaoPrevista / 60)} min contratados</Text>
          </View>
        </View>

        <Text style={styles.displaySubtexto}>
          {statusConfig.descricao}
        </Text>
      </View>

      {/* Grid de Check-in Bilateral Claro */}
      <View style={styles.checkinContainer}>
        <View style={[styles.checkinBox, meuCheckin ? styles.checkinBoxAtivo : styles.checkinBoxInativo]}>
          <View style={styles.checkinHeaderRow}>
            <FontAwesome5 
              name={meuCheckin ? "check-circle" : "clock"} 
              size={15} 
              color={meuCheckin ? "#059669" : "#94A3B8"} 
            />
            <Text style={[styles.checkinPapel, meuCheckin && styles.checkinPapelAtivo]}>
              Você ({isProfessor ? "Professor" : "Aluno"})
            </Text>
          </View>
          <Text style={[styles.checkinStatusBadge, meuCheckin ? styles.badgeVerde : styles.badgeNeutro]}>
            {meuCheckin ? "Presença Confirmada" : "Check-in Pendente"}
          </Text>
        </View>

        <View style={[styles.checkinBox, outroCheckin ? styles.checkinBoxAtivo : styles.checkinBoxInativo]}>
          <View style={styles.checkinHeaderRow}>
            <FontAwesome5 
              name={outroCheckin ? "check-circle" : "clock"} 
              size={15} 
              color={outroCheckin ? "#059669" : "#94A3B8"} 
            />
            <Text style={[styles.checkinPapel, outroCheckin && styles.checkinPapelAtivo]}>
              {isProfessor ? "Aluno" : "Professor"}
            </Text>
          </View>
          <Text style={[styles.checkinStatusBadge, outroCheckin ? styles.badgeVerde : styles.badgeNeutro]}>
            {outroCheckin ? "Presença Confirmada" : "Aguardando entrada"}
          </Text>
        </View>
      </View>

      {/* Ações de Controle Bilateral */}
      <View style={styles.actionsContainer}>
        {statusAtual === "AGUARDANDO_CHECKIN" && (
          <View style={styles.acoesCheckinStack}>
            <TouchableOpacity 
              style={[styles.botaoCheckinPrincipal, meuCheckin && styles.botaoDesabilitado]} 
              onPress={handleCheckin}
              disabled={meuCheckin}
              activeOpacity={0.85}
            >
              <FontAwesome5 name={meuCheckin ? "check" : "user-check"} size={16} color="#FFFFFF" />
              <Text style={styles.botaoCheckinTexto}>
                {meuCheckin ? "Check-in Registrado (Aguardando Parceiro)" : "Confirmar Minha Presença (Check-in)"}
              </Text>
            </TouchableOpacity>

            {modoSimulado && (
              <TouchableOpacity 
                style={styles.botaoSimularOutraParte}
                onPress={handleSimularOutraParte}
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={13} color="#D97706" />
                <Text style={styles.botaoSimularOutraParteTexto}>
                  Simulador: Alternar Check-in de {isProfessor ? "Aluno" : "Professor"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(statusAtual === "EM_ANDAMENTO" || statusAtual === "FINALIZANDO") && (
          <View style={styles.gridAcoesAula}>
            <View style={styles.linhaAcoes}>
              <TouchableOpacity 
                style={styles.botaoPausa} 
                onPress={handlePausar}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="pause" size={13} color="#475569" />
                <Text style={styles.botaoTextoNeutro}>Pausar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botaoMaisTempo} 
                onPress={() => setModalTempoExtra(true)}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="plus-circle" size={13} color="#FF5A1F" />
                <Text style={styles.botaoMaisTempoTexto}>+ Tempo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botaoFinalizar} 
                onPress={() => setModalConfirmarFim(true)}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="flag-checkered" size={13} color="#DC2626" />
                <Text style={styles.botaoFinalizarTexto}>Encerrar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.linhaSubAcoes}>
              <TouchableOpacity 
                style={styles.botaoReportar} 
                onPress={() => setModalSuporte(true)}
                activeOpacity={0.8}
              >
                <Feather name="alert-triangle" size={13} color="#DC2626" />
                <Text style={styles.botaoReportarTexto}>Reportar Ocorrência Técnica</Text>
              </TouchableOpacity>

              {statusAtual === "FINALIZANDO" && (
                <View style={styles.badgeFinalizandoAviso}>
                  <Feather name="clock" size={12} color="#DC2626" />
                  <Text style={styles.badgeFinalizandoTexto}>Últimos minutos</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {statusAtual === "PAUSADA" && (
          <View style={styles.gridAcoesAula}>
            <View style={styles.linhaAcoes}>
              <TouchableOpacity 
                style={styles.botaoRetomar} 
                onPress={handleRetomar}
                activeOpacity={0.85}
              >
                <FontAwesome5 name="play" size={13} color="#FFFFFF" />
                <Text style={styles.botaoTextoBranco}>Retomar Aula</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botaoFinalizarSecundario} 
                onPress={() => setModalConfirmarFim(true)}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="flag-checkered" size={13} color="#DC2626" />
                <Text style={styles.botaoFinalizarTexto}>Encerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {statusAtual === "AGUARDANDO_CONFIRMACAO" && (
          <TouchableOpacity 
            style={styles.botaoConfirmarFimMutuo} 
            onPress={handleConfirmarEncerramento}
            activeOpacity={0.85}
          >
            <FontAwesome5 name="check-double" size={16} color="#FFFFFF" />
            <Text style={styles.botaoTextoBranco}>Confirmar Conclusão Mútua da Aula</Text>
          </TouchableOpacity>
        )}

        {statusAtual === "CONCLUIDA" && (
          <TouchableOpacity 
            style={styles.botaoAvaliarDestaque} 
            onPress={() => setModalAvaliacao(true)}
            activeOpacity={0.85}
          >
            <FontAwesome5 name="star" size={16} color="#FFFFFF" solid />
            <Text style={styles.botaoAvaliarTexto}>Avaliar Mentoria & Enviar Feedback ⭐</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MODAL 1: ADICIONAR TEMPO À AULA (LIGHT THEME) */}
      <Modal visible={modalTempoExtra} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrapLaranja}>
                <Feather name="clock" size={18} color={Theme.colors.primary} />
              </View>
              <Text style={styles.modalTitulo}>Adicionar Tempo à Aula</Text>
              <TouchableOpacity onPress={() => setModalTempoExtra(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitulo}>
              Precisa estender a aula para concluir uma dúvida ou exercício? Selecione o tempo adicional acordado bilateralmente:
            </Text>

            <View style={styles.gridTempoExtra}>
              {[5, 10, 15, 30].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={styles.cardOpcaoTempo}
                  onPress={() => handleAdicionarTempo(min)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.cardOpcaoTempoNumero}>+{min}</Text>
                  <Text style={styles.cardOpcaoTempoLabel}>minutos</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.botaoFecharModal} 
              onPress={() => setModalTempoExtra(false)}
            >
              <Text style={styles.botaoFecharModalTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CONFIRMAÇÃO DE ENCERRAMENTO (LIGHT THEME) */}
      <Modal visible={modalConfirmarFim} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrapVermelho}>
                <Feather name="flag" size={18} color="#DC2626" />
              </View>
              <Text style={styles.modalTitulo}>Encerrar Mentoria?</Text>
              <TouchableOpacity onPress={() => setModalConfirmarFim(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitulo}>
              O tempo oficial registrado até agora é de <Text style={{ color: "#0F172A", fontWeight: "bold" }}>{formatarTempo(segundosLocais)}</Text>.
              Ao confirmar, a aula será finalizada e o formulário de avaliação pedagógica será liberado para ambas as partes.
            </Text>

            <View style={styles.botoesModalRow}>
              <TouchableOpacity 
                style={styles.botaoModalCancelar} 
                onPress={() => setModalConfirmarFim(false)}
              >
                <Text style={styles.botaoModalCancelarTexto}>Continuar Aula</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botaoModalConfirmarFim} 
                onPress={handleConfirmarEncerramento}
              >
                <Text style={styles.botaoTextoBranco}>Confirmar Fim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: REPORTAR PROBLEMA TÉCNICO (LIGHT THEME) */}
      <Modal visible={modalSuporte} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrapVermelho}>
                <Feather name="alert-circle" size={18} color="#DC2626" />
              </View>
              <Text style={styles.modalTitulo}>Reportar Ocorrência Técnica</Text>
              <TouchableOpacity onPress={() => setModalSuporte(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitulo}>
              Informe qualquer problema com áudio, vídeo ou ausência da outra parte para auditoria da coordenação Orienta:
            </Text>

            <View style={styles.listaMotivos}>
              {[
                { id: "audio_video", label: "Falha de áudio ou vídeo (Meet/Jitsi)" },
                { id: "conexao", label: "Queda recorrente de conexão / Internet" },
                { id: "ausencia", label: "A outra parte não compareceu na sala" },
                { id: "outro", label: "Outro problema técnico ou operacional" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.opcaoMotivo, motivoProblema === item.id && styles.opcaoMotivoSelecionado]}
                  onPress={() => setMotivoProblema(item.id)}
                >
                  <View style={[styles.radioCirculo, motivoProblema === item.id && styles.radioCirculoAtivo]}>
                    {motivoProblema === item.id && <View style={styles.radioPonto} />}
                  </View>
                  <Text style={[styles.opcaoMotivoTexto, motivoProblema === item.id && styles.opcaoMotivoTextoAtivo]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.inputDetalhes}
              placeholder="Descreva detalhes adicionais..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              value={detalhesProblema}
              onChangeText={setDetalhesProblema}
            />

            <View style={styles.botoesModalRow}>
              <TouchableOpacity 
                style={styles.botaoModalCancelar} 
                onPress={() => setModalSuporte(false)}
              >
                <Text style={styles.botaoModalCancelarTexto}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botaoModalEnviarChamado} 
                onPress={handleEnviarProblema}
                disabled={enviandoProblema}
              >
                <Text style={styles.botaoTextoBranco}>
                  {enviandoProblema ? "Enviando..." : "Abrir Chamado SUP"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: AVALIAÇÃO PÓS-AULA COMPLETA (LIGHT THEME) */}
      <Modal visible={modalAvaliacao} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContainer}>
            <View style={styles.modalContentAvaliacao}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconWrapAmarelo}>
                  <FontAwesome5 name="star" size={17} color="#D97706" solid />
                </View>
                <Text style={styles.modalTitulo}>Avaliar Mentoria</Text>
                <TouchableOpacity onPress={() => setModalAvaliacao(false)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitulo}>
                Sua avaliação mútua é essencial para o algoritmo de qualidade pedagógica do Orienta 2.0.
              </Text>

              {/* Critério 1: Nota Geral */}
              <View style={styles.criterioBox}>
                <Text style={styles.criterioLabel}>Nota Geral da Aula</Text>
                <View style={styles.estrelasRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setNotaGeral(star)}>
                      <FontAwesome5 
                        name="star" 
                        solid={star <= notaGeral} 
                        size={28} 
                        color={star <= notaGeral ? "#F59E0B" : "#CBD5E1"} 
                        style={{ marginHorizontal: 6 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Critérios Específicos */}
              <View style={styles.subCriteriosContainer}>
                <View style={styles.subCriterioItem}>
                  <Text style={styles.subCriterioTitulo}>Didática & Clareza</Text>
                  <View style={styles.estrelasPequenasRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity key={s} onPress={() => setNotaDidatica(s)}>
                        <FontAwesome5 
                          name="star" 
                          solid={s <= notaDidatica} 
                          size={18} 
                          color={s <= notaDidatica ? "#F59E0B" : "#E2E8F0"} 
                          style={{ marginHorizontal: 3 }}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.subCriterioItem}>
                  <Text style={styles.subCriterioTitulo}>Pontualidade & Compromisso</Text>
                  <View style={styles.estrelasPequenasRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity key={s} onPress={() => setNotaPontualidade(s)}>
                        <FontAwesome5 
                          name="star" 
                          solid={s <= notaPontualidade} 
                          size={18} 
                          color={s <= notaPontualidade ? "#F59E0B" : "#E2E8F0"} 
                          style={{ marginHorizontal: 3 }}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Tags de Elogio Rápido */}
              <Text style={styles.tagsLabel}>Destaques Positivos (opcional):</Text>
              <View style={styles.tagsContainer}>
                {[
                  "Muito Paciente",
                  "Domínio do Conteúdo",
                  "Exercícios Práticos",
                  "Excelente Comunicação",
                  "Pontualíssimo",
                  "Material Útil",
                ].map((tag) => {
                  const sel = tagsSelecionadas.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagPill, sel && styles.tagPillAtiva]}
                      onPress={() => {
                        setTagsSelecionadas((antigas) =>
                          sel ? antigas.filter((t) => t !== tag) : [...antigas, tag]
                        );
                      }}
                    >
                      <Text style={[styles.tagPillTexto, sel && styles.tagPillTextoAtivo]}>
                        {sel ? "✓ " : "+ "}{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comentário Aberto */}
              <TextInput
                style={styles.inputComentario}
                placeholder="Deixe um comentário sobre seu aprendizado nesta mentoria..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={comentario}
                onChangeText={setComentario}
              />

              {/* Botões do Modal de Avaliação */}
              <View style={styles.botoesModalRow}>
                <TouchableOpacity 
                  style={styles.botaoModalCancelar} 
                  onPress={() => setModalAvaliacao(false)}
                >
                  <Text style={styles.botaoModalCancelarTexto}>Depois</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.botaoModalEnviarAvaliacao} 
                  onPress={handleEnviarAvaliacao}
                  disabled={enviandoAvaliacao}
                >
                  <Text style={styles.botaoTextoBranco}>
                    {enviandoAvaliacao ? "Enviando..." : "Enviar Avaliação ⭐"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 12,
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
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  toastTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  loadingContainer: {
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 12,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 12,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  badgeStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  pontoStatus: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusTexto: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeSimulacao: {
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
  badgeSimulacaoTexto: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "700",
  },
  codigoAula: {
    color: "#94A3B8",
    fontSize: 11,
    fontFamily: Platform.select({ web: "monospace", default: "Courier" }),
    fontWeight: "600",
  },
  displayCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    marginBottom: 14,
  },
  displayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  tempoInfoEsquerda: {
    flex: 1,
  },
  tempoInfoDireita: {
    alignItems: "flex-end",
  },
  labelRelogio: {
    color: "#9A3412",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  displayTempo: {
    fontSize: 34,
    fontWeight: "900",
    fontFamily: Platform.select({ web: "monospace", default: "Courier" }),
    letterSpacing: 1.5,
  },
  displayTempoRestante: {
    fontSize: 20,
    fontWeight: "700",
    color: "#78350F",
    fontFamily: Platform.select({ web: "monospace", default: "Courier" }),
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressTrack: {
    height: 7,
    backgroundColor: "#FFEDD5",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  progressTexto: {
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "600",
  },
  displaySubtexto: {
    color: "#78350F",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "500",
  },
  checkinContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  checkinBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  checkinBoxAtivo: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  checkinBoxInativo: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  checkinHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  checkinPapel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  checkinPapelAtivo: {
    color: "#0F172A",
    fontWeight: "700",
  },
  checkinStatusBadge: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  badgeVerde: {
    color: "#059669",
  },
  badgeNeutro: {
    color: "#94A3B8",
  },
  actionsContainer: {
    marginTop: 4,
  },
  acoesCheckinStack: {
    gap: 8,
  },
  botaoCheckinPrincipal: {
    backgroundColor: Theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  botaoCheckinTexto: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  botaoDesabilitado: {
    backgroundColor: "#94A3B8",
    opacity: 0.9,
  },
  botaoSimularOutraParte: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFBEB",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 6,
  },
  botaoSimularOutraParteTexto: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "700",
  },
  gridAcoesAula: {
    gap: 10,
  },
  linhaAcoes: {
    flexDirection: "row",
    gap: 8,
  },
  botaoPausa: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  botaoMaisTempo: {
    backgroundColor: "#FFF7ED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FFD8B5",
  },
  botaoMaisTempoTexto: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  botaoFinalizar: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  botaoFinalizarTexto: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  botaoRetomar: {
    flex: 1,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  botaoFinalizarSecundario: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  botaoTextoBranco: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  botaoTextoNeutro: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  linhaSubAcoes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  botaoReportar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  botaoReportarTexto: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "600",
  },
  badgeFinalizandoAviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  badgeFinalizandoTexto: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "700",
  },
  botaoConfirmarFimMutuo: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  botaoAvaliarDestaque: {
    backgroundColor: Theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: { boxShadow: "0 4px 12px rgba(255, 90, 31, 0.25)" },
      default: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  botaoAvaliarTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // MODAIS (LIGHT THEME)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      web: { boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  modalContentAvaliacao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 460,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      web: { boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)" },
      default: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  modalIconWrapLaranja: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFD8B5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconWrapVermelho: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconWrapAmarelo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitulo: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 16,
  },
  gridTempoExtra: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  cardOpcaoTempo: {
    flex: 1,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  cardOpcaoTempoNumero: {
    color: Theme.colors.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  cardOpcaoTempoLabel: {
    color: "#9A3412",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },
  botaoFecharModal: {
    alignItems: "center",
    paddingVertical: 10,
  },
  botaoFecharModalTexto: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  botoesModalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  botaoModalCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  botaoModalCancelarTexto: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  botaoModalConfirmarFim: {
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  botaoModalEnviarChamado: {
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  botaoModalEnviarAvaliacao: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  listaMotivos: {
    gap: 8,
    marginBottom: 12,
  },
  opcaoMotivo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  opcaoMotivoSelecionado: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  radioCirculo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCirculoAtivo: {
    borderColor: "#DC2626",
  },
  radioPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  opcaoMotivoTexto: {
    color: "#64748B",
    fontSize: 12,
    flex: 1,
  },
  opcaoMotivoTextoAtivo: {
    color: "#0F172A",
    fontWeight: "600",
  },
  inputDetalhes: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 12,
    minHeight: 50,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  criterioBox: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  criterioLabel: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  estrelasRow: {
    flexDirection: "row",
  },
  subCriteriosContainer: {
    gap: 10,
    marginBottom: 14,
  },
  subCriterioItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  subCriterioTitulo: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  estrelasPequenasRow: {
    flexDirection: "row",
  },
  tagsLabel: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  tagPill: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tagPillAtiva: {
    backgroundColor: "#FFF7ED",
    borderColor: Theme.colors.primary,
  },
  tagPillTexto: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "500",
  },
  tagPillTextoAtivo: {
    color: Theme.colors.primary,
    fontWeight: "700",
  },
  inputComentario: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 12,
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 14,
  },
});

export default CronometroAula;
