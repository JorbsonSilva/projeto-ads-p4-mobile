import { Feather, FontAwesome5 } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { LOCALIZACOES_PRESENCIAIS } from "../../constants/localizacoesPresenciais";
import { ProfessorPresencial } from "../../services/buscaPresencialService";

const TILE_SIZE = 256;
const ZOOM_INICIAL = 12;

interface Coordenadas {
  latitude: number;
  longitude: number;
}

interface Props {
  centro: Coordenadas;
  cidadeSelecionada: string;
  professores: ProfessorPresencial[];
  professorSelecionadoId: number | null;
  onSelecionarProfessor: (id: number) => void;
  onRecentralizar: () => void;
}

interface Tile {
  key: string;
  uri: string;
  left: number;
  top: number;
}

function projetarCoordenadas({ latitude, longitude }: Coordenadas, zoom: number) {
  const escala = TILE_SIZE * 2 ** zoom;
  const latitudeLimitada = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const seno = Math.sin((latitudeLimitada * Math.PI) / 180);

  return {
    x: ((longitude + 180) / 360) * escala,
    y: (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * escala,
  };
}

function obterPontoProfessor(regiao: string, cidadeSelecionada: string): Coordenadas | null {
  const candidatos = LOCALIZACOES_PRESENCIAIS.flatMap((cidade) =>
    cidade.regioes
      .filter((item) => item.nome.toLocaleLowerCase("pt-BR") === regiao.toLocaleLowerCase("pt-BR"))
      .map((item) => ({
        cidade: `${cidade.cidade} – ${cidade.estado}`,
        latitude: item.latitude,
        longitude: item.longitude,
      }))
  );

  if (candidatos.length === 0) return null;
  const cidadeDoPin = candidatos.find((item) => item.cidade === cidadeSelecionada);
  return cidadeDoPin ?? candidatos[0];
}

export default function MapaPresencial({
  centro,
  cidadeSelecionada,
  professores,
  professorSelecionadoId,
  onSelecionarProfessor,
  onRecentralizar,
}: Props) {
  const [dimensoes, setDimensoes] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(ZOOM_INICIAL);
  const centroProjetado = useMemo(() => projetarCoordenadas(centro, zoom), [centro, zoom]);

  const aoMedir = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensoes((atuais) =>
      atuais.width === width && atuais.height === height ? atuais : { width, height }
    );
  };

  const tiles = useMemo<Tile[]>(() => {
    if (dimensoes.width === 0 || dimensoes.height === 0) return [];

    const origemX = centroProjetado.x - dimensoes.width / 2;
    const origemY = centroProjetado.y - dimensoes.height / 2;
    const quantidadeTiles = 2 ** zoom;
    const primeiroX = Math.floor(origemX / TILE_SIZE);
    const ultimoX = Math.floor((origemX + dimensoes.width) / TILE_SIZE);
    const primeiroY = Math.floor(origemY / TILE_SIZE);
    const ultimoY = Math.floor((origemY + dimensoes.height) / TILE_SIZE);
    const resultado: Tile[] = [];

    for (let tileY = primeiroY; tileY <= ultimoY; tileY += 1) {
      if (tileY < 0 || tileY >= quantidadeTiles) continue;
      for (let tileX = primeiroX; tileX <= ultimoX; tileX += 1) {
        const xEmbrulhado = ((tileX % quantidadeTiles) + quantidadeTiles) % quantidadeTiles;
        resultado.push({
          key: `${zoom}-${xEmbrulhado}-${tileY}`,
          uri: `https://tile.openstreetmap.org/${zoom}/${xEmbrulhado}/${tileY}.png`,
          left: tileX * TILE_SIZE - origemX,
          top: tileY * TILE_SIZE - origemY,
        });
      }
    }

    return resultado;
  }, [centroProjetado, dimensoes, zoom]);

  const marcadores = useMemo(
    () =>
      professores.flatMap((professor) => {
        const ponto = obterPontoProfessor(professor.regiaoAtendimento, cidadeSelecionada);
        if (!ponto) return [];
        const projetado = projetarCoordenadas(ponto, zoom);
        const left = projetado.x - centroProjetado.x + dimensoes.width / 2;
        const top = projetado.y - centroProjetado.y + dimensoes.height / 2;

        if (
          left < -32 ||
          left > dimensoes.width + 32 ||
          top < -40 ||
          top > dimensoes.height + 40
        ) {
          return [];
        }

        return [{ professor, left, top }];
      }),
    [centroProjetado, cidadeSelecionada, dimensoes, professores, zoom]
  );

  return (
    <View style={estilos.mapa} onLayout={aoMedir} accessibilityLabel="Mapa de ruas reais">
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{
            uri: tile.uri,
            ...(Platform.OS === "web" ? {} : { headers: { "User-Agent": "Orienta Mobile/1.0" } }),
          }}
          style={[estilos.tile, { left: tile.left, top: tile.top }]}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
      ))}

      <View style={estilos.pontoUsuario}>
        <View style={estilos.pulsoUsuario} />
        <View style={estilos.nucleoUsuario} />
        <View style={estilos.balaoUsuario}>
          <Text style={estilos.textoBalao}>Você está aqui</Text>
        </View>
      </View>

      {marcadores.map(({ professor, left, top }) => {
        const selecionado = professorSelecionadoId === professor.id;
        return (
          <TouchableOpacity
            key={professor.id}
            style={[
              estilos.pinProfessor,
              { left: left - 16, top: top - 16 },
              selecionado && estilos.pinSelecionado,
            ]}
            onPress={() => onSelecionarProfessor(professor.id)}
            accessibilityLabel={`Professor ${professor.nome}, região ${professor.regiaoAtendimento}`}
            accessibilityRole="button"
          >
            <FontAwesome5 name="graduation-cap" size={13} color="#FFFFFF" />
            {selecionado && (
              <View style={estilos.tooltipPin}>
                <Text style={estilos.tooltipNome} numberOfLines={1}>
                  {professor.nome}
                </Text>
                <Text style={estilos.tooltipRegiao} numberOfLines={1}>
                  {professor.regiaoAtendimento}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={estilos.controles}>
        <TouchableOpacity
          style={estilos.botaoControle}
          onPress={() => setZoom((atual) => Math.min(16, atual + 1))}
          accessibilityLabel="Aumentar zoom do mapa"
        >
          <Feather name="plus" size={19} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity
          style={estilos.botaoControle}
          onPress={() => setZoom((atual) => Math.max(10, atual - 1))}
          accessibilityLabel="Diminuir zoom do mapa"
        >
          <Feather name="minus" size={19} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity
          style={estilos.botaoControle}
          onPress={onRecentralizar}
          accessibilityLabel="Centralizar mapa na minha localização"
        >
          <Feather name="crosshair" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <View style={estilos.atribuicao}>
        <Text style={estilos.textoAtribuicao}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  mapa: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E8EEF1",
  },
  tile: {
    position: "absolute",
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  pontoUsuario: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    alignItems: "center",
    justifyContent: "center",
  },
  pulsoUsuario: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.35)",
  },
  nucleoUsuario: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2563EB",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 3,
  },
  balaoUsuario: {
    position: "absolute",
    bottom: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#0F2942",
  },
  textoBalao: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  pinProfessor: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B1A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
  },
  pinSelecionado: {
    backgroundColor: "#0F172A",
    borderColor: "#FF6B1A",
    zIndex: 2,
  },
  tooltipPin: {
    position: "absolute",
    bottom: 34,
    left: -48,
    width: 128,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#0F172A",
  },
  tooltipNome: {
    maxWidth: 112,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tooltipRegiao: {
    color: "#FDBA74",
    fontSize: 9,
  },
  controles: {
    position: "absolute",
    right: 10,
    top: 10,
    gap: 6,
  },
  botaoControle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },
  atribuicao: {
    position: "absolute",
    bottom: 0,
    left: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  textoAtribuicao: {
    color: "#334155",
    fontSize: 9,
  },
});
