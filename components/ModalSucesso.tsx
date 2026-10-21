/**
 * @file ModalSucesso.tsx
 * @description Componente reutilizável para feedback visual de operações concluídas com êxito.
 */

import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/colors";

interface ModalSucessoProps {
  visivel: boolean;
  titulo: string;
  mensagem: string;
  textoBotao?: string;
  aoFechar: () => void;
}

export function ModalSucesso({
  visivel,
  titulo,
  mensagem,
  textoBotao = "OK",
  aoFechar,
}: ModalSucessoProps) {
  return (
    <Modal transparent visible={visivel} animationType="fade">
      <View style={estilos.overlay}>
        <View style={estilos.card}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <Text style={estilos.mensagem}>{mensagem}</Text>
          <TouchableOpacity style={estilos.botao} onPress={aoFechar}>
            <Text style={estilos.textoBotao}>{textoBotao}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 30,
    width: "85%",
    alignItems: "center",
    elevation: 8,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.success, //
    marginBottom: 10,
  },
  mensagem: {
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 25,
  },
  botao: {
    backgroundColor: Colors.success,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  textoBotao: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
