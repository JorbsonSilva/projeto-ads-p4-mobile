/**
 * @file verificar-email.tsx
 * @description Tela de Verificação de E-mail OTP em Duas Etapas do Orienta 2.0 [ORI-007].
 * 100% Fiel à referência visual IMG-018 e wallpaper suave IMG-020 (Assets.backgrounds.verificacao).
 * 
 * Especificações implementadas:
 * - Fundo suave orgânico com Assets.backgrounds.verificacao (IMG-020).
 * - Barra superior com botão voltar (Feather arrow-left) e Logotipo oficial transparente (Assets.logo.transparent).
 * - Ilustração moderna central do envelope aberto com insígnia @ laranja e raios solares radiantes (IMG-018).
 * - Título institucional "Verifique seu e-mail" e subtítulo destacando o e-mail do parâmetro de navegação.
 * - Seis caixas de código OTP numérico com foco automático, avanço sequencial, retorno ao apagar (Backspace),
 *   suporte a colar código completo e indicação visual de foco/preenchimento.
 * - Desabilitação e validação visual do botão de envio enquanto o código não tiver 6 dígitos.
 * - Botão principal "Verificar e-mail ->" com LinearGradient (#FF6A00 a #FF4500) e feedback de carregamento.
 * - Temporizador regressivo visível iniciando em 90 segundos (01:30) com reenvio ativo após zerar.
 * - Orientações de ajuda sobre pasta de spam e atalho para corrigir e-mail / voltar ao cadastro.
 * - Banner de feedback inline para códigos incorretos, expirados, falhas de conexão ou sucesso.
 * - Integração real com POST /api/v1/auth/verificar-email e POST /api/v1/auth/reenviar-codigo.
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../config/api";
import { Assets } from "../constants/assets";
import { Theme } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

const { width: LARGURA_TELA, height: ALTURA_TELA } = Dimensions.get("window");

export default function VerificarEmailScreen() {
  const { email = "usuario@orienta.edu.br" } = useLocalSearchParams<{ email?: string }>();
  const { loginGlobal } = (useAuth ? useAuth() : {}) as any;

  // Estado dos 6 dígitos OTP
  const [digitos, setDigitos] = useState<string[]>(["", "", "", "", "", ""]);
  const [indiceFocado, setIndiceFocado] = useState<number>(0);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [reenviando, setReenviando] = useState<boolean>(false);
  const [contaVerificada, setContaVerificada] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  // Timer regressivo iniciando em 90 segundos (01:30 conforme IMG-018)
  const [tempoRestante, setTempoRestante] = useState<number>(90);

  // Referências aos 6 inputs
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Inicializa o foco e o contador de reenvio
  useEffect(() => {
    const timerFocus = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 250);

    const intervalo = setInterval(() => {
      setTempoRestante((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(timerFocus);
      clearInterval(intervalo);
    };
  }, []);

  // Formatação do tempo MM:SS (ex: 01:30)
  const formatarTempo = (totalSegundos: number) => {
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  };

  // Código completo e validação de preenchimento
  const codigoCompleto = digitos.join("");
  const codigoEstaCompleto = codigoCompleto.length === 6;

  // Manipulação de texto em cada caixa OTP
  const handleMudarTexto = (texto: string, index: number) => {
    setFeedback(null);

    // Permite colar código com múltiplos dígitos (ex: "123456")
    const numerosLimpos = texto.replace(/[^0-9]/g, "");
    if (numerosLimpos.length > 1) {
      const novosDigitos = [...digitos];
      for (let i = 0; i < 6; i++) {
        novosDigitos[i] = numerosLimpos[i] || "";
      }
      setDigitos(novosDigitos);
      const proximoIndice = Math.min(numerosLimpos.length - 1, 5);
      inputRefs.current[proximoIndice]?.focus();
      return;
    }

    // Apenas um dígito numérico por caixa
    const digitoUnico = numerosLimpos.slice(-1);
    const novosDigitos = [...digitos];
    novosDigitos[index] = digitoUnico;
    setDigitos(novosDigitos);

    // Avança para o próximo campo automaticamente
    if (digitoUnico && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Manipulação da tecla Backspace para retorno ao campo anterior
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      setFeedback(null);
      if (!digitos[index] && index > 0) {
        const novosDigitos = [...digitos];
        novosDigitos[index - 1] = "";
        setDigitos(novosDigitos);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Navegação resiliente para tela de login
  const irParaLogin = () => {
    try {
      router.replace("/login" as any);
    } catch {
      try {
        router.push("/login" as any);
      } catch {
        if (typeof window !== "undefined" && window.location) {
          window.location.href = "/login";
        }
      }
    }
  };

  // Retorno ao fluxo de cadastro caso o usuário queira corrigir o e-mail
  const voltarParaCadastro = () => {
    try {
      router.back();
    } catch {
      router.replace("/cadastro" as any);
    }
  };

  // Chamada de verificação oficial no backend Spring Boot: POST /api/v1/auth/verificar-email
  const executarVerificacao = async () => {
    if (!codigoEstaCompleto) {
      const msg = "Por favor, digite todos os 6 números do código de verificação.";
      setFeedback({ tipo: "erro", texto: msg });
      Alert.alert("Código incompleto", msg);
      return;
    }

    setCarregando(true);
    setFeedback(null);

    const emailNormalizado = (email || "").trim().toLowerCase();

    try {
      const resposta = await fetch(`${API_URL}/api/v1/auth/verificar-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailNormalizado,
          codigo: codigoCompleto,
        }),
      });

      const corpo = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        const dados = corpo.dados || corpo.data || corpo;
        const token = dados.token || dados.accessToken;
        const usuario = dados.usuario || {};

        if (loginGlobal && token) {
          try {
            await loginGlobal(
              usuario.id || 1,
              usuario.tipo || usuario.papel || "ALUNO",
              usuario.nome || "Usuário",
              token
            );
          } catch (e) {
            console.warn("[VerificarEmail] loginGlobal warning:", e);
          }
        }

        setContaVerificada(true);
        setFeedback({
          tipo: "sucesso",
          texto: "E-mail verificado com sucesso! Redirecionando para o login...",
        });

        // Redirecionamento automático após confirmação
        setTimeout(() => {
          irParaLogin();
        }, 1500);
      } else {
        const msgErro =
          corpo.mensagem ||
          corpo.message ||
          corpo.error ||
          "Código de verificação incorreto ou expirado. Tente novamente ou solicite um novo código.";
        setFeedback({ tipo: "erro", texto: msgErro });
        Alert.alert("Erro na verificação", msgErro);
      }
    } catch {
      const urlAlvo = API_URL || "http://localhost:8080";
      const erroRede = `Não foi possível conectar ao servidor Spring Boot em ${urlAlvo}. Verifique sua conexão.`;
      setFeedback({ tipo: "erro", texto: erroRede });
      Alert.alert("Erro de Conexão", erroRede);
    } finally {
      setCarregando(false);
    }
  };

  // Reenvio de código no backend Spring Boot: POST /api/v1/auth/reenviar-codigo
  const executarReenvio = async () => {
    if (tempoRestante > 0) {
      Alert.alert(
        "Aguarde o temporizador",
        `Você poderá solicitar um novo código em ${formatarTempo(tempoRestante)}.`
      );
      return;
    }

    setReenviando(true);
    setFeedback(null);
    const emailNormalizado = (email || "").trim().toLowerCase();

    try {
      const resposta = await fetch(`${API_URL}/api/v1/auth/reenviar-codigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNormalizado }),
      });

      const corpo = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        setTempoRestante(90); // Reinicia o temporizador em 01:30
        setDigitos(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        const msgSucesso =
          corpo.mensagem || `Novo código de 6 dígitos enviado para ${emailNormalizado}.`;
        setFeedback({ tipo: "sucesso", texto: msgSucesso });
        Alert.alert("Código reenviado", msgSucesso);
      } else {
        const msgErro =
          corpo.mensagem ||
          corpo.message ||
          "Não foi possível reenviar o código neste momento. Tente novamente em instantes.";
        setFeedback({ tipo: "erro", texto: msgErro });
        Alert.alert("Falha no reenvio", msgErro);
      }
    } catch {
      const erroRede = "Não foi possível conectar ao servidor Spring Boot para reenviar o código.";
      setFeedback({ tipo: "erro", texto: erroRede });
      Alert.alert("Erro de Conexão", erroRede);
    } finally {
      setReenviando(false);
    }
  };

  // Dica explicativa sobre entrega de e-mail e spam
  const alertarSpam = () => {
    Alert.alert(
      "Dica sobre o e-mail",
      `O e-mail com o código de 6 dígitos foi encaminhado para:\n\n${email}\n\nEle costuma chegar em menos de 1 minuto. Verifique as pastas "Spam", "Lixo Eletrônico" ou a aba "Promoções" do seu aplicativo de e-mail.`,
      [{ text: "Entendido", style: "default" }]
    );
  };

  return (
    <View style={estilos.containerGeral}>
      {/* 1. Wallpaper oficial suave (Assets.backgrounds.verificacao - IMG-020) */}
      <Image
        source={Assets.backgrounds.verificacao}
        style={estilos.fundoAbsoluto}
        resizeMode="cover"
      />

      <SafeAreaView style={estilos.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={estilos.flexTotal}
        >
          <ScrollView
            contentContainerStyle={estilos.scrollConteudo}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={estilos.containerCentralizado}>
              {/* Top Bar: Botão Voltar (←) e Logotipo Orienta Centralizado */}
              <View style={estilos.cabecalhoTopo}>
                <TouchableOpacity
                  onPress={voltarParaCadastro}
                  style={estilos.btnVoltar}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar ao cadastro"
                >
                  <Feather name="arrow-left" size={24} color="#0F172A" />
                </TouchableOpacity>

                <View style={estilos.areaLogo}>
                  <Image
                    source={Assets.logo.transparent}
                    style={estilos.logoImg}
                    resizeMode="contain"
                    accessibilityLabel="Logotipo Orienta"
                  />
                </View>

                <View style={estilos.espacadorDireita} />
              </View>

              {/* Ilustração Central: Envelope de E-mail com insígnia @ e raios solares (IMG-018) */}
              <View style={estilos.areaIlustracao}>
                {/* Halo circular de iluminação âmbar de fundo */}
                <View style={estilos.haloIluminacaoFundo} />

                {/* Raios solares radiantes */}
                <View style={estilos.raioSuperiorEsquerdo} />
                <View style={estilos.raioSuperiorDireito1} />
                <View style={estilos.raioSuperiorDireito2} />
                <View style={estilos.raioMeioEsquerdo1} />
                <View style={estilos.raioMeioEsquerdo2} />

                {/* Cartão dobrado com o símbolo @ */}
                <View style={estilos.cartaoEnvelope}>
                  <View style={estilos.circuloArroba}>
                    <Text style={estilos.simboloArroba}>@</Text>
                  </View>
                </View>

                {/* Corpo e dobras do envelope laranja */}
                <View style={estilos.corpoEnvelope}>
                  <View style={estilos.abaEsquerdaEnvelope} />
                  <View style={estilos.abaDireitaEnvelope} />
                </View>
              </View>

              {/* Título e Subtítulo Principal com destaque do E-mail */}
              <View style={estilos.areaTextos}>
                <Text style={estilos.tituloPrincipal}>Verifique seu e-mail</Text>
                <Text style={estilos.subtitulo}>
                  Enviamos um código de 6 dígitos para o seu e-mail:
                </Text>
                <View style={estilos.badgeEmailDestino}>
                  <Feather name="mail" size={14} color="#EA580C" style={{ marginRight: 6 }} />
                  <Text style={estilos.textoEmailDestino} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
                <Text style={estilos.subtituloInstrucao}>
                  Digite o código abaixo para continuar com o seu cadastro.
                </Text>
              </View>

              {/* As 6 Caixas de Dígitos OTP */}
              <View style={estilos.containerOtp}>
                {digitos.map((digito, idx) => {
                  const estaFocado = indiceFocado === idx;
                  const temValor = Boolean(digito);

                  return (
                    <View
                      key={idx}
                      style={[
                        estilos.caixaOtp,
                        estaFocado && estilos.caixaOtpFocada,
                        temValor && estilos.caixaOtpPreenchida,
                      ]}
                    >
                      <TextInput
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        style={estilos.textoInputOtp}
                        value={digito}
                        onChangeText={(val) => handleMudarTexto(val, idx)}
                        onKeyPress={(e) => handleKeyPress(e, idx)}
                        onFocus={() => setIndiceFocado(idx)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        cursorColor="#FF6A00"
                        accessibilityLabel={`Dígito ${idx + 1} de 6 do código de verificação`}
                      />
                      {estaFocado && !temValor && (
                        <View style={estilos.cursorCaret} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Temporizador Regressivo e Reenvio de Código */}
              <View style={estilos.areaTimer}>
                <Feather name="clock" size={16} color="#FF6A00" style={estilos.iconeRelogio} />
                {tempoRestante > 0 ? (
                  <Text style={estilos.textoTimer}>
                    Reenviar código em{" "}
                    <Text style={estilos.textoTempoDestaque}>{formatarTempo(tempoRestante)}</Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={executarReenvio}
                    disabled={reenviando}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Reenviar código agora"
                  >
                    <Text style={estilos.textoReenviarAtivo}>
                      {reenviando ? "Reenviando código..." : "Reenviar código agora"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Orientações sobre Spam e Opção de Corrigir E-mail */}
              <View style={estilos.areaSuporte}>
                <View style={estilos.linhaSuporte}>
                  <Text style={estilos.textoNaoRecebeu}>Não recebeu o e-mail?</Text>
                  <TouchableOpacity onPress={alertarSpam} activeOpacity={0.7}>
                    <Text style={estilos.linkSpam}>Verifique sua caixa de spam</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={voltarParaCadastro}
                  activeOpacity={0.7}
                  style={estilos.btnCorrigirEmail}
                >
                  <Feather name="edit-2" size={12} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoCorrigirEmail}>E-mail digitado errado? Corrigir</Text>
                </TouchableOpacity>
              </View>

              {/* Banner de Feedback Inline */}
              {feedback && (
                <View
                  style={[
                    estilos.bannerFeedback,
                    feedback.tipo === "sucesso" ? estilos.bannerSucesso : estilos.bannerErro,
                  ]}
                >
                  <Feather
                    name={feedback.tipo === "sucesso" ? "check-circle" : "alert-circle"}
                    size={18}
                    color={feedback.tipo === "sucesso" ? "#16A34A" : "#DC2626"}
                    style={estilos.iconeFeedback}
                  />
                  <Text
                    style={[
                      estilos.txtBannerFeedback,
                      feedback.tipo === "sucesso" ? estilos.txtBannerSucesso : estilos.txtBannerErro,
                    ]}
                  >
                    {feedback.texto}
                  </Text>
                </View>
              )}

              {/* Botão de Ação Primário ou Card de Sucesso */}
              {contaVerificada ? (
                <View style={estilos.cardSucessoVerificacao}>
                  <View style={estilos.circuloCheckSucesso}>
                    <Feather name="check" size={26} color="#FFFFFF" />
                  </View>
                  <Text style={estilos.tituloSucesso}>Conta ativada com sucesso!</Text>
                  <Text style={estilos.subtituloSucesso}>
                    Seu cadastro foi concluído no Orienta. Redirecionando para o login...
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={irParaLogin}
                    style={estilos.btnIrLogin}
                    accessibilityRole="button"
                    accessibilityLabel="Ir para a tela de login"
                  >
                    <Text style={estilos.txtIrLogin}>Ir para a tela de Login</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={executarVerificacao}
                  disabled={carregando || !codigoEstaCompleto}
                  style={[
                    estilos.btnVerificarWrapper,
                    !codigoEstaCompleto && estilos.btnVerificarDesabilitado,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Verificar e-mail"
                >
                  <LinearGradient
                    colors={
                      carregando
                        ? ["#FDA4AF", "#FCA5A5"]
                        : !codigoEstaCompleto
                        ? ["#CBD5E1", "#94A3B8"]
                        : ["#FF6A00", "#FF4500"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={estilos.btnVerificar}
                  >
                    {carregando ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={estilos.btnConteudo}>
                        <Text style={estilos.txtVerificarBtn}>Verificar e-mail</Text>
                        <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const estilos = StyleSheet.create({
  containerGeral: {
    flex: 1,
    backgroundColor: "#FDFBF9",
  },
  fundoAbsoluto: {
    position: "absolute",
    top: 0,
    left: 0,
    width: LARGURA_TELA,
    height: ALTURA_TELA,
  },
  safeArea: {
    flex: 1,
  },
  flexTotal: {
    flex: 1,
  },
  scrollConteudo: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  containerCentralizado: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  cabecalhoTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: Platform.OS === "android" ? 10 : 4,
  },
  btnVoltar: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  areaLogo: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: {
    width: 120,
    height: 44,
  },
  espacadorDireita: {
    width: 40,
  },
  areaIlustracao: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    marginVertical: 8,
    position: "relative",
  },
  haloIluminacaoFundo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 237, 213, 0.6)",
  },
  raioSuperiorEsquerdo: {
    position: "absolute",
    top: 24,
    left: "22%",
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "35deg" }],
  },
  raioSuperiorDireito1: {
    position: "absolute",
    top: 22,
    right: "34%",
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "-40deg" }],
  },
  raioSuperiorDireito2: {
    position: "absolute",
    top: 36,
    right: "26%",
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "-20deg" }],
  },
  raioMeioEsquerdo1: {
    position: "absolute",
    top: 72,
    left: "14%",
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "6deg" }],
  },
  raioMeioEsquerdo2: {
    position: "absolute",
    top: 94,
    left: "17%",
    width: 15,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "24deg" }],
  },
  cartaoEnvelope: {
    width: 136,
    height: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: -38,
    zIndex: 1,
  },
  circuloArroba: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 106, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FF6A00",
  },
  simboloArroba: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FF6A00",
    marginTop: -2,
  },
  corpoEnvelope: {
    width: 168,
    height: 80,
    backgroundColor: "#FF7700",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 2,
  },
  abaEsquerdaEnvelope: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 88,
    height: 80,
    backgroundColor: "#FF6200",
    transform: [{ skewX: "32deg" }],
    borderTopRightRadius: 16,
  },
  abaDireitaEnvelope: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 88,
    height: 80,
    backgroundColor: "#FF8C1A",
    transform: [{ skewX: "-32deg" }],
    borderTopLeftRadius: 16,
  },
  areaTextos: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  tituloPrincipal: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  badgeEmailDestino: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    maxWidth: "90%",
  },
  textoEmailDestino: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EA580C",
  },
  subtituloInstrucao: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 6,
    textAlign: "center",
  },
  containerOtp: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 14,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  caixaOtp: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  caixaOtpFocada: {
    borderColor: "#FF6A00",
    borderWidth: 2,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  caixaOtpPreenchida: {
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  textoInputOtp: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    padding: 0,
  },
  cursorCaret: {
    position: "absolute",
    width: 2,
    height: 22,
    backgroundColor: "#FF6A00",
    borderRadius: 1,
  },
  areaTimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  iconeRelogio: {
    marginRight: 6,
  },
  textoTimer: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  textoTempoDestaque: {
    color: "#EA580C",
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  textoReenviarAtivo: {
    fontSize: 13,
    color: "#EA580C",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  areaSuporte: {
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  linhaSuporte: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  textoNaoRecebeu: {
    fontSize: 12,
    color: "#64748B",
  },
  linkSpam: {
    fontSize: 12,
    color: "#EA580C",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  btnCorrigirEmail: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  textoCorrigirEmail: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  btnVerificarWrapper: {
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 4,
  },
  btnVerificarDesabilitado: {
    shadowOpacity: 0.05,
    elevation: 1,
  },
  btnVerificar: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
  },
  btnConteudo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  txtVerificarBtn: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  bannerFeedback: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  bannerSucesso: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  bannerErro: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  iconeFeedback: {
    marginRight: 8,
    marginTop: 1,
  },
  txtBannerFeedback: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  txtBannerSucesso: {
    color: "#166534",
  },
  txtBannerErro: {
    color: "#991B1B",
  },
  cardSucessoVerificacao: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  circuloCheckSucesso: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tituloSucesso: {
    fontSize: 18,
    fontWeight: "800",
    color: "#14532D",
    marginBottom: 6,
    textAlign: "center",
  },
  subtituloSucesso: {
    fontSize: 13,
    color: "#166534",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },
  btnIrLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6A00",
    borderRadius: 26,
    height: 50,
    paddingHorizontal: 24,
    width: "100%",
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  txtIrLogin: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});