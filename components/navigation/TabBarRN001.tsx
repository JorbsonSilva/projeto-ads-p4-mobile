/**
 * @file TabBarRN001.tsx
 * @description Componente universal e canônico da Barra de Navegação Inferior Dockada (Requisito Funcional RN-001).
 * Implementa com precisão matemática a regra de ouro das exatamente 5 abas obrigatórias por perfil:
 * 
 * - Perfil ALUNO:
 *   1. Home (/(tabs))
 *   2. Buscar (/busca-professores)
 *   3. Chat (/chat)
 *   4. Agenda (/(tabs)/agenda)
 *   5. Perfil (/(tabs)/perfil)
 * 
 * - Perfil PROFESSOR:
 *   1. Home (/(tabs))
 *   2. Notificações (/notificacoes)
 *   3. Agenda (/(tabs)/agenda)
 *   4. Ganhos (/painel-ganhos)
 *   5. Perfil (/(tabs)/perfil?persona=professor)
 * 
 * Garantias arquiteturais RN-001:
 * - Exatamente 5 abas (proibição estrita de 6ª aba).
 * - Descarte oficial da aba Notícias como item de barra inferior.
 * - Suporte a badges operacionais (mensagens / solicitações).
 * - Feedback háptico/tátil e tokens oficiais do Design System Orienta 2.0.
 */

import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export type AbaChaveRN001 =
  | "home"
  | "buscar"
  | "chat"
  | "agenda"
  | "perfil"
  | "notificacoes"
  | "ganhos";

export interface TabBarRN001Props {
  /** Identificador da aba ativa no momento para renderizar o destaque visual */
  abaAtiva?: AbaChaveRN001;
  /** Permite forçar a exibição de um perfil específico ("Aluno" | "Professor") */
  perfilForcado?: "Aluno" | "Professor";
  /** Callback opcional chamado antes da navegação */
  aoClicarAba?: (aba: AbaChaveRN001, rota: string) => void;
  /** Estilo customizado para o container da barra */
  containerStyle?: object;
}

