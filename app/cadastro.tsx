/**
 * @file cadastro.tsx
 * @description Tela de Cadastro de Usuário do Orienta 2.0 [ORI-006].
 * 100% Fiel à referência visual IMG-012 (cadastro.png) e wallpaper IMG-020 (Plano_fundo_cadastro.jpeg).
 * 
 * Integrações:
 * - Wallpaper oficial de curvas suaves e claras (Assets.backgrounds.cadastro - IMG-020)
 * - Barra superior com botão voltar (Feather arrow-left) e Logotipo oficial centralizado (Assets.logo.transparent)
 * - Título "Crie sua conta" e subtítulo "Vamos começar! Preencha seus dados para continuar."
 * - Formulário estruturado com o componente universal Input:
 *   1. Nome completo (ícone user)
 *   2. E-mail (ícone mail, teclado email)
 *   3. CPF com máscara dinâmica (000.000.000-00, ícone credit-card)
 *   4. Data de nascimento com máscara (DD/MM/AAAA, ícone calendar duplo)
 *   5. Senha (ícone lock, alternador nativo de visibilidade, validação de força)
 *   6. Confirmar senha (ícone lock, alternador nativo de visibilidade)
 * - Botão primário "Criar conta ->" com LinearGradient institucional (#FF6A00 a #FF4500) e loading
 * - Divisor estético "ou"
 * - Botão social "Continuar com o Google" com ícone multicolorido oficial (Assets.icons.google)
 * - Rodapé "Já tem uma conta? Entrar" com navegação para /login
 * - Integração real com POST /api/v1/auth/cadastro e tratamento de conectividade
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../config/api";
import { Input, formatCPF, formatDate } from "../components/ui";
import { Assets } from "../constants/assets";
import { Theme } from "../constants/theme";

const { width: LARGURA_TELA, height: ALTURA_TELA } = Dimensions.get("window");

export default function CadastroScreen() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  // Validador estrito de força de senha
  const checarForcaSenha = (valor: string) => {
    const temMinimo = valor.length >= 8;
    const temMaiuscula = /[A-Z]/.test(valor);
    const temMinuscula = /[a-z]/.test(valor);
    const temNumero = /[0-9]/.test(valor);
    const temEspecial = /[^A-Za-z0-9]/.test(valor);
    return {
      temMinimo,
      temMaiuscula,
      temMinuscula,
      temNumero,
      temEspecial,
      ehForte: temMinimo && temMaiuscula && temMinuscula && temNumero && temEspecial,
    };
  };

  const executarCadastro = async () => {
    setFeedback(null);

    if (!nome.trim() || !email.trim() || !cpf.trim() || !dataNascimento.trim() || !senha.trim()) {
      const msg = "Por favor, preencha todos os campos do formulário.";
      setFeedback({ tipo: "erro", texto: msg });
      Alert.alert("Campos obrigatórios", msg);
      return;
    }

    const cpfLimpo = cpf.replace(/[^0-9]/g, "");
    if (cpfLimpo.length !== 11) {
      const msg = "Por favor, digite um CPF válido com 11 números.";
      setFeedback({ tipo: "erro", texto: msg });
      Alert.alert("CPF inválido", msg);
      return;
    }

    const forca = checarForcaSenha(senha);
    if (!forca.ehForte) {
      const pendencias: string[] = [];
      if (!forca.temMinimo) pendencias.push("mínimo de 8 caracteres");
      if (!forca.temMaiuscula) pendencias.push("uma letra maiúscula (A-Z)");
      if (!forca.temMinuscula) pendencias.push("uma letra minúscula (a-z)");
      if (!forca.temNumero) pendencias.push("um número (0-9)");
      if (!forca.temEspecial) pendencias.push("um caractere especial (!@#$...)");
      const msg = `Senha fraca. Sua senha deve conter: ${pendencias.join(", ")}.`;
      setFeedback({ tipo: "erro", texto: msg });
      Alert.alert("Senha fraca", msg);
      return;
    }

    if (senha !== confirmarSenha) {
      const msg = "A senha e a confirmação de senha não coincidem.";
      setFeedback({ tipo: "erro", texto: msg });
      Alert.alert("Confirmação incorreta", msg);
      return;
    }

    setCarregando(true);
    const emailNormalizado = email.trim().toLowerCase();

    try {
      let dataIso = dataNascimento;
      const partes = dataNascimento.split("/");
      if (partes.length === 3 && partes[2].length === 4) {
        dataIso = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }

      const urlDestino = `${API_URL}/api/v1/auth/cadastro`;
      const resposta = await fetch(urlDestino, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: emailNormalizado,
          cpf: cpfLimpo,
          dataNascimento: dataIso,
          senha,
          tipo: "ALUNO",
        }),
      });

      const corpo = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        setFeedback({
          tipo: "sucesso",
          texto: "Conta criada! Redirecionando para verificação de e-mail...",
        });

        try {
          router.push({
            pathname: "/verificar-email" as any,
            params: { email: emailNormalizado },
          });
        } catch {
          router.replace({
            pathname: "/verificar-email" as any,
            params: { email: emailNormalizado },
          });
        }
      } else {
        const mensagemErro =
          corpo.mensagem ||
          corpo.message ||
          corpo.error ||
          (corpo.errors ? Object.values(corpo.errors).join("") : "Falha ao criar conta no servidor.");
        setFeedback({ tipo: "erro", texto: mensagemErro });
        Alert.alert("Erro no cadastro", mensagemErro);
      }
    } catch {
      const urlAlvo = API_URL || "http://localhost:8080";
      const erroRede = `Não foi possível conectar ao servidor Spring Boot em ${urlAlvo}. Nenhuma conta foi criada.`;
      setFeedback({ tipo: "erro", texto: erroRede });
      Alert.alert("Erro de Conexão", erroRede);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={estilos.containerGeral}>
      {/* 1. Imagem de fundo oficial suave (Assets.backgrounds.cadastro - IMG-020) */}
      <Image
        source={Assets.backgrounds.cadastro}
        style={estilos.fundoAbsoluto}
        resizeMode="cover"
      />

      {/* 2. Conteúdo rolável independente com adaptação responsiva */}
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
              {/* Top Bar: Botão Voltar e Logotipo Centralizado */}
              <View style={estilos.cabecalhoTopo}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={estilos.btnVoltar}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar"
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

              {/* Título e Subtítulo */}
              <View style={estilos.areaTitulos}>
                <Text style={estilos.tituloPrincipal}>Crie sua conta</Text>
                <Text style={estilos.subtitulo}>
                  Vamos começar! Preencha seus dados para continuar.
                </Text>
              </View>

              {/* Formulário com os 6 campos idênticos a IMG-012 */}
              <View style={estilos.formulario}>
                {/* 1. Nome completo */}
                <Input
                  label="Nome completo"
                  placeholder="Digite seu nome completo"
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                  leftIcon={<Feather name="user" size={18} color="#64748B" />}
                  disabled={carregando}
                  accessibilityLabel="Campo de nome completo"
                  testID="cadastro-input-nome"
                />

                {/* 2. E-mail */}
                <Input
                  label="E-mail"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Feather name="mail" size={18} color="#64748B" />}
                  disabled={carregando}
                  accessibilityLabel="Campo de e-mail"
                  testID="cadastro-input-email"
                />

                {/* 3. CPF com máscara formatada */}
                <Input
                  label="CPF"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChangeText={(texto) => setCpf(formatCPF(texto))}
                  mask="cpf"
                  maxLength={14}
                  keyboardType="numeric"
                  leftIcon={<Feather name="credit-card" size={18} color="#64748B" />}
                  disabled={carregando}
                  accessibilityLabel="Campo de CPF"
                  testID="cadastro-input-cpf"
                />

                {/* 4. Data de nascimento com máscara formatada */}
                <Input
                  label="Data de nascimento"
                  placeholder="DD/MM/AAAA"
                  value={dataNascimento}
                  onChangeText={(texto) => setDataNascimento(formatDate(texto))}
                  mask="date"
                  maxLength={10}
                  keyboardType="numeric"
                  leftIcon={<Feather name="calendar" size={18} color="#64748B" />}
                  rightIcon={<Feather name="calendar" size={18} color="#94A3B8" />}
                  disabled={carregando}
                  accessibilityLabel="Campo de data de nascimento"
                  testID="cadastro-input-nascimento"
                />

                {/* 5. Senha com alternador de visibilidade */}
                <Input
                  label="Senha"
                  placeholder="Mínimo 8 caracteres"
                  value={senha}
                  onChangeText={setSenha}
                  isPassword
                  leftIcon={<Feather name="lock" size={18} color="#64748B" />}
                  disabled={carregando}
                  accessibilityLabel="Campo de senha"
                  testID="cadastro-input-senha"
                />

                {/* 6. Confirmar senha com alternador de visibilidade */}
                <Input
                  label="Confirmar senha"
                  placeholder="Repita sua senha"
                  value={confirmarSenha}
                  onChangeText={setConfirmarSenha}
                  isPassword
                  leftIcon={<Feather name="lock" size={18} color="#64748B" />}
                  disabled={carregando}
                  accessibilityLabel="Campo de confirmação de senha"
                  testID="cadastro-input-confirmar-senha"
                />

                {/* Banner de feedback inline (Erro ou Sucesso) */}
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

                {/* Botão Primário Laranja Degradê */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={executarCadastro}
                  disabled={carregando}
                  style={estilos.btnCriarContaWrapper}
                  accessibilityRole="button"
                  accessibilityLabel="Criar conta"
                >
                  <LinearGradient
                    colors={carregando ? ["#FDA4AF", "#FCA5A5"] : ["#FF6A00", "#FF4500"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={estilos.btnCriarConta}
                  >
                    {carregando ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={estilos.btnCriarContaConteudo}>
                        <Text style={estilos.txtCriarContaBtn}>Criar conta</Text>
                        <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divisor "ou" */}
                <View style={estilos.divisorContainer}>
                  <View style={estilos.linhaDivisor} />
                  <Text style={estilos.txtOu}>ou</Text>
                  <View style={estilos.linhaDivisor} />
                </View>

                {/* Botão Social Google */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => Alert.alert("Google OAuth", "Autenticação Google")}
                  style={estilos.btnGoogle}
                  accessibilityRole="button"
                  accessibilityLabel="Continuar com o Google"
                >
                  <Image
                    source={Assets.icons.google}
                    style={estilos.googleIcon}
                    resizeMode="contain"
                  />
                  <Text style={estilos.txtGoogle}>Continuar com o Google</Text>
                </TouchableOpacity>

                {/* Rodapé: Já tem uma conta? Entrar */}
                <View style={estilos.rodapeLogin}>
                  <Text style={estilos.txtJaTemConta}>Já tem uma conta?</Text>
                  <TouchableOpacity
                    onPress={() => router.push("/login" as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={estilos.txtEntrarLink}>Entrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    paddingBottom: 28,
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
  areaTitulos: {
    marginBottom: 20,
  },
  tituloPrincipal: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 20,
  },
  formulario: {
    gap: 12,
  },
  btnCriarContaWrapper: {
    borderRadius: 26,
    overflow: "hidden",
    marginTop: 6,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  btnCriarConta: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
  },
  btnCriarContaConteudo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  txtCriarContaBtn: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  divisorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  linhaDivisor: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  txtOu: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  btnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 26,
    height: 50,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  txtGoogle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  rodapeLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 6,
  },
  txtJaTemConta: {
    fontSize: 13,
    color: "#64748B",
  },
  txtEntrarLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  bannerFeedback: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
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
});