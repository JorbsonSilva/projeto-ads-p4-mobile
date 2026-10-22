import { Feather, Ionicons } from "@expo/vector-icons";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Noticias() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            marginTop: 45,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View>
            <Text
              style={{ fontSize: 36, fontWeight: "bold", color: "#FF6B1A" }}
            >
              Notícias
            </Text>
            <Text style={{ fontSize: 16, color: "#777", marginTop: 6 }}>
              Fique por dentro das novidades da educação e da ciência.
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", marginTop: 28, gap: 12 }}>
          <View
            style={{
              flex: 1,
              height: 58,
              borderWidth: 1,
              borderColor: "#E5E5E5",
              borderRadius: 18,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
            }}
          >
            <Feather
              name="search"
              size={22}
              color="#999"
              style={{ marginRight: 10 }}
            />
            <TextInput
              placeholder="Buscar notícias..."
              placeholderTextColor="#AAA"
              style={{ flex: 1, fontSize: 14 }}
            />
          </View>

          <TouchableOpacity
            style={{
              height: 58,
              paddingHorizontal: 18,
              borderWidth: 1,
              borderColor: "#E5E5E5",
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Feather name="sliders" size={18} color="#222" />
              <Text style={{ fontSize: 16 }}>Filtros</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 22 }}
        >
          {["Todas", "Educação", "Ciência", "Tecnologia", "Carreira"].map(
            (item, index) => (
              <TouchableOpacity
                key={item}
                style={{
                  backgroundColor: index === 0 ? "#FF6B1A" : "#FFF",
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  borderRadius: 18,
                  marginRight: 12,
                }}
              >
                <Text
                  style={{
                    color: index === 0 ? "#FFF" : "#555",
                    fontWeight: "bold",
                    fontSize: 16,
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        <View
          style={{
            marginTop: 24,
            backgroundColor: "#003B73",
            borderRadius: 20,
            padding: 22,
            minHeight: 250,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: "#1D6FE8",
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="star" size={14} color="#FFF" />
            <Text style={{ color: "#FFF", fontWeight: "bold" }}>DESTAQUE</Text>
          </View>
          <Text
            style={{
              color: "#FFF",
              fontSize: 24,
              fontWeight: "bold",
              marginTop: 22,
              lineHeight: 32,
            }}
          >
            IA na Educação:{"\n"}como a tecnologia está{"\n"}transformando o
            aprendizado
          </Text>
          <Text
            style={{
              color: "#E8F1FF",
              fontSize: 15,
              marginTop: 16,
              lineHeight: 22,
            }}
          >
            Ferramentas inteligentes ajudam alunos e professores a aprender e
            ensinar melhor.
          </Text>
          <Text style={{ color: "#FFF", marginTop: 24, fontWeight: "bold" }}>
            📅 20 MAI 2026 • 5 MIN LEITURA
          </Text>
        </View>

        <View
          style={{
            marginTop: 32,
            marginBottom: 14,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 23, fontWeight: "bold" }}>
            Últimas notícias
          </Text>
          <Text style={{ color: "#FF6B1A", fontWeight: "bold" }}>
            Ver todas ›
          </Text>
        </View>

        <NoticiaCard
          imagem="https://images.unsplash.com/photo-1509062522246-3755977927d7"
          categoria="EDUCAÇÃO"
          titulo="Metodologias ativas: o futuro do ensino já começou"
          descricao="Entenda como novas abordagens estão engajando mais os alunos."
          data="18 MAI 2026"
          tempo="4 MIN LEITURA"
        />
        <NoticiaCard
          imagem="https://images.unsplash.com/photo-1559757148-5c350d0d3c56"
          categoria="CIÊNCIA"
          titulo="Neurociência: como estudar melhor e memorizar mais"
          descricao="Dicas baseadas em ciência para aumentar sua concentração e retenção."
          data="17 MAI 2026"
          tempo="6 MIN LEITURA"
        />
        <NoticiaCard
          imagem="https://images.unsplash.com/photo-1515879218367-8466d910aaa4"
          categoria="TECNOLOGIA"
          titulo="5 habilidades tecnológicas que vão impulsionar sua carreira"
          descricao="Veja as competências mais valorizadas pelo mercado em 2026."
          data="16 MAI 2026"
          tempo="5 MIN LEITURA"
        />
        <NoticiaCard
          imagem="https://images.unsplash.com/photo-1523050854058-8df90110c9f1"
          categoria="CARREIRA"
          titulo="Como construir um portfólio que realmente se destaca"
          descricao="Dicas práticas para apresentar seus projetos e conquistar oportunidades."
          data="15 MAI 2026"
          tempo="4 MIN LEITURA"
        />
      </ScrollView>
    </View>
  );
}

function NoticiaCard({
  imagem,
  categoria,
  titulo,
  descricao,
  data,
  tempo,
}: any) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#EEE",
        borderRadius: 16,
        padding: 10,
        marginBottom: 12,
        backgroundColor: "#FFF",
      }}
    >
      <Image
        source={{ uri: imagem }}
        style={{ width: 120, height: 110, borderRadius: 12, marginRight: 12 }}
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text
            style={{
              backgroundColor: "#EAF2FF",
              color: "#0057B8",
              fontWeight: "bold",
              fontSize: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            {categoria}
          </Text>
          <Feather name="bookmark" size={22} color="#777" />
        </View>
        <Text style={{ fontSize: 16, fontWeight: "bold", marginTop: 8 }}>
          {titulo}
        </Text>
        <Text style={{ color: "#777", fontSize: 13, marginTop: 5 }}>
          {descricao}
        </Text>
        <Text style={{ color: "#777", fontSize: 12, marginTop: 8 }}>
          📅 {data} • {tempo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
