import { Colors } from "@/constants/colors";
import { FontAwesome5 } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.secondary,
          tabBarInactiveTintColor: "#888888",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: -3 },

            // 🟢 A MÁGICA AQUI:
            // Tamanho base (60) + o tamanho exato dos botões de navegação do Android (insets.bottom)
            height: 60 + insets.bottom,

            // 🟢 O respiro inferior ajustável:
            // Se o celular tiver botões (insets.bottom > 0), o respiro é o tamanho dos botões.
            // Se for um iPhone sem botões, o respiro é 10.
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index" // Vai puxar o arquivo index.tsx (Home)
          options={{
            title: "Home",
            // Função que desenha o ícone. O 'color' já vem automático dependendo se está ativo ou inativo.
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="home" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="noticias"
          options={{
            title: "Notícias",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="newspaper" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="agenda" // Vai puxar o arquivo agenda.tsx
          options={{
            title: "Agenda",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="calendar-alt" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="perfil" // Vai puxar o arquivo perfil.tsx
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="user-alt" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
  );
}
