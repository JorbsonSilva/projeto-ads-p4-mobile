/**
 * @file cadastro.tsx
 * @description Controlador de Interface da Tela de Cadastro (View Controller).
 * Coleta os dados de identificação e credenciais de novos usuários, aplicando máscaras
 * de entrada reativas e validações complexas de segurança (padrão de e-mail e força da senha)
 * em tempo real antes de submeter o payload estruturado em JSON para o servidor Spring Boot.
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

// Importações de Configurações Globais de Rede e Tokens de Design
import { API_URL } from "../config/api";
import { Colors } from "../constants/colors";

// Importações de Componentes Unificados (Localizados na pasta única /components na raiz)
import { BotaoCustomizado } from "../components/BotaoCustomizado";
import { InputCustomizado } from "../components/InputCustomizado";

export default function Cadastro() {
  /** Hook de navegação por pilha do Expo Router para controle de rotas internas */
  const roteador = useRouter();

  // ==========================================
  // 1. GERENCIAMENTO DE ESTADO (HOOKS)
  // ==========================================
  const [nome, definirNome] = useState("");
  const [email, definirEmail] = useState("");
  const [data, definirData] = useState("");
  const [senha, definirSenha] = useState("");
  const [confirmaSenha, definirConfirmaSenha] = useState("");

  // Estados reativos para controle de visibilidade de caracteres ocultos (Inputs do tipo password)
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmaSenha, setMostrarConfirmaSenha] = useState(false);

  // Estado reativo que monitoriza o carregamento da requisição de rede (bloqueia duplo clique)
  const [submetendo, setSubmetendo] = useState(false);

  // Estados de controle para modais informativos de feedback e tratamento de erros do servidor
  const [modalErroVisivel, setModalErroVisivel] = useState(false);
  const [modalErroTexto, setModalErroTexto] = useState("");
  const [mensagemErroEmail, setMensagemErroEmail] = useState("");

  // ==========================================
  // 2. REGRAS DE VALIDAÇÃO REATIVAS (CLIENT-SIDE)
  // ==========================================

  /** * Expressão Regular (Regex) padrão para validação semântica de e-mails.
   * Verifica a existência obrigatória do caractere '@', domínio e extensão válida.
   */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailValido = emailRegex.test(email);

  // Validadores atômicos para a política de complexidade de segurança da senha
  const senhaTemMaiuscula = /[A-Z]/.test(senha);
  const senhaTemMinuscula = /[a-z]/.test(senha);
  const senhaTemEspecial = /[^A-Za-z0-9]/.test(senha);
  const senhaTemTamanhoMinimo = senha.length >= 6;

  /** Determina se a senha cumpre integralmente os requisitos de segurança exigidos */
  const senhaForte =
    senhaTemMaiuscula &&
    senhaTemMinuscula &&
    senhaTemEspecial &&
    senhaTemTamanhoMinimo;

  /** Valida a correspondência idêntica entre a senha e o campo de confirmação */
  const senhasCoincidem = senha === confirmaSenha;

  // ==========================================
  // 3. MÁSCARAS DE ENTRADA (DATA INPUT)
  // ==========================================

  /**
   * Intercepta a digitação no campo de data de nascimento e aplica uma máscara posicional (DD/MM/AAAA).
   * @function formatarDataNascimento
   * @param {string} texto - Caracteres brutos capturados diretamente do evento onChangeText.
   * @returns {string} String mascarada e higienizada contendo apenas números e barras separadoras.
   */
  const formatarDataNascimento = (texto: string): string => {
    // Remove qualquer caractere que não seja um dígito numérico puro e limita a entrada a 8 dígitos
    const numeros = texto.replace(/\D/g, "").slice(0, 8);

    // Injeta as barras divisoras progressivamente dependendo do comprimento dos numerais digitados
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 4)
      return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
    return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
  };

  // ==========================================
  // 4. INTEGRAÇÃO REST (MÉTODO HTTP POST)
  // ==========================================

  /**
   * Avalia a integridade dos dados locais e executa o disparo assíncrono para criação da conta no Spring Boot.
   * @async
   * @function validarEEnviar
   * @returns {Promise<void>} Redireciona o usuário para a verificação de segurança ou expõe modais de falha.
   */
  const validarEEnviar = async () => {
    // Reseta estados de mensagens prévias de validação da API
    setMensagemErroEmail("");

    // Cláusula de Guarda 1: Interrompe o fluxo se houver algum campo obrigatório em branco
    if (!nome || !data || !email || !senha || !confirmaSenha) {
      Alert.alert(
        "Atenção!",
        "Por favor, preencha todos os campos obrigatórios do formulário.",
      );
      return;
    }

    // Cláusula de Guarda 2: Interrompe o fluxo se o formato do e-mail for inválido
    if (!emailValido) {
      Alert.alert(
        "E-mail Inválido",
        "Introduza um formato de e-mail válido para podermos enviar o código.",
      );
      return;
    }

    // Cláusula de Guarda 3: Interrompe se os campos de senha divergirem
    if (!senhasCoincidem) {
      Alert.alert(
        "Divergência de Senhas",
        "A confirmação de senha não corresponde à senha digitada.",
      );
      return;
    }

    // Cláusula de Guarda 4: Garante a submissão apenas de credenciais robustas no banco de dados
    if (!senhaForte) {
      Alert.alert(
        "Senha Fraca",
        "A senha escolhida não atinge os critérios mínimos de segurança exigidos.",
      );
      return;
    }

    // Liga o estado de carregamento global da tela antes de iniciar a requisição de rede
    setSubmetendo(true);

    /** Objeto estruturado (Payload) contendo os dados necessários para o cadastro */
    const pacoteJSON = {
      nome: nome,
      email: email,
      senha: senha,
    };

    try {
      // Dispara a chamada HTTP assíncrona POST para o endpoint correspondente na API
      const resposta = await fetch(`${API_URL}/api/usuarios/cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pacoteJSON),
      });

      // Processamento em caso de sucesso (Status Code 200/201)
      if (resposta.ok) {
        // Redireciona enviando o e-mail como parâmetro de rota para a tela de verificação OTP
        roteador.push({ pathname: "/verificar-email", params: { email } });
      } else {
        // Captura e expõe mensagens de exceções de negócio mapeadas pelo Spring Boot
        let bodyError = "";
        try {
          const json = await resposta.json();
          bodyError = json?.message || "";
        } catch {
          bodyError = await resposta.text();
        }

        const errorText =
          bodyError ||
          "Não foi possível efetuar o registro. Tente novamente mais tarde.";
        const lower = errorText.toLowerCase();

        // Tratamento visual específico para violação de constraint de e-mail único (Duplicidade no Banco)
        if (
          lower.includes("email já cadastrado") ||
          lower.includes("email existe")
        ) {
          setMensagemErroEmail(
            "Este endereço de e-mail já está associado a outra conta.",
          );
          setModalErroTexto(
            "Este endereço de e-mail já está associado a outra conta.",
          );
          setModalErroVisivel(true);
        } else {
          setModalErroTexto(errorText);
          setModalErroVisivel(true);
        }
      }
    } catch (error) {
      // Falha física ou de infraestrutura (Falta de conectividade, timeout ou IP inacessível)
      setModalErroTexto(
        "Não foi possível estabelecer ligação com o servidor. Verifique a sua internet.",
      );
      setModalErroVisivel(true);
      console.error("Erro na rotina de cadastro: ", error);
    } finally {
      // Desliga o estado de carregamento de forma imperativa após o encerramento do ciclo HTTP
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
          {/* Título de Apresentação da Tela */}
          <Text style={estilos.textoTitulo}>Cadastro</Text>

          {/* Bloco Elevado do Formulário (Cartão Central) */}
          <View style={estilos.cartao}>
            <Text style={estilos.rotuloEntrada}>Nome Completo</Text>
            <InputCustomizado
              placeholder="Ex: João Ferreira"
              valor={nome}
              aoMudarTexto={definirNome}
            />

            <Text style={estilos.rotuloEntrada}>E-mail</Text>
            <InputCustomizado
              placeholder="exemplo@email.com"
              valor={email}
              aoMudarTexto={definirEmail}
              keyboardType="email-address"
            />
            {/* Indicador em tempo real de consistência do formato de e-mail */}
            {email.length > 0 && (
              <Text
                style={[
                  estilos.validacaoTexto,
                  emailValido ? estilos.validacaoOk : estilos.validacaoErro,
                ]}
              >
                {emailValido
                  ? "✓ Formato de e-mail válido."
                  : "✗ Introduza um e-mail estruturalmente correto."}
              </Text>
            )}

            <Text style={estilos.rotuloEntrada}>Data de Nascimento</Text>
            <InputCustomizado
              placeholder="DD/MM/AAAA"
              valor={data}
              aoMudarTexto={(texto) =>
                definirData(formatarDataNascimento(texto))
              }
              keyboardType="number-pad"
            />

            <Text style={estilos.rotuloEntrada}>Senha</Text>
            <InputCustomizado
              placeholder="Defina uma senha forte"
              valor={senha}
              aoMudarTexto={definirSenha}
              seguro={true}
              mostrarSenha={mostrarSenha}
              aoAlternarSenha={() => setMostrarSenha((anterior) => !anterior)}
            />

            {/* Painel Dinâmico de Requisitos de Segurança da Senha */}
            {senha.length > 0 && (
              <View style={estilos.containerRequisitos}>
                <Text
                  style={[
                    estilos.validacaoTexto,
                    senhaTemTamanhoMinimo
                      ? estilos.validacaoOk
                      : estilos.validacaoErro,
                  ]}
                >
                  {senhaTemTamanhoMinimo ? "✓" : "✗"} Pelo menos 6 caracteres.
                </Text>
                <Text
                  style={[
                    estilos.validacaoTexto,
                    senhaTemMaiuscula
                      ? estilos.validacaoOk
                      : estilos.validacaoErro,
                  ]}
                >
                  {senhaTemMaiuscula ? "✓" : "✗"} Uma letra maiúscula.
                </Text>
                <Text
                  style={[
                    estilos.validacaoTexto,
                    senhaTemMinuscula
                      ? estilos.validacaoOk
                      : estilos.validacaoErro,
                  ]}
                >
                  {senhaTemMinuscula ? "✓" : "✗"} Uma letra minúscula.
                </Text>
                <Text
                  style={[
                    estilos.validacaoTexto,
                    senhaTemEspecial
                      ? estilos.validacaoOk
                      : estilos.validacaoErro,
                  ]}
                >
                  {senhaTemEspecial ? "✓" : "✗"} Um caractere especial (@, #,
                  $).
                </Text>
              </View>
            )}

            <Text style={estilos.rotuloEntrada}>Confirmar Senha</Text>
            <InputCustomizado
              placeholder="Repita a senha"
              valor={confirmaSenha}
              aoMudarTexto={definirConfirmaSenha}
              seguro={true}
              mostrarSenha={mostrarConfirmaSenha}
              aoAlternarSenha={() =>
                setMostrarConfirmaSenha((anterior) => !anterior)
              }
            />

            {/* Validação de igualdade em tempo de execução entre os campos de password */}
            {confirmaSenha.length > 0 && (
              <Text
                style={[
                  estilos.validacaoTexto,
                  senhasCoincidem ? estilos.validacaoOk : estilos.validacaoErro,
                ]}
              >
                {senhasCoincidem
                  ? "✓ As senhas digitadas coincidem."
                  : "✗ As senhas digitadas divergem."}
              </Text>
            )}

            {/* Botão de Cadastro Inteligente Integrado ao Estado de Rede */}
            <View style={estilos.recipienteBotao}>
              <View style={{ flex: 1 }}>
                <BotaoCustomizado
                  text="Criar Conta"
                  aoClicar={validarEEnviar}
                  carregando={submetendo}
                />
              </View>
            </View>

            {/* Link Lateral de Retorno ao Login (CORRIGIDO) */}
            <View style={estilos.recipienteLinkLogin}>
              <Text style={estilos.textoFixo}>Já é Cadastrado? </Text>
              <Text
                onPress={() => roteador.push("/login")}
                style={estilos.linkLogin}
              >
                Faça Login.
              </Text>
            </View>
          </View>

          {/* Botão de Cancelamento de Fluxo do Cadastro */}
          <TouchableOpacity
            onPress={() => roteador.back()}
            style={estilos.botaoCancelar}
          >
            <Text style={estilos.textoCancelar}>Cancelar cadastro</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal de Feedback Reativo para Erros Críticos Mapeados */}
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  textoTitulo: {
    alignSelf: "flex-start",
    color: Colors.secondary,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    marginLeft: "5%",
  },
  cartao: {
    backgroundColor: Colors.card,
    borderRadius: 30,
    elevation: 5,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: "90%",
  },
  rotuloEntrada: {
    color: Colors.text,
    fontWeight: "600",
    marginBottom: 5,
    fontSize: 14,
  },
  containerRequisitos: {
    marginTop: -4,
    marginBottom: 10,
    paddingLeft: 4,
  },
  validacaoTexto: {
    fontSize: 12,
    marginBottom: 8,
  },
  validacaoOk: {
    color: "#2d8a3a",
  },
  validacaoErro: {
    color: "#d43d3d",
  },
  recipienteBotao: {
    flexDirection: "row",
    marginTop: 10,
  },
  textoFixo: {
    color: Colors.text,
    fontSize: 14,
  },
  recipienteLinkLogin: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 20,
  },
  linkLogin: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 14,
  },
  botaoCancelar: {
    marginTop: 20,
    paddingVertical: 8,
  },
  textoCancelar: {
    color: "#CC4444",
    fontWeight: "bold",
    fontSize: 14,
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
    marginBottom: 20,
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
