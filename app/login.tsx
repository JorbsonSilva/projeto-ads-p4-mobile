// app/login.tsx - 100% Fiel à Tela Alvo Enviada (Orienta Mobile)
// Utilizando exatamente as imagens enviadas por você em assets/images/:
// 1. Plano_fundo.jpeg - Wallpaper oficial das ondas orgânicas âmbar
// 2. logo.png         - Logotipo oficial Orienta com fundo transparente
// 3. google.png       - Ícone multicolorido oficial do Google
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
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
import { useAuth } from "../context/AuthContext";
import { Input, formatCPF } from "../components/ui";
import { Assets } from "../constants/assets";

export default function LoginScreen() {
  const { loginGlobal } = useAuth() as any;
  const [emailOrCpf, setEmailOrCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const [erroEmailOrCpf, setErroEmailOrCpf] = useState<string | undefined>(undefined);
  const [erroSenha, setErroSenha] = useState<string | undefined>(undefined);

  const isDemo =
    typeof window !== "undefined" &&
    (window.location.search.includes("demo=true") ||
      window.location.search.includes("preview=true"));

  const executarLogin = async () => {
    setErroConexao(null);
    let temErro = false;

    if (!emailOrCpf.trim()) {
      setErroEmailOrCpf("Informe seu e-mail ou CPF cadastrado.");
      temErro = true;
    } else {
      setErroEmailOrCpf(undefined);
    }

    if (!senha.trim()) {
      setErroSenha("A senha de acesso é obrigatória.");
      temErro = true;
    } else {
      setErroSenha(undefined);
    }

    if (temErro) {
      return;
    }


    setCarregando(true);
    try {
      const resposta = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailOrCpf.trim(), senha }),
      });

      if (resposta.ok) {
        const corpo = await resposta.json();
        const payload = corpo.data || corpo;
        const usuario = payload.usuario || payload;
        const token = payload.token || payload.accessToken;
        const usuarioId = usuario.id || usuario.usuarioId;
        const perfil = usuario.tipo || usuario.perfil || "ALUNO";
        const nome = usuario.nome || "";
        if (loginGlobal) {
          await loginGlobal(usuarioId, perfil, nome, token);
        }
        router.replace("/(tabs)");
      } else {
        const erro = await resposta.json().catch(() => ({}));
        Alert.alert("Erro de autenticação", erro.message || "Credenciais inválidas.");
      }
    } catch {
      setErroConexao(
        "Servidor Spring Boot indisponível (http://localhost:8080). Nenhuma conta real foi autenticada."
      );
      Alert.alert(
        "API Indisponível",
        "Não foi possível conectar ao servidor Spring Boot em http://localhost:8080. Para visualizar as telas sem backend, utilize o Modo de Visualização no Dashboard."
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    // 1. O plano de fundo cobre a tela INTEIRA do celular (Assets.backgrounds.login - IMG-019)
    <ImageBackground
      source={Assets.backgrounds.login}
      style={estilos.fundoTotal}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={estilos.flexTotal}
      >
        {/* 2. ScrollView envolvendo todo o conteúdo: o cabeçalho rola junto com o form, sem ficar fixo cobrindo os campos */}
        <ScrollView
          contentContainerStyle={estilos.scrollConteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* 3. Cabeçalho com Logo ampliado em destaque e Halo de Luz para contraste */}
          <SafeAreaView edges={["top"]} style={estilos.areaCabecalho}>
            <View style={estilos.haloIluminacao}>
              <Image
                source={Assets.logo.transparent}
                style={estilos.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={estilos.sloganTexto}>Seu futuro com{" "}as melhores escolhas.</Text>
          </SafeAreaView>

          {/* 4. Cartão Branco Curvo Flutuante (não vai até o final para que o fundo apareça no rodapé) */}
          <View style={estilos.cartaoBranco}>
            <Text style={estilos.tituloBemVindo}>Bem-vindo de volta!</Text>
            <Text style={estilos.subtituloCartao}>Faça login para continuar sua jornada.</Text>

            {/* Input E-mail ou CPF com Ícone e Máscara Dinâmica */}
            <Input
              label="E-mail ou CPF"
              placeholder="exemplo@email.com ou 000.000.000-00"
              value={emailOrCpf}
              onChangeText={(texto) => {
                setErroEmailOrCpf(undefined);
                const apenasDigitos = texto.replace(/\D/g, "");
                if (apenasDigitos.length > 0 && !texto.includes("@") && !/[a-zA-Z]/.test(texto)) {
                  setEmailOrCpf(formatCPF(texto));
                } else {
                  setEmailOrCpf(texto);
                }
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Feather name="user" size={18} color="#64748B" />}
              error={erroEmailOrCpf}
              disabled={carregando}
              accessibilityLabel="Campo de e-mail ou CPF"
              testID="login-input-email-cpf"
            />

            {/* Input Senha com Alternador de Visibilidade e Ícone */}
            <Input
              label="Senha"
              placeholder="Digite sua senha de acesso"
              value={senha}
              onChangeText={(texto) => {
                setSenha(texto);
                setErroSenha(undefined);
              }}
              isPassword
              leftIcon={<Feather name="lock" size={18} color="#64748B" />}
              error={erroSenha}
              disabled={carregando}
              accessibilityLabel="Campo de senha"
              testID="login-input-senha"
            />

            {/* Link Esqueceu sua senha? */}
            <TouchableOpacity
              onPress={() => router.push("/esqueci-senha" as any)}
              style={estilos.linkEsqueceuSenha}
            >
              <Text style={estilos.txtEsqueceuSenha}>Esqueceu sua senha?</Text>
            </TouchableOpacity>

            {/* Aviso visual de API Offline */}
            {erroConexao && (
              <View
                style={{
                  backgroundColor: "#FEF2F2",
                  borderWidth: 1,
                  borderColor: "#FCA5A5",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    color: "#B91C1C",
                    fontSize: 12,
                    fontWeight: "600",
                    textAlign: "center",
                    lineHeight: 16,
                  }}
                >
                  {erroConexao}
                </Text>
              </View>
            )}

            {/* Identificador de Modo Demonstração */}
            {isDemo && (
              <View
                style={{
                  backgroundColor: "#ECFDF5",
                  borderWidth: 1,
                  borderColor: "#A7F3D0",
                  borderRadius: 10,
                  padding: 8,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    color: "#047857",
                    fontSize: 11,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  Modo de Demonstração Ativo (Visualização Sem API)
                </Text>
              </View>
            )}

            {/* Botão Primário Laranja Degradê */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={executarLogin}
              disabled={carregando}
              style={estilos.btnEntrarWrapper}
            >
              <View style={estilos.btnEntrar}>
                {carregando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={estilos.btnEntrarConteudo}>
                    <Text style={estilos.txtEntrar}>Entrar</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Divisor "ou" */}
            <View style={estilos.divisorContainer}>
              <View style={estilos.linhaDivisor} />
              <Text style={estilos.txtOu}>ou</Text>
              <View style={estilos.linhaDivisor} />
            </View>

            {/* Botão Social Google com Ícone Oficial (google.png) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => Alert.alert("Google OAuth", "Autenticação Google")}
              style={estilos.btnGoogle}
            >
              <Image
                source={Assets.icons.google}
                style={estilos.googleIcon}
                resizeMode="contain"
              />
              <Text style={estilos.txtGoogle}>Continuar com o Google</Text>
            </TouchableOpacity>

            {/* Rodapé Criar Conta */}
            <View style={estilos.rodapeCadastro}>
              <Text style={estilos.txtAindaNao}>Ainda não tem uma conta?</Text>
              <TouchableOpacity onPress={() => router.push("/cadastro" as any)}>
                <Text style={estilos.txtCriarConta}>Criar conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const estilos = StyleSheet.create({
  fundoTotal: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  flexTotal: {
    flex: 1,
  },
  scrollConteudo: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  areaCabecalho: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "android" ? 28 : 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  haloIluminacao: {
    width: 200,
    height: 200,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.12)", // Iluminação suave que destaca o logo
    alignItems: "center",
    marginTop: 20,
    justifyContent: "center",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    marginVertical: 4,
  },
  logoImg: {
    width: 460,
    height: 300,
    resizeMode: "contain",
  },
  sloganTexto: {
    fontSize: 25,
    color: "#2D3748",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600",
    lineHeight: 18,
  },
  cartaoBranco: {
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 28, // Garante que as ondas de Plano_fundo.jpeg apareçam na base!
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  tituloBemVindo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  subtituloCartao: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 20,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  inputIconeEsquerda: { marginRight: 10 },
  inputTexto: { flex: 1, fontSize: 14, color: "#0F172A" },
  iconeOlho: { padding: 4 },
  linkEsqueceuSenha: { alignSelf: "flex-end", marginTop: 2, marginBottom: 18 },
  txtEsqueceuSenha: { fontSize: 12, fontWeight: "600", color: "#EA580C" },
  btnEntrarWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 18,
    backgroundColor: "#FF6A00",
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  btnEntrar: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF6A00",
    borderRadius: 24,
  },
  btnEntrarConteudo: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  txtEntrar: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  divisorContainer: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  linhaDivisor: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  txtOu: { marginHorizontal: 12, fontSize: 12, color: "#94A3B8" },
  btnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    height: 48,
    backgroundColor: "#FFFFFF",
    marginBottom: 22,
  },
  googleIcon: { width: 20, height: 20, marginRight: 10 },
  txtGoogle: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  rodapeCadastro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 6,
  },
  txtAindaNao: { fontSize: 13, color: "#64748B" },
  txtCriarConta: { fontSize: 13, fontWeight: "700", color: "#EA580C" },
});