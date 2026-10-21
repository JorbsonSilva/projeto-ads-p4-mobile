/**
 * @file AlternadorPerfil.tsx
 * @description Componente visual tátil e atômico responsável por alternar a persona da sessão atual.
 * Apresenta um efeito visual interativo para indicar qual perfil (Aluno ou Professor) está selecionado.
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/colors";

interface AlternadorPerfilProps {
  /** Estado reativo do perfil selecionado atualmente ("Aluno" ou "Professor") */
  perfilAtivo: string;
  /** Função de callback disparada no clique do botão para atualizar o estado na tela pai */
  aoMudarPerfil: (novoPerfil: string) => void;
}

export default function AlternadorPerfil({
  perfilAtivo,
  aoMudarPerfil,
}: AlternadorPerfilProps) {
  return (
    <View style={estilos.recipienteAlternador}>
      {/* Opção Aluno */}
      <TouchableOpacity
        style={[
          estilos.botaoAlternador,
          perfilAtivo === "Aluno"
            ? estilos.botaoAlternadorAtivo
            : estilos.botaoAlternadorInativo,
        ]}
        activeOpacity={0.7}
        onPress={() => aoMudarPerfil("Aluno")}
      >
        <Text
          style={[
            estilos.textoAlternador,
            perfilAtivo === "Aluno"
              ? estilos.textoAlternadorAtivo
              : estilos.textoAlternadorInativo,
          ]}
        >
          Aluno
        </Text>
      </TouchableOpacity>

      {/* Opção Professor */}
      <TouchableOpacity
        style={[
          estilos.botaoAlternador,
          perfilAtivo === "Professor"
            ? estilos.botaoAlternadorAtivo
            : estilos.botaoAlternadorInativo,
        ]}
        activeOpacity={0.7}
        onPress={() => aoMudarPerfil("Professor")}
      >
        <Text
          style={[
            estilos.textoAlternador,
            perfilAtivo === "Professor"
              ? estilos.textoAlternadorAtivo
              : estilos.textoAlternadorInativo,
          ]}
        >
          Professor
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  recipienteAlternador: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    marginTop: 10,
    backgroundColor: Colors.input,
    padding: 4,
    borderRadius: 16,
  },
  botaoAlternador: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  botaoAlternadorAtivo: {
    backgroundColor: Colors.secondary,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
  },
  botaoAlternadorInativo: {
    backgroundColor: "transparent",
  },
  textoAlternador: {
    fontSize: 15,
    fontWeight: "bold",
  },
  textoAlternadorAtivo: {
    color: "#FFFFFF",
  },
  textoAlternadorInativo: {
    color: "#888888",
  },
});
