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
          tabBarStyle: {
            display: "none",
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
