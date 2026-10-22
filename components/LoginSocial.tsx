/**
 * @file LoginSocial.tsx
 * @description Abstrai e renderiza as integrações secundárias de autenticação (OAuth) e links de navegação cruzada.
 * Reduz a complexidade visual do arquivo principal de login.
 */

import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/colors";

interface LoginSocialProps {
  /** Callback acionado ao pressionar o botão de autenticação do Google (Uso Futuro) */
  onGooglePress?: () => void;
  /** Callback acionado ao pressionar o botão de autenticação do Facebook (Uso Futuro) */
  onFacebookPress?: () => void;
  /** Callback obrigatório focado na navegação para a rota de criação de contas */
  onCadastroPress: () => void;
}

export default function LoginSocial({
  onGooglePress,
  onFacebookPress,
  onCadastroPress,
}: LoginSocialProps) {
  return (
    <View style={estilos.rodape}>
      {/* Linha Divisória Customizada */}
      <View style={estilos.recipienteDivisor}>
        <View style={estilos.linhaDivisora} />
        <View style={estilos.textoOu}>
          <Text style={estilos.rotuloOu}>ou</Text>
        </View>
        <View style={estilos.linhaDivisora} />
      </View>

      {/* Botões de Mídia Social */}
      <View style={estilos.recipienteSocial}>
        <TouchableOpacity
          style={estilos.iconeSocial}
          activeOpacity={0.6}
          onPress={onGooglePress}
        >
          <FontAwesome name="google" size={22} color="#DB4437" />
        </TouchableOpacity>
        <TouchableOpacity
          style={estilos.iconeSocial}
          activeOpacity={0.6}
          onPress={onFacebookPress}
        >
          <FontAwesome name="facebook" size={22} color="#4267B2" />
        </TouchableOpacity>
      </View>

      {/* Link de Redirecionamento para Cadastro */}
      <View style={estilos.recipienteLinkCadastro}>
        <Text style={estilos.textoFixoRodape}>Não tem conta? </Text>
        <Text onPress={onCadastroPress} style={estilos.linkCadastro}>
          Cadastre-se.
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  rodape: {
    alignItems: "center",
    gap: 20,
    marginTop: 15,
    paddingBottom: 20,
    width: "100%",
  },
  recipienteDivisor: {
    alignItems: "center",
    flexDirection: "row",
    width: "90%",
  },
  linhaDivisora: {
    backgroundColor: Colors.border,
    flex: 1,
    height: 1,
  },
  textoOu: {
    marginHorizontal: 15,
  },
  rotuloOu: {
    color: "#888888",
    fontSize: 14,
  },
  recipienteSocial: {
    flexDirection: "row",
    gap: 20,
  },
  iconeSocial: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    elevation: 2,
    height: 50,
    justifyContent: "center",
    width: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  recipienteLinkCadastro: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 5,
  },
  textoFixoRodape: {
    color: Colors.text,
    fontSize: 14,
  },
  linkCadastro: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 14,
  },
});
