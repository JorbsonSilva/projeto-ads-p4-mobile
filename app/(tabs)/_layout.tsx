/**
 * @file _layout.tsx
 * @description Layout de Navegação por Abas do aplicativo Orienta.
 * Em estrita conformidade com a Especificação de Navegação e Canais de Conversa — Orienta 2.0.1 (PROP-BKL-03).
 * 
 * Regra dos 5 Destinos por Perfil:
 * - Aluno: Home | Mapa | Agenda | Mensagens | Perfil
 * - Professor: Home | Dashboard | Agenda | Mensagens | Perfil
 * - Notícias: Formalmente excluída da navegação inferior (convertida em header modal)
 */

import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { perfilAtivo } = useAuth();
  const isProfessor = perfilAtivo === "Professor";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: -2 },
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      {/* 1. Home (Ambos os Perfis) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="home" size={19} color={color} />
          ),
        }}
      />

      {/* 2. Mapa (Destino do Aluno na Especificação 2.0.1) */}
      <Tabs.Screen
        name="mapa"
        options={{
          title: "Mapa",
          href: isProfessor ? null : "/(tabs)/mapa",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="map-marked-alt" size={19} color={color} />
          ),
        }}
      />

      {/* 2. Dashboard (Destino do Professor na Especificação 2.0.1) */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          href: isProfessor ? "/(tabs)/dashboard" : null,
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="chart-pie" size={19} color={color} />
          ),
        }}
      />

      {/* 3. Agenda (Ambos os Perfis) */}
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="calendar-alt" size={19} color={color} />
          ),
        }}
      />

      {/* 4. Mensagens (Canal 1 - Aluno ↔ Professor vinculado a agendamentos) */}
      <Tabs.Screen
        name="mensagens"
        options={{
          title: "Mensagens",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="comments" size={19} color={color} />
          ),
        }}
      />

      {/* 5. Perfil (Ambos os Perfis) */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="user-alt" size={19} color={color} />
          ),
        }}
      />

      {/* Notícias: Excluída da barra inferior (Especificação 2.0.1 § 2.2) */}
      <Tabs.Screen
        name="noticias"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
