/**
 * @file CardAula.tsx
 * @description Componente visual para listagem de aulas/mentorias.
 * Exibe as informações do aluno/professor, data, status e os botões de ação (Aceitar/Recusar)
 * de forma condicional caso o agendamento esteja pendente.
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CardAulaProps {
  /** ID único do agendamento vindo do banco de dados */
  id: number;
  /** Nome do aluno ou professor vinculado à aula */
  nome: string;
  /** Disciplina ou tipo de mentoria */
  materia: string;
  /** Data formatada (ex: DD/MM/AAAA) */
  data: string;
  /** Hora formatada (ex: 14:00) */
  hora: string;
  /** Status atual da aula (PENDENTE, CONFIRMADO, RECUSADO) */
  status: string;
  /** URL da foto de perfil do usuário */
  foto: string;
  /** Callback acionado ao clicar no botão "Aceitar" (injetando o ID) */
  onAceitar: (id: number) => void;
  /** Callback acionado ao clicar no botão "Recusar" (injetando o ID) */
  onRecusar: (id: number) => void;
}

export default function CardAula({
  id,
  nome,
  materia,
  data,
  hora,
  status,
  foto,
  onAceitar,
  onRecusar,
}: CardAulaProps) {
  // Lógica booleana para renderização condicional de UI
  const pendente = status === "PENDENTE";
  const confirmado = status === "CONFIRMADO";

  return (
    <View style={estilos.aulaListaItem}>
      {/* Coluna 1: Avatar */}
      <Image source={{ uri: foto }} style={estilos.aulaListaFoto} />

      {/* Coluna 2: Dados Principais e Ações */}
      <View style={estilos.containerDados}>
        <Text style={estilos.aulaListaNome} numberOfLines={1}>
          {nome}
        </Text>
        <Text style={estilos.aulaListaMateria}>{materia}</Text>
        <Text style={estilos.aulaListaData}>
          📅 {data} • {hora}
        </Text>

        {/* Renderização Condicional: Botões de Ação só aparecem se estiver pendente */}
        {pendente && (
          <View style={estilos.containerAcoes}>
            <TouchableOpacity
              style={estilos.botaoAceitar}
              activeOpacity={0.7}
              onPress={() => onAceitar(id)}
            >
              <Feather
                name="check"
                size={14}
                color="#FFF"
                style={estilos.iconeBotao}
              />
              <Text style={estilos.textoBotao}>Aceitar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={estilos.botaoRecusar}
              activeOpacity={0.7}
              onPress={() => onRecusar(id)}
            >
              <Feather
                name="x"
                size={14}
                color="#FFF"
                style={estilos.iconeBotao}
              />
              <Text style={estilos.textoBotao}>Recusar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Coluna 3: Tag de Status Visual */}
      <View
        style={[
          estilos.tagStatus,
          {
            backgroundColor: pendente
              ? "#FFF0D9" // Laranja claro para atenção
              : confirmado
                ? "#DDF8E8" // Verde claro para sucesso
                : "#F0F0F0", // Cinza para outros (cancelado)
          },
        ]}
      >
        <Text
          style={[
            estilos.textoTag,
            { color: pendente ? "#D88400" : confirmado ? "#008A46" : "#777" },
          ]}
        >
          {status}
        </Text>
      </View>

      {/* Ícone de navegação lateral (Apenas se já estiver processado) */}
      {!pendente && (
        <Feather
          name="chevron-right"
          size={20}
          color="#999"
          style={{ marginLeft: 8 }}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  aulaListaItem: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#FFF",
  },
  aulaListaFoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#E1F0FF", // Fallback enquanto a imagem carrega
  },
  containerDados: {
    flex: 1,
    paddingRight: 8,
  },
  aulaListaNome: {
    fontWeight: "bold",
    fontSize: 15,
    color: "#111",
  },
  aulaListaMateria: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  aulaListaData: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  tagStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textoTag: {
    fontSize: 11,
    fontWeight: "bold",
  },
  containerAcoes: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    width: "100%",
  },
  botaoAceitar: {
    flexDirection: "row",
    backgroundColor: "#008A46",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  botaoRecusar: {
    flexDirection: "row",
    backgroundColor: "#D93838",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  iconeBotao: {
    marginRight: 4,
  },
  textoBotao: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
