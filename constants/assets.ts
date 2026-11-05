/**
 * Módulo de Acesso Centralizado aos Ativos Visuais Oficiais — Orienta 2.0
 * Design System & Referências Visuais Oficiais (INDICE_REFERENCIAS.md)
 * 
 * Centraliza e padroniza a importação de ativos estáticos, evitando caminhos
 * hardcoded e referências frágeis entre as telas e componentes da aplicação.
 */
import { ImageSourcePropType } from "react-native";

export const Assets = {
  logo: {
    /** Logotipo Oficial Orienta Transparente (Referência IMG-004) */
    transparent: require("../assets/images/branding/IMG-004.png") as ImageSourcePropType,
    /** Logotipo Oficial Orienta com Fundo Branco (Referência IMG-003) */
    whiteBackground: require("../assets/images/branding/IMG-003.png") as ImageSourcePropType,
    /** Logotipo padrão (transparente) */
    default: require("../assets/images/branding/IMG-004.png") as ImageSourcePropType,
  },
  icons: {
    /** Ícone Oficial Google OAuth multicolorido (Referência IMG-002) */
    google: require("../assets/images/icons/IMG-002.png") as ImageSourcePropType,
  },
  backgrounds: {
    /** Wallpaper Oficial Ondas Âmbar intensas — Tela de Login (Referência IMG-019) */
    login: require("../assets/images/backgrounds/IMG-019.jpeg") as ImageSourcePropType,
    /** Wallpaper Oficial Ondas Suaves Claras — Tela de Cadastro (Referência IMG-020) */
    cadastro: require("../assets/images/backgrounds/IMG-020.jpeg") as ImageSourcePropType,
    /** Wallpaper Oficial Ondas Suaves Claras — Tela de Verificação (Referência IMG-020) */
    verificacao: require("../assets/images/backgrounds/IMG-020.jpeg") as ImageSourcePropType,
  },
} as const;

export type AssetsType = typeof Assets;

export default Assets;
