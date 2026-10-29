// app/cadastro.tsx - 100% Fiel à Tela Alvo Enviada (Orienta Mobile)
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../config/api";



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

  // Máscara dinâmica de CPF (000.000.000-00)
  const formatarCpf = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "").slice(0, 11);
    if (apenasNumeros.length <= 3) return apenasNumeros;
    if (apenasNumeros.length <= 6)
      return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3)}`;
    if (apenasNumeros.length <= 9)
      return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6)}`;
    return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6, 9)}-${apenasNumeros.slice(9, 11)}`;
  };

  // Máscara dinâmica de Data de Nascimento (DD/MM/AAAA)
  const formatarData = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "").slice(0, 8);
    if (apenasNumeros.length <= 2) return apenasNumeros;
    if (apenasNumeros.length <= 4)
      return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
    return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4, 8)}`;
  };

  const handleMudarCpf = (texto: string) => {
    setCpf(formatarCpf(texto));
  };

  const handleMudarData = (texto: string) => {
    setDataNascimento(formatarData(texto));
  };

  const executarCadastro = async () => {
    if (!nome.trim() || !email.trim() || !cpf.trim() || !dataNascimento.trim() || !senha.trim()) {
      Alert.alert("Campos obrigatórios", "Por favor, preencha todos os campos do formulário.");
      return;
    }

    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      Alert.alert("CPF inválido", "Por favor, digite um CPF válido com 11 números.");
      return;
    }

    if (senha.length < 6) {
      Alert.alert("Senha muito curta", "A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert("Confirmação incorreta", "A senha e a confirmação de senha não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      let dataIso = dataNascimento;
      const partes = dataNascimento.split("/");
      if (partes.length === 3 && partes[2].length === 4) {
        dataIso = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }

      const resposta = await fetch(`${API_URL}/api/v1/auth/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          cpf: cpfLimpo,
          dataNascimento: dataIso,
          senha,
          tipo: "ALUNO",
        }),
      });

      const corpo = await resposta.json().catch(() => ({}));

      if (resposta.ok) {
        Alert.alert(
          "Conta criada com sucesso!",
          corpo.message || "Seu cadastro foi realizado com sucesso. Faça login agora.",
          [
            {
              text: "Ir para Login",
              onPress: () => router.replace("/login" as any),
            },
          ]
        );
      } else {
        const mensagemErro =
          corpo.message ||
          corpo.error ||
          (corpo.errors ? Object.values(corpo.errors).join("\n") : "Falha ao criar conta.");
        Alert.alert("Erro no cadastro", mensagemErro);
      }
    } catch {
      Alert.alert("Erro de Conexão", "Não foi possível conectar ao servidor Spring Boot.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={estilos.containerGeral}>
      {/* 1. Imagem de fundo travada nas dimensões físicas da tela (zero zoom) */}
      <Image
        source={require("../assets/images/Plano_fundo_cadastro.jpeg")}
        style={estilos.fundoAbsoluto}
        resizeMode="stretch"
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
            {/* Top Bar: Botão Voltar (←) e Logo Centralizado */}
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

            {/* Título e Subtítulo */}
            <View style={estilos.areaTitulos}>
              <Text style={estilos.tituloPrincipal}>Crie sua conta</Text>
              <Text style={estilos.subtitulo}>
                Vamos começar! Preencha seus dados para continuar.
              </Text>
            </View>

            {/* Formulário com os 6 campos */}
            <View style={estilos.formulario}>
              {/* 1. Nome completo */}
              <View style={estilos.inputBox}>
                <Feather name="user" size={18} color="#64748B" style={estilos.inputIconeEsquerda} />
                <TextInput
                  style={estilos.inputTexto}
                  placeholder="Nome completo"
                  placeholderTextColor="#94A3B8"
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                />
              </View>

              {/* 2. E-mail */}
              <View style={estilos.inputBox}>
                <Feather name="mail" size={18} color="#64748B" style={estilos.inputIconeEsquerda} />
                <TextInput
                  style={estilos.inputTexto}
                  placeholder="E-mail"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* 3. CPF */}
              <View style={estilos.inputBox}>
                <Feather name="credit-card" size={18} color="#64748B" style={estilos.inputIconeEsquerda} />
                <View style={estilos.inputConteudoDuplo}>
                  <Text style={estilos.inputLabelMini}>CPF</Text>
                  <TextInput
                    style={estilos.inputTextoMini}
                    placeholder="000.000.000-00"
                    placeholderTextColor="#94A3B8"
                    value={cpf}
                    onChangeText={handleMudarCpf}
                    keyboardType="numeric"
                    maxLength={14}
                  />
                </View>
              </View>

              {/* 4. Data de nascimento */}
              <View style={estilos.inputBox}>
                <Feather name="calendar" size={18} color="#64748B" style={estilos.inputIconeEsquerda} />
                <View style={estilos.inputConteudoDuplo}>
                  <Text style={estilos.inputLabelMini}>Data de nascimento</Text>
                  <TextInput
                    style={estilos.inputTextoMini}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#94A3B8"
                    value={dataNascimento}
                    onChangeText={handleMudarData}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <Feather name="calendar" size={18} color="#94A3B8" style={estilos.inputIconeDireita} />
              </View>

              {/* 5. Senha */}
              <View style={estilos.inputBox}>
                <Feather name="lock" size={18} color="#64748B" style={estilos.inputIconeEsquerda} />
                <TextInput
                  style={estilos.inputTexto}
                  placeholder="Senha"
                  placeholderTextColor="#94A3B8"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!mostrarSenha}
                />
                <TouchableOpacity
                  onPress={() => setMostrarSenha((v) => !v)}
                  style={estilos.iconeOlho}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={mostrarSenha ? "eye-off-outline" : "eye-outline"}
                    size={19}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>

              {/* 6. Confirmar senha */}
              <View style={estilos.inputBox}>
                <Feather name="lock" size={18} color="#64748B" style={estilos.inputIconeEsquerda} />
                <TextInput
                  style={estilos.inputTexto}
                  placeholder="Confirmar senha"
                  placeholderTextColor="#94A3B8"
                  value={confirmarSenha}
                  onChangeText={setConfirmarSenha}
                  secureTextEntry={!mostrarConfirmarSenha}
                />
                <TouchableOpacity
                  onPress={() => setMostrarConfirmarSenha((v) => !v)}
                  style={estilos.iconeOlho}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={mostrarConfirmarSenha ? "eye-off-outline" : "eye-outline"}
                    size={19}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>

              {/* Botão Primário Laranja */}
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
                  source={require("../assets/images/google.png")}
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
  // Localize este trecho no final do seu arquivo dentro do StyleSheet.create:
  fundoAbsoluto: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",  // Garante que ocupe toda a largura independente do aparelho
    height: "100%", // Garante que ocupe toda a altura independente do aparelho
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
    width: 400,
    height: 264,
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
   backgroundColor: "#F7F2EC", // Um bege suave que contrasta com o fundo e destaca os inputs brancos
    borderRadius: 20,          // Bordas arredondadas para combinar com os botões
    padding: 16,               // Espaçamento interno para os inputs não colarem nas bordas do card
    gap: 12,                   // Mantém o espaçamento padrão entre os campos
    borderWidth: 1,            // Linha bem fina de contorno opcional
    borderColor: "#EFEAE4",    // Cor suave para a borda do card
    
    // Sombra leve para dar profundidade sobre o wallpaper
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
});