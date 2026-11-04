/**
 * @file _layout.tsx
 * @description Layout Global de Navegação em Abas do Expo Router (app/(tabs)/).
 * Implementa com precisão o Requisito Funcional RN-001:
 * 
 * - Barra de navegação inferior dinâmica de exatamente 5 abas segundo o perfil ativo:
 *   - ALUNO: Home (/(tabs)), Buscar (/busca-professores), Chat (/chat), Agenda (/(tabs)/agenda), Perfil (/(tabs)/perfil).
 *   - PROFESSOR: Home (/(tabs)), Notificações (/notificacoes), Agenda (/(tabs)/agenda), Ganhos (/painel-ganhos), Perfil (/(tabs)/perfil?persona=professor).
 * 
 * - Descarte oficial da aba Notícias como aba fixa (RN-001), preservando rotas sob demanda.
 * - Eliminação estrita de qualquer duplicidade ou sobreposição de barras.
 */

import { Tabs } from "expo-router";
import React from "react";
import TabBarRN001, { AbaChaveRN001 } from "../../components/navigation/TabBarRN001";
import { useAuth } from "../../context/AuthContext";

export default function TabsLayout() {
  const auth = useAuth();
  const perfilAtivo = auth?.perfilAtivo?.toLowerCase() === "professor" ? "Professor" : "Aluno";

  return (
    <Tabs
      tabBar={(props) => {
        const routeName = props.state.routes[props.state.index]?.name;
        let abaAtiva: AbaChaveRN001 = "home";

        if (routeName === "agenda") {
          abaAtiva = "agenda";
        } else if (routeName === "perfil") {
          abaAtiva = "perfil";
        } else {
          abaAtiva = "home";
        }

        return <TabBarRN001 abaAtiva={abaAtiva} perfilForcado={perfilAtivo} />;
      }}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 1. Aba Home (Renderiza HomeAluno ou HomeProfessor dependendo do perfil) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      {/* 2. Aba Agenda Unificada (Aluno & Professor) */}
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
        }}
      />

      {/* 3. Aba Perfil (Aluno ou Professor com opções docentes) */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
        }}
      />

      {/* 4. Rota legada de notícias: formalmente descartada da barra inferior (RN-001) */}
      <Tabs.Screen
        name="noticias"
        options={{
          href: null, // Descartada oficialmente como item de barra dockada
        }}
      />
    </Tabs>
  );
}