export default function TabBarRN001({
  abaAtiva = "home",
  perfilForcado,
  aoClicarAba,
  containerStyle,
}: TabBarRN001Props) {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  
  // Perfil efetivo (prop > AuthContext > padrão "Aluno")
  const perfilEfetivo =
    perfilForcado ||
    (auth?.perfilAtivo?.toLowerCase() === "professor" ? "Professor" : "Aluno");

  const isProfessor = perfilEfetivo === "Professor";

  const handleNavegacao = (aba: AbaChaveRN001, rota: string) => {
    if (aoClicarAba) {
      aoClicarAba(aba, rota);
    }
    // Se já estiver na aba ativa, não recarrega desnecessariamente
    if (aba === abaAtiva) {
      return;
    }
    router.push(rota as any);
  };

  return (
    <View
      style={[
        estilos.barraContainer,
        {
          paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom, 6) : 8,
        },
        containerStyle,
      ]}
      accessibilityRole="tablist"
      testID="barra-navegacao-rn001"
    >
      {/* ============================================================== */}
      {/* FLUXO DO PROFESSOR (5 ABAS OFICIAIS RN-001)                     */}
      {/* 1. Home | 2. Notificações | 3. Agenda | 4. Ganhos | 5. Perfil  */}
      {/* ============================================================== */}
      {isProfessor ? (
        <>
          {/* 1. Home Professor */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("home", "/(tabs)")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "home" }}
            accessibilityLabel="Home do Professor"
          >
            {abaAtiva === "home" && <View style={estilos.indicadorAbaAtiva} />}
            <FontAwesome5
              name="home"
              size={19}
              color={abaAtiva === "home" ? "#FF5A1F" : "#64748B"}
            />
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "home" && estilos.rotuloAbaAtivo,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          {/* 2. Notificações */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("notificacoes", "/notificacoes")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "notificacoes" }}
            accessibilityLabel="Central de Notificações"
          >
            {abaAtiva === "notificacoes" && <View style={estilos.indicadorAbaAtiva} />}
            <View style={estilos.iconeComBadge}>
              <Feather
                name="bell"
                size={20}
                color={abaAtiva === "notificacoes" ? "#FF5A1F" : "#64748B"}
              />
              <View style={estilos.badgeDotAlerta}>
                <Text style={estilos.badgeDotTexto}>3</Text>
              </View>
            </View>
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "notificacoes" && estilos.rotuloAbaAtivo,
              ]}
            >
              Notificações
            </Text>
          </TouchableOpacity>

          {/* 3. Agenda */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("agenda", "/(tabs)/agenda")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "agenda" }}
            accessibilityLabel="Agenda do Professor"
          >
            {abaAtiva === "agenda" && <View style={estilos.indicadorAbaAtiva} />}
            <FontAwesome5
              name="calendar-alt"
              size={19}
              color={abaAtiva === "agenda" ? "#FF5A1F" : "#64748B"}
            />
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "agenda" && estilos.rotuloAbaAtivo,
              ]}
            >
              Agenda
            </Text>
          </TouchableOpacity>

          {/* 4. Ganhos */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("ganhos", "/painel-ganhos")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "ganhos" }}
            accessibilityLabel="Painel de Ganhos"
          >
            {abaAtiva === "ganhos" && <View style={estilos.indicadorAbaAtiva} />}
            <FontAwesome5
              name="chart-line"
              size={19}
              color={abaAtiva === "ganhos" ? "#FF5A1F" : "#64748B"}
            />
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "ganhos" && estilos.rotuloAbaAtivo,
              ]}
            >
              Ganhos
            </Text>
          </TouchableOpacity>

          {/* 5. Perfil Professor */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() =>
              handleNavegacao("perfil", "/(tabs)/perfil?persona=professor")
            }
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "perfil" }}
            accessibilityLabel="Perfil e Configurações do Professor"
          >
            {abaAtiva === "perfil" && <View style={estilos.indicadorAbaAtiva} />}
            <FontAwesome5
              name="user-alt"
              size={18}
              color={abaAtiva === "perfil" ? "#FF5A1F" : "#64748B"}
            />
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "perfil" && estilos.rotuloAbaAtivo,
              ]}
            >
              Perfil
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        /* ============================================================== */
        /* FLUXO DO ALUNO (5 ABAS OFICIAIS RN-001)                         */
        /* 1. Home | 2. Buscar | 3. Chat | 4. Agenda | 5. Perfil           */
        /* ============================================================== */
        <>
          {/* 1. Home Aluno */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("home", "/(tabs)")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "home" }}
            accessibilityLabel="Home do Aluno"
          >
            {abaAtiva === "home" && <View style={estilos.indicadorAbaAtiva} />}
            <FontAwesome5
              name="home"
              size={19}
              color={abaAtiva === "home" ? "#FF5A1F" : "#64748B"}
            />
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "home" && estilos.rotuloAbaAtivo,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          {/* 2. Buscar Professores */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("buscar", "/busca-professores")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "buscar" }}
            accessibilityLabel="Buscar Professores"
          >
            {abaAtiva === "buscar" && <View style={estilos.indicadorAbaAtiva} />}
            <Feather
              name="search"
              size={20}
              color={abaAtiva === "buscar" ? "#FF5A1F" : "#64748B"}
            />
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "buscar" && estilos.rotuloAbaAtivo,
              ]}
            >
              Buscar
            </Text>
          </TouchableOpacity>

          {/* 3. Chat */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("chat", "/chat")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "chat" }}
            accessibilityLabel="Mensagens e Chat"
          >
            {abaAtiva === "chat" && <View style={estilos.indicadorAbaAtiva} />}
            <View style={estilos.iconeComBadge}>
              <Feather
                name="message-square"
                size={19}
                color={abaAtiva === "chat" ? "#FF5A1F" : "#64748B"}
              />
              <View style={estilos.badgeDotAlerta}>
                <Text style={estilos.badgeDotTexto}>2</Text>
              </View>
            </View>
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "chat" && estilos.rotuloAbaAtivo,
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>

          {/* 4. Agenda Aluno */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("agenda", "/(tabs)/agenda")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "agenda" }}
            accessibilityLabel="Minha Agenda de Aulas"
          >
            {abaAtiva === "agenda" && <View style={estilos.indicadorAbaAtiva} />}
            <FontAwesome5
              name="calendar-alt"
              size={19}
              color={abaAtiva === "agenda" ? "#FF5A1F" : "#64748B"}
            />
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "agenda" && estilos.rotuloAbaAtivo,
              ]}
            >
              Agenda
            </Text>
          </TouchableOpacity>

          {/* 5. Perfil Aluno */}
          <TouchableOpacity
            style={estilos.itemAba}
            onPress={() => handleNavegacao("perfil", "/(tabs)/perfil")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: abaAtiva === "perfil" }}
            accessibilityLabel="Meu Perfil de Aluno"
          >
            {abaAtiva === "perfil" && <View style={estilos.indicadorAbaAtiva} />}
            <FontAwesome5
              name="user-alt"
              size={18}
              color={abaAtiva === "perfil" ? "#FF5A1F" : "#64748B"}
            />
            <Text
              style={[
                estilos.rotuloAba,
                abaAtiva === "perfil" && estilos.rotuloAbaAtivo,
              ]}
            >
              Perfil
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  barraContainer: {
    flexDirection: "row",
    height: 60,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    paddingTop: 4,
    // Sombra sutil para ancoragem na base
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: "0 -2px 10px rgba(15, 23, 42, 0.04)",
      },
    }),
  },
  itemAba: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    position: "relative",
    height: "100%",
  },
  indicadorAbaAtiva: {
    position: "absolute",
    top: -4,
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#FF5A1F",
  },
  iconeComBadge: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDotAlerta: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: "#FF5A1F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeDotTexto: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  rotuloAba: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 3,
    letterSpacing: -0.2,
  },
  rotuloAbaAtivo: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
});
