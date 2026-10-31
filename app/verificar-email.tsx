// app/verificar-email.tsx - 100% Fiel à Tela Alvo Enviada (Orienta Mobile)
// Integração completa com o backend Spring Boot: POST /api/v1/auth/verificar-email e POST /api/v1/auth/reenviar-codigo
import { Feather } from "@expo/vector-icons";
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
import { useAuth } from "../context/AuthContext";

const { width: LARGURA_TELA, height: ALTURA_TELA } = Dimensions.get("window");

export default function VerificarEmailScreen() {
  const { email = "usuario@orienta.edu.br" } = useLocalSearchParams<{ email?: string }>();
  const { loginGlobal } = (useAuth ? useAuth() : {}) as any;

  // Estado para os 6 dígitos do código OTP
  const [digitos, setDigitos] = useState<string[]>(["", "", "", "", "", ""]);
  const [indiceFocado, setIndiceFocado] = useState<number>(0);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [reenviando, setReenviando] = useState<boolean>(false);
  const [contaVerificada, setContaVerificada] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  // Navegação resiliente com suporte a Expo Router e Web Browser
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

  const irParaHome = () => {
    try {
      router.replace("/(tabs)" as any);
    } catch {
      try {
        router.replace("/" as any);
      } catch {
        if (typeof window !== "undefined" && window.location) {
          window.location.href = "/";
        }
      }
    }
  };

  // Timer regressivo iniciando em 90 segundos (01:30) conforme a tela enviada
  const [tempoRestante, setTempoRestante] = useState<number>(90);

  // Referências para navegação automática entre as 6 caixas de texto
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Foca na primeira caixa ao montar a tela
    inputRefs.current[0]?.focus();

    // Contador regressivo a cada 1 segundo
    const intervalo = setInterval(() => {
      setTempoRestante((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // Formatação do tempo no padrão "MM:SS" (ex: 01:30)
  const formatarTempo = (totalSegundos: number) => {
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  };

  // Manipulação da digitação em cada caixa OTP
  const handleMudarTexto = (texto: string, index: number) => {
    // Trata colagem de código completo de 6 dígitos
    const numerosLimpos = texto.replace(/[^0-9]/g, "");
    if (numerosLimpos.length > 1) {
      const novosDigitos = [...digitos];
      for (let i = 0; i < 6; i++) {
        novosDigitos[i] = numerosLimpos[i] || "";
      }
      setDigitos(novosDigitos);
      const proximo = Math.min(numerosLimpos.length, 5);
      inputRefs.current[proximo]?.focus();
      return;
    }

    const valor = numerosLimpos.slice(-1);
    const novosDigitos = [...digitos];
    novosDigitos[index] = valor;
    setDigitos(novosDigitos);

    if (valor && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Manipulação do botão backspace para retorno automático
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !digitos[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Chamada de verificação com a API Spring Boot (POST /api/v1/auth/verificar-email)
  const executarVerificacao = async () => {
    const codigoCompleto = digitos.join("");
    if (codigoCompleto.length !== 6) {
      Alert.alert(
        "Código incompleto",
        "Por favor, digite todos os 6 números enviados para o seu e-mail."
      );
      return;
    }

    setCarregando(true);
    try {
      const emailNormalizado = email.trim().toLowerCase();
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
          texto: "E-mail ativado com sucesso! Redirecionando para o login...",
        });

        // Redirecionamento automático com fallback garantido
        setTimeout(() => {
          irParaLogin();
        }, 1200);
      } else {
        const msgErro =
          corpo.mensagem ||
          corpo.message ||
          corpo.error ||
          "Código de verificação incorreto ou expirado.";
        setFeedback({ tipo: "erro", texto: msgErro });
        Alert.alert("Erro na verificação", msgErro);
      }
    } catch (err: any) {
      console.error("[VerificarEmail] Erro na requisição:", err);
      const erroRede = `Não foi possível conectar ao servidor Spring Boot em ${API_URL || "localhost:8080"}.`;
      setFeedback({ tipo: "erro", texto: erroRede });
      Alert.alert("Erro de Conexão", erroRede);
    } finally {
      setCarregando(false);
    }
  };

  // Chamada de reenvio com a API Spring Boot (POST /api/v1/auth/reenviar-codigo)
  const executarReenvio = async () => {
    if (tempoRestante > 0) {
      Alert.alert(
        "Aguarde o tempo restante",
        `Você poderá solicitar um novo código em ${formatarTempo(tempoRestante)}.`
      );
      return;
    }

    setReenviando(true);
    try {
      const emailNormalizado = email.trim().toLowerCase();
      const resposta = await fetch(`${API_URL}/api/v1/auth/reenviar-codigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNormalizado }),
      });

      const corpo = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        setTempoRestante(90); // Reinicia o timer em 01:30
        setDigitos(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        Alert.alert(
          "Código reenviado",
          corpo.mensagem || `Um novo código de 6 dígitos foi enviado para ${emailNormalizado}.`
        );
      } else {
        Alert.alert(
          "Falha no reenvio",
          corpo.mensagem || corpo.message || "Não foi possível reenviar o código."
        );
      }
    } catch {
      Alert.alert("Erro de Conexão", "Não foi possível contatar o servidor Spring Boot.");
    } finally {
      setReenviando(false);
    }
  };

  const alertarSpam = () => {
    Alert.alert(
      "Dica de Recebimento",
      "O e-mail com o código de 6 dígitos pode levar até 1 minuto para ser entregue. Verifique a pasta 'Spam', 'Lixo Eletrônico' ou a aba 'Promoções' do seu provedor.",
      [{ text: "Entendido", style: "default" }]
    );
  };

  return (
    <View style={estilos.containerGeral}>
      {/* 1. Detalhes de curvas âmbar nos cantos (Identidade Visual Orienta) */}
      <View style={estilos.curvaSuperiorEsquerda} />
      <View style={estilos.curvaInferiorDireita} />
      <View style={estilos.curvaInferiorEsquerda} />

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
            {/* Top Bar: Botão Voltar (←) e Logotipo Orienta Centralizado */}
            <View style={estilos.cabecalhoTopo}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={estilos.btnVoltar}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="arrow-left" size={24} color="#0F172A" />
              </TouchableOpacity>

              <View style={estilos.areaLogo}>
                <Image
                  source={require("../assets/images/logo.png")}
                  style={estilos.logoImg}
                  resizeMode="contain"
                />
              </View>

              <View style={estilos.espacadorDireita} />
            </View>

            {/* Ilustração Central: Envelope de E-mail com insígnia @ e raios solares */}
            <View style={estilos.areaIlustracao}>
              {/* Halo circular de iluminação âmbar suave de fundo */}
              <View style={estilos.haloIluminacaoFundo} />

              {/* Raios solares radiantes */}
              <View style={estilos.raioSuperiorEsquerdo} />
              <View style={estilos.raioSuperiorDireito1} />
              <View style={estilos.raioSuperiorDireito2} />
              <View style={estilos.raioMeioEsquerdo1} />
              <View style={estilos.raioMeioEsquerdo2} />

              {/* Carta dobrada com o símbolo @ */}
              <View style={estilos.cartaoEnvelope}>
                <View style={estilos.circuloArroba}>
                  <Text style={estilos.simboloArroba}>@</Text>
                </View>
              </View>

              {/* Corpo e abas do envelope laranja */}
              <View style={estilos.corpoEnvelope}>
                {/* Dobras angulares do envelope */}
                <View style={estilos.abaEsquerdaEnvelope} />
                <View style={estilos.abaDireitaEnvelope} />
              </View>
            </View>

            {/* Título e Subtítulo Principal */}
            <View style={estilos.areaTextos}>
              <Text style={estilos.tituloPrincipal}>Verifique seu e-mail</Text>
              <Text style={estilos.subtitulo}>
                Enviamos um código de 6 dígitos para o seu e-mail. Digite o código abaixo para continuar com o seu cadastro.
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
                      ref={(el) => {  inputRefs.current[idx] = el;
}}
                      style={estilos.textoInputOtp}
                      value={digito}
                      onChangeText={(val) => handleMudarTexto(val, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      onFocus={() => setIndiceFocado(idx)}
                      keyboardType="numeric"
                      maxLength={1}
                      selectTextOnFocus
                      cursorColor="#FF6A00"
                    />
                    {estaFocado && !temValor && (
                      <View style={estilos.cursorCaret} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Timer Regressivo e Reenvio de Código */}
            <View style={estilos.areaTimer}>
              <Feather name="clock" size={17} color="#FF6A00" style={estilos.iconeRelogio} />
              {tempoRestante > 0 ? (
                <Text style={estilos.textoTimer}>
                  Reenviar código em{" "}
                  <Text style={estilos.textoTempoDestaque}>{formatarTempo(tempoRestante)}</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={executarReenvio} disabled={reenviando}>
                  <Text style={estilos.textoReenviarAtivo}>
                    {reenviando ? "Reenviando código..." : "Reenviar código agora"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Texto de Ajuda: Não recebeu o e-mail? Verifique sua caixa de spam */}
            <View style={estilos.areaSpam}>
              <Text style={estilos.textoNaoRecebeu}>Não recebeu o e-mail?</Text>
              <TouchableOpacity onPress={alertarSpam} activeOpacity={0.7}>
                <Text style={estilos.linkSpam}>Verifique sua caixa de spam</Text>
              </TouchableOpacity>
            </View>

            {/* Banner de feedback inline */}
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
                  style={{ marginRight: 8, marginTop: 1 }}
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
                >
                  <Text style={estilos.txtIrLogin}>Ir para a tela de Login</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={executarVerificacao}
                disabled={carregando}
                style={estilos.btnVerificarWrapper}
              >
                <View style={estilos.btnVerificar}>
                  {carregando ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={estilos.btnConteudo}>
                      <Text style={estilos.txtVerificarBtn}>Verificar e-mail</Text>
                      <Feather name="arrow-right" size={19} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
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
  curvaSuperiorEsquerda: {
    position: "absolute",
    top: -60,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 122, 0, 0.18)",
  },
  curvaInferiorDireita: {
    position: "absolute",
    bottom: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255, 106, 0, 0.22)",
  },
  curvaInferiorEsquerda: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255, 160, 32, 0.14)",
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
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  cabecalhoTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
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
    width: 140,
    height: 44,
  },
  espacadorDireita: {
    width: 40,
  },
  areaIlustracao: {
    alignItems: "center",
    justifyContent: "center",
    height: 190,
    marginVertical: 10,
    position: "relative",
  },
  haloIluminacaoFundo: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255, 226, 194, 0.55)",
  },
  raioSuperiorEsquerdo: {
    position: "absolute",
    top: 26,
    left: "22%",
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "35deg" }],
  },
  raioSuperiorDireito1: {
    position: "absolute",
    top: 24,
    right: "34%",
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "-40deg" }],
  },
  raioSuperiorDireito2: {
    position: "absolute",
    top: 38,
    right: "26%",
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "-20deg" }],
  },
  raioMeioEsquerdo1: {
    position: "absolute",
    top: 76,
    left: "14%",
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "6deg" }],
  },
  raioMeioEsquerdo2: {
    position: "absolute",
    top: 98,
    left: "17%",
    width: 15,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFB03A",
    transform: [{ rotate: "24deg" }],
  },
  cartaoEnvelope: {
    width: 142,
    height: 108,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: -42,
    zIndex: 1,
  },
  circuloArroba: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 106, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FF6A00",
  },
  simboloArroba: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FF6A00",
    marginTop: -2,
  },
  corpoEnvelope: {
    width: 172,
    height: 84,
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
    width: 90,
    height: 84,
    backgroundColor: "#FF6200",
    transform: [{ skewX: "32deg" }],
    borderTopRightRadius: 16,
  },
  abaDireitaEnvelope: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 90,
    height: 84,
    backgroundColor: "#FF8C1A",
    transform: [{ skewX: "-32deg" }],
    borderTopLeftRadius: 16,
  },
  areaTextos: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 24,
  },
  tituloPrincipal: {
    fontSize: 25,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  containerOtp: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 18,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  caixaOtpFocada: {
    borderColor: "#FF6A00",
    borderWidth: 2,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
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
    marginTop: 14,
    marginBottom: 18,
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
  areaSpam: {
    alignItems: "center",
    marginBottom: 26,
    gap: 3,
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
  btnVerificarWrapper: {
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#FF6A00",
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  btnVerificar: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF6A00",
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
    marginBottom: 16,
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
    borderRadius: 24,
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