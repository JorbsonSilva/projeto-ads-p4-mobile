import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

interface AvatarPerfilProps {
  nome: string;
  fotoUrl?: string | null;
  tamanho: number;
}

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toLocaleUpperCase("pt-BR"))
    .join("") || "?";
}

export default function AvatarPerfil({
  nome,
  fotoUrl,
  tamanho,
}: AvatarPerfilProps) {
  const [imagemIndisponivel, setImagemIndisponivel] = useState(false);

  useEffect(() => {
    setImagemIndisponivel(false);
  }, [fotoUrl]);

  const estiloCircular = {
    width: tamanho,
    height: tamanho,
    borderRadius: tamanho / 2,
  };

  if (fotoUrl && !imagemIndisponivel) {
    return (
      <Image
        source={{ uri: fotoUrl }}
        style={estiloCircular}
        onError={() => setImagemIndisponivel(true)}
        accessibilityLabel={`Foto de ${nome}`}
      />
    );
  }

  return (
    <View
      style={[
        estiloCircular,
        {
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFF1E8",
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Avatar de ${nome}`}
    >
      <Text
        style={{
          color: "#C2410C",
          fontSize: Math.max(12, tamanho * 0.34),
          fontWeight: "700",
        }}
      >
        {iniciais(nome)}
      </Text>
    </View>
  );
}
