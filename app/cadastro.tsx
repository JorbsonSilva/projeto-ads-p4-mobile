// app/cadastro.tsx - 100% Fiel à Tela Alvo Enviada (Orienta Mobile)
// Utilizando os assets oficiais de imagem em assets/images/ (logo.png, google.png)
import { Feather, Ionicons } from "@expo/vector-icons";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../config/api";
import { Input } from "../components/ui";
import { Assets } from "../constants/assets";

const { width: LARGURA_TELA, height: ALTURA_TELA } = Dimensions.get("window");

export default function CadastroScreen() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  // 1. Máscara Robusta de CPF (000.000.000-00) usando [^0-9] sem barras invertidas
  const formatarCpf = (valor: string) => {
    const apenasNumeros = valor.replace(/[^0-9]/g, "").slice(0, 11);
    if (apenasNumeros.length <= 3) return apenasNumeros;
    if (apenasNumeros.length <= 6)
      return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3)}`;
    if (apenasNumeros.length <= 9)
      return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6)}`;
    return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6, 9)}-${apenasNumeros.slice(9, 11)}`;
  };

  // 2. Máscara Robusta de Data de Nascimento (DD/MM/AAAA) usando [^0-9]
  const formatarData = (valor: string) => {
    const apenasNumeros = valor.replace(/[^0-9]/g, "").slice(0, 8);
    if (apenasNumeros.length <= 2) return apenasNumeros;
    if (apenasNumeros.length <= 4)
      return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
    return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4, 8)}`;
  };

  // 3. Validador Estrito de Força de Senha (8+ dígitos, maiúscula, minúscula, número e símbolo)
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

  const handleMudarCpf = (texto: string) => {
    setCpf(formatarCpf(texto));
  };

  const handleMudarData = (texto: string) => {
    setDataNascimento(formatarData(texto));
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
      console.log(`[Cadastro] Enviando requisição para: ${urlDestino}`);

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
      console.log(`[Cadastro] Resposta HTTP ${resposta.status}:`, corpo);

      if (resposta.ok) {
        setFeedback({
          tipo: "sucesso",
          texto: "Conta criada! Redirecionando para verificação de e-mail...",
        });

        // Redireciona diretamente para a tela de verificação com fallback seguro
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
    } catch (err: any) {
      console.error("[Cadastro] Erro ao conectar ao Spring Boot:", err);
      const urlAlvo = API_URL || "URL indefinida";
      const erroRede = `Não foi possível conectar ao servidor Spring Boot em: ${urlAlvo}. No emulador Android, use http://10.0.2.2:8080 no seu config/api.ts. Em celular físico, use o IP local da sua máquina.`;
      setFeedback({ tipo: "erro", texto: erroRede });
      Alert.alert("Erro de Conexão", erroRede);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={estilos.containerGeral}>
      {/* 1. Imagem de fundo oficial (Assets.backgrounds.cadastro - IMG-020) */}
      <Image
        source={Assets.backgrounds.cadastro}
        style={estilos.fundoAbsoluto}
        resizeMode="cover"
      />

      {/* 2. Conteúdo rolável independente por cima do plano de fundo */}
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
          {/* Top Bar: Botão Voltar e Logo Centralizado (Assets.logo.transparent - IMG-004) */}
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
                source={Assets.logo.transparent}
                style={estilos.logoImg}
                resizeMode="contain"
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

          {/* Formulário com os 6 campos idênticos ao design */}
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
              testID="cadastro-input-email"
            />

            {/* 3. CPF com máscara formatada */}
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={cpf}
              onChangeText={setCpf}
              mask="cpf"
              maxLength={14}
              leftIcon={<Feather name="credit-card" size={18} color="#64748B" />}
              disabled={carregando}
              testID="cadastro-input-cpf"
            />

            {/* 4. Data de nascimento com máscara formatada */}
            <Input
              label="Data de nascimento"
              placeholder="DD/MM/AAAA"
              value={dataNascimento}
              onChangeText={setDataNascimento}
              mask="date"
              maxLength={10}
              leftIcon={<Feather name="calendar" size={18} color="#64748B" />}
              rightIcon={<Feather name="calendar" size={18} color="#94A3B8" />}
              disabled={carregando}
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

            {/* Botão Primário Laranja Degradê */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={executarCadastro}
              disabled={carregando}
              style={estilos.btnCriarContaWrapper}
            >
              <View style={estilos.btnCriarConta}>
                {carregando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={estilos.btnCriarContaConteudo}>
                    <Text style={estilos.txtCriarContaBtn}>Criar conta</Text>
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

            {/* Botão Social Google */}
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

            {/* Rodapé: Já tem uma conta? Entrar */}
            <View style={estilos.rodapeLogin}>
              <Text style={estilos.txtJaTemConta}>Já tem uma conta?</Text>
              <TouchableOpacity onPress={() => router.push("/login" as any)}>
                <Text style={estilos.txtEntrarLink}>Entrar</Text>
              </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  cabecalhoTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
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
    height: 64,
  },
  espacadorDireita: {
    width: 40,
  },
  areaTitulos: {
    marginBottom: 22,
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
    marginTop: 6,
    lineHeight: 20,
  },
  formulario: {
    gap: 12,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
    backgroundColor: "#FFFFFF",
  },
  inputIconeEsquerda: {
    marginRight: 10,
  },
  inputIconeDireita: {
    marginLeft: 10,
  },
  inputTexto: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  inputConteudoDuplo: {
    flex: 1,
    justifyContent: "center",
  },
  inputLabelMini: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 1,
  },
  inputTextoMini: {
    fontSize: 13,
    color: "#0F172A",
    padding: 0,
    margin: 0,
  },
  iconeOlho: {
    padding: 4,
  },
  btnCriarContaWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 6,
    backgroundColor: "#FF6A00",
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
    backgroundColor: "#FF6A00",
    borderRadius: 24,
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
  },
  divisorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  linhaDivisor: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  txtOu: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#94A3B8",
  },
  btnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    height: 48,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  txtGoogle: {
    fontSize: 13,
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
    color: "#EA580C",
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
});