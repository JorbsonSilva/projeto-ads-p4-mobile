/**
 * @file login.tsx
 * @description Controlador de Interface da Tela de Login (View Controller).
 * Captura as credenciais de acesso, executa validações locais preventivas (Client-Side),
 * gerencia o estado de submissão assíncrona e consome as rotas REST do Spring Boot.
 */

import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Importações de Configurações Globais e Contextos de Sessão
import { API_URL } from "../config/api";
import { Colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

// Importações de Componentes Unificados (Localizados na pasta raiz /components)
import AlternadorPerfil from "../components/AlternadorPerfil";
import { BotaoCustomizado } from "../components/BotaoCustomizado";
import { InputCustomizado } from "../components/InputCustomizado";
import LoginSocial from "../components/LoginSocial";

export default function Login() {
  /** Hook de navegação por pilha do Expo Router para redirecionamento */
  const roteador = useRouter();

  /** Injeta a função global de sincronização de sessão mapeada no AuthContext */
  const { loginGlobal } = useAuth() as any;

  // ==========================================
  // 1. GERENCIAMENTO DE ESTADO (HOOKS)
  // ==========================================
  const [email, definirEmail] = useState("");
  const [senha, definirSenha] = useState("");
  const [perfil, definirPerfil] = useState("Aluno");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Estado que monitora o carregamento da requisição HTTP (Previnirá múltiplos cliques)
  const [submetendo, setSubmetendo] = useState(false);

  // Estados reativos para exibição de modais imperativos e mensagens de erro inline
  const [modalErroVisivel, setModalErroVisivel] = useState(false);
  const [modalErroTexto, setModalErroTexto] = useState("");
  const [emailErro, setEmailErro] = useState("");
  const [senhaErro, setSenhaErro] = useState("");

  // ==========================================
  // 2. INTEGRAÇÃO REST (MÉTODO HTTP POST)
  // ==========================================

  /**
   * Dispara o motor de autenticação da plataforma efetuando validações preventivas e a ponte com a API.
   * @async
   * @function executarLogin
   * @returns {Promise<void>} Encaminha o usuário autenticado para as abas privadas ou dispara alertas visuais.
   */
  const executarLogin = async () => {
    // Cláusulas de guarda locais (Bloqueiam disparos de rede inúteis se os campos estiverem vazios)
    const emailValido = !!email.trim();
    const senhaValida = !!senha.trim();

    if (!emailValido || !senhaValida) {
      setEmailErro(emailValido ? "" : "Por favor, insira seu e-mail.");
      setSenhaErro(senhaValida ? "" : "Por favor, insira sua senha.");
      return;
    }

    // Reseta sinalizadores de erro inline caso passe na validação local
    setEmailErro("");
    setSenhaErro("");

    // Ativa o estado de carregamento (O botão exibirá o Spinner e ficará bloqueado)
    setSubmetendo(true);

    try {
      // Executa a chamada assíncrona POST enviando o payload estruturado em JSON
      const resposta = await fetch(`${API_URL}/api/usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      // Se o servidor retornar o código HTTP 200 OK, processa a sessão
      if (resposta.ok) {
        const dadosDoUsuario = await resposta.json();

        // Grava as informações simultaneamente na memória RAM (Contexto) e no Disco (AsyncStorage)
        if (loginGlobal) {
          await loginGlobal(
            dadosDoUsuario.id.toString(),
            perfil,
            dadosDoUsuario.nome,
          );
        }

        // Substitui a rota atual matando o histórico de navegação (Evita loops ao usar o botão voltar do Android)
        roteador.replace("/(tabs)");
      } else {
        // Tratamento de falhas de autenticação mapeadas no Spring Boot (Ex: Credenciais Inválidas)
        let bodyError = "";
        try {
          const json = await resposta.json();
          bodyError = json?.message || json?.error || "";
        } catch {
          bodyError = await resposta.text();
        }
        setModalErroTexto(bodyError || "E-mail ou senha incorretos.");
        setModalErroVisivel(true);
      }
    } catch (error) {
      // Tratamento de falhas físicas de infraestrutura (Servidor offline, IP errado ou Wi-Fi instável)
      Alert.alert(
        "Erro de Conexão",
        "Não foi possível conectar ao servidor. Verifique se a API está rodando.",
      );
      console.error("Erro na rotina de login: ", error);
    } finally {
      // Desativa o carregamento de forma imperativa independente se a requisição deu certo ou errado
      setSubmetendo(false);
    }
  };

  return (
    <SafeAreaView style={estilos.recipientePrincipal}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={estilos.scrollContainer}
          keyboardShouldPersistTaps="handled" // Essencial para usabilidade
          showsVerticalScrollIndicator={false}
        >
          <View style={estilos.areaCentral}>
            <View style={estilos.cartao}>
              {/* Bloco de Apresentação Visual Superior */}
              <View style={estilos.cabecalhoCartao}>
                <Text style={estilos.textoBemVindo}>Bem-vindo!</Text>
                <Text style={estilos.subtitulo}>Acesse sua conta</Text>
              </View>

              {/* Bloco de Formulário Controlado */}
              <View style={estilos.formulario}>
                <Text style={estilos.rotuloEntrada}>
                  Como você deseja entrar?
                </Text>

                {/* Componente Isolado de Seleção de Persona */}
                <AlternadorPerfil
                  perfilAtivo={perfil}
                  aoMudarPerfil={definirPerfil}
                />

                <Text style={estilos.rotuloEntrada}>E-mail</Text>
                <InputCustomizado
                  placeholder="Digite seu e-mail"
                  valor={email}
                  aoMudarTexto={(texto) => {
                    definirEmail(texto);
                    if (texto.trim()) setEmailErro("");
                  }}
                />
                {emailErro ? (
                  <Text style={estilos.textoErro}>{emailErro}</Text>
                ) : null}

                <Text style={estilos.rotuloEntrada}>Senha</Text>
                <InputCustomizado
                  placeholder="Digite sua senha"
                  valor={senha}
                  aoMudarTexto={(texto) => {
                    definirSenha(texto);
                    if (texto.trim()) setSenhaErro("");
                  }}
                  seguro={true}
                  mostrarSenha={mostrarSenha}
                  aoAlternarSenha={() =>
                    setMostrarSenha((anterior) => !anterior)
                  }
                />
                {senhaErro ? (
                  <Text style={estilos.textoErro}>{senhaErro}</Text>
                ) : null}

                {/* Botão Primário Inteligente integrado ao estado reativo de rede */}
                <BotaoCustomizado
                  text="Entrar"
                  aoClicar={executarLogin}
                  carregando={submetendo}
                />
              </View>
            </View>
          </View>

          {/* Módulo de Rodapé Abstraído Unificando Links de Navegação Cruzada */}
          <LoginSocial
            onGooglePress={() => console.log("OAuth Google Acionado")}
            onFacebookPress={() => console.log("OAuth Facebook Acionado")}
            onCadastroPress={() => roteador.push("/cadastro")}
          />
        </ScrollView>

        {/* Modal Reativo para Exibição de Mensagens de Erro Críticas da API */}
        <Modal transparent visible={modalErroVisivel} animationType="fade">
          <View style={estilos.modalOverlay}>
            <View style={estilos.modalCard}>
              <Text style={estilos.modalTitulo}>Erro</Text>
              <Text style={estilos.modalTexto}>{modalErroTexto}</Text>
              <TouchableOpacity
                style={estilos.modalBotao}
                onPress={() => setModalErroVisivel(false)}
              >
                <Text style={estilos.modalBotaoTexto}>Entendi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipientePrincipal: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  areaCentral: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    width: "100%",
    marginTop: 20,
  },
  cartao: {
    backgroundColor: Colors.card,
    borderRadius: 30,
    elevation: 5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: "90%",
  },
  cabecalhoCartao: {
    backgroundColor: Colors.primary,
    paddingBottom: 40,
    paddingHorizontal: 30,
    paddingTop: 30,
    width: "100%",
  },
  textoBemVindo: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitulo: {
    color: "white",
    fontSize: 14,
    marginTop: 4,
  },
  formulario: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    padding: 30,
  },
  rotuloEntrada: {
    color: Colors.text,
    fontWeight: "600",
    marginBottom: 5,
  },
  textoErro: {
    color: "#CC4444",
    fontSize: 13,
    marginTop: -6,
    marginBottom: 10,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    flex: 1,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    elevation: 8,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: "80%",
  },
  modalTitulo: {
    color: Colors.secondary,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalTexto: {
    color: Colors.text,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  modalBotao: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  modalBotaoTexto: {
    color: "white",
    fontWeight: "bold",
  },
});
