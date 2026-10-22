/**
 * @file verificar-email.tsx
 * @description Controlador de Interface da Tela de Verificação de E-mail (Segurança OTP).
 * Captura o código de autenticação enviado ao e-mail do utilizador e gere a validação junto ao Back-end.
 * Implementa feedback visual de sucesso reutilizável.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BotaoCustomizado } from "../components/BotaoCustomizado";
import { ModalSucesso } from "../components/ModalSucesso";
import { API_URL } from "../config/api";
import { Colors } from "../constants/colors";

export default function VerificarEmail() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const roteador = useRouter();

  const [digitos, setDigitos] = useState(["", "", "", "", "", ""]);
  const [carregando, setCarregando] = useState(false);

  // Estados para modais de feedback
  const [modalErroVisivel, setModalErroVisivel] = useState(false);
  const [modalSucessoVisivel, setModalSucessoVisivel] = useState(false);
  const [modalErroTexto, setModalErroTexto] = useState("");
  const [cooldown, setCooldown] = useState(60);

  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const atualizarDigito = (index: number, valor: string) => {
    const novoDigitos = [...digitos];
    novoDigitos[index] = valor.replace(/\D/g, "").slice(-1);
    setDigitos(novoDigitos);
    if (valor && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !digitos[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verificarCodigo = async () => {
    const codigo = digitos.join("");
    if (codigo.length < 6) {
      setModalErroTexto("Digite o código completo de 6 dígitos.");
      setModalErroVisivel(true);
      return;
    }

    setCarregando(true);
    try {
      const resposta = await fetch(`${API_URL}/api/usuarios/verificar-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo }),
      });

      if (resposta.ok) {
        setModalSucessoVisivel(true);
      } else {
        let msg = "";
        try {
          const json = await resposta.json();
          msg = json?.message || "";
        } catch {
          msg = await resposta.text();
        }
        setDigitos(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        setModalErroTexto(
          msg || "Código inválido ou expirado. Tente novamente.",
        );
        setModalErroVisivel(true);
      }
    } catch {
      setModalErroTexto("Não foi possível conectar ao servidor.");
      setModalErroVisivel(true);
    } finally {
      setCarregando(false);
    }
  };

  const reenviarCodigo = async () => {
    if (cooldown > 0) return;
    try {
      await fetch(`${API_URL}/api/usuarios/reenviar-verificacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setCooldown(60);
      setDigitos(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch {
      setModalErroTexto("Não foi possível reenviar o código.");
      setModalErroVisivel(true);
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
          <View style={estilos.cartao}>
            <Text style={estilos.titulo}>Verifique seu e-mail</Text>
            <Text style={estilos.subtitulo}>
              Enviamos um código de 6 dígitos para:
            </Text>
            <Text style={estilos.email}>{email}</Text>

            <View style={estilos.recipienteOtp}>
              {digitos.map((digito, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputs.current[index] = ref;
                  }}
                  style={[
                    estilos.caixaOtp,
                    digito ? estilos.caixaOtpPreenchida : null,
                  ]}
                  value={digito}
                  onChangeText={(valor) => atualizarDigito(index, valor)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(index, nativeEvent.key)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <BotaoCustomizado
              text={carregando ? "Verificando..." : "Confirmar"}
              aoClicar={verificarCodigo}
            />

            <TouchableOpacity
              onPress={reenviarCodigo}
              disabled={cooldown > 0}
              style={estilos.botaoReenviar}
            >
              <Text
                style={[
                  estilos.textoReenviar,
                  cooldown > 0 && estilos.textoReenviarDesabilitado,
                ]}
              >
                {cooldown > 0
                  ? `Reenviar código em ${cooldown}s`
                  : "Reenviar código"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => roteador.back()}
            style={estilos.botaoCancelar}
          >
            <Text style={estilos.textoCancelar}>Cancelar cadastro</Text>
          </TouchableOpacity>

          {/* Modal de Sucesso Reutilizável */}
          <ModalSucesso
            visivel={modalSucessoVisivel}
            titulo="Sucesso!"
            mensagem="Sua conta foi verificada com sucesso. Seja bem-vindo!"
            aoFechar={() => roteador.replace("/login")}
          />

          {/* Modal de Erro */}
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
        </ScrollView>
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

  container: {
    alignItems: "center",
    backgroundColor: Colors.background,
    flex: 1,
    justifyContent: "center",
  },

  cartao: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 30,
    elevation: 5,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: "90%",
  },
  titulo: {
    color: Colors.secondary,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitulo: { color: Colors.text, fontSize: 14, textAlign: "center" },
  email: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 28,
    marginTop: 4,
    textAlign: "center",
  },
  recipienteOtp: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 28,
  },
  caixaOtp: {
    borderColor: "#CCCCCC",
    borderRadius: 12,
    borderWidth: 2,
    color: Colors.text,
    fontSize: 22,
    fontWeight: "bold",
    height: 56,
    textAlign: "center",
    width: 44,
  },
  caixaOtpPreenchida: { borderColor: Colors.secondary },
  botaoReenviar: { marginTop: 20, paddingVertical: 8 },
  textoReenviar: {
    color: Colors.secondary,
    fontWeight: "bold",
    textAlign: "center",
  },
  textoReenviarDesabilitado: { color: "#AAAAAA" },
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
    marginBottom: 16,
    textAlign: "center",
  },
  modalBotao: {
    alignItems: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalBotaoTexto: { color: "white", fontWeight: "bold" },
  botaoCancelar: { marginTop: 12, paddingVertical: 8 },
  textoCancelar: { color: "#CC4444", fontWeight: "bold", textAlign: "center" },
});
