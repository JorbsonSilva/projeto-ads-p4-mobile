/**
 * @file busca-professores.tsx
 * @description Tela de Busca Avançada de Professores - Orienta 2.0 [ORI-009].
 * Implementada com total fidelidade à especificação visual IMG-007.
 * 
 * Funcionalidades:
 * - Cabeçalho com fechamento instantâneo e barra de busca integrada
 * - Seção "Buscas populares" com chips temáticos (Matemática, Física, Programação, Redação, Química, Biologia, Idiomas)
 * - Grade de filtros suspensos (dropdowns): Matéria, Disponibilidade, Formato da aula, Faixa de preço, Nível de ensino e Mais filtros
 * - Barra de ordenação ("Mais relevantes", "Menor preço", "Maior preço", "Melhor avaliação") e contador dinâmico de professores
 * - Cards ricos de professores: foto com indicador online, selo verificado, botão de favoritar interativo, estrelas de avaliação, badges de status/modalidade, preço horário destacado e clique navegando para /professor/[id]
 * - Banner institucional de rodapé: "Não encontrou o que procura? Crie uma solicitação personalizada"
 * - Preservação de toda a lógica existente: busca textual, API de saberes, busca por proximidade/raio GPS (Fase 8 / MAP), consentimento LGPD e fallback robusto para DEMO_PROFESSORES.
 */

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Componentes Unificados do Design System (ORI-000 a ORI-003)
import { Card, Badge, Chip, Button } from "../components/ui";
import { Theme } from "../constants/theme";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { DEMO_PROFESSORES } from "../data/demoData";

// ==========================================
// 1. CONTRATOS DE TIPAGEM (INTERFACES TS)
// ==========================================

interface Saber {
  id: number;
  nome: string;
}

interface Aptidao {
  saber: Saber;
  precoHora: number;
}

interface ProfessorBusca {
  id: number;
  nome: string;
  notaMedia?: number;
  totalAvaliacoes?: number;
  fotoUrl?: string;
  oferecePresencial?: boolean;
  regiaoAtendimento?: string;
  distanciaAproximadaKm?: number;
  textoProximidade?: string;
  nivelEnsino?: string;
  disponibilidade?: string;
  aptidoes?: Aptidao[];
}

// Lista rica de professores demonstrativos para cobrir todas as categorias da IMG-007
const PROFESSORES_DEMO_EXPANDIDOS: ProfessorBusca[] = [
  {
    id: 101,
    nome: "Prof. Lucas Rocha",
    notaMedia: 4.9,
    totalAvaliacoes: 128,
    fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Campus Central / Online",
    distanciaAproximadaKm: 2.4,
    textoProximidade: "A 2,4 km de você",
    nivelEnsino: "Superior",
    disponibilidade: "Hoje",
    aptidoes: [
      { saber: { id: 1, nome: "Matemática" }, precoHora: 40.0 },
      { saber: { id: 5, nome: "Cálculo Diferencial" }, precoHora: 50.0 },
    ],
  },
  {
    id: 102,
    nome: "Profa. Ana Clara",
    notaMedia: 4.8,
    totalAvaliacoes: 96,
    fotoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Zona Sul / Online",
    distanciaAproximadaKm: 3.8,
    textoProximidade: "A 3,8 km de você",
    nivelEnsino: "Ensino Médio",
    disponibilidade: "Hoje",
    aptidoes: [
      { saber: { id: 4, nome: "Biologia" }, precoHora: 45.0 },
      { saber: { id: 7, nome: "Ciências Naturais" }, precoHora: 45.0 },
    ],
  },
  {
    id: 103,
    nome: "Prof. Rafael Lima",
    notaMedia: 4.9,
    totalAvaliacoes: 152,
    fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: false,
    regiaoAtendimento: "Sala Virtual Exclusiva",
    distanciaAproximadaKm: 0,
    textoProximidade: "100% Online",
    nivelEnsino: "Superior",
    disponibilidade: "Hoje",
    aptidoes: [
      { saber: { id: 2, nome: "Programação" }, precoHora: 50.0 },
      { saber: { id: 8, nome: "Python & Java" }, precoHora: 55.0 },
    ],
  },
  {
    id: 104,
    nome: "Profa. Mariana Costa",
    notaMedia: 5.0,
    totalAvaliacoes: 84,
    fotoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Boa Viagem / Online",
    distanciaAproximadaKm: 4.5,
    textoProximidade: "A 4,5 km de você",
    nivelEnsino: "Preparatório / Concursos",
    disponibilidade: "Amanhã",
    aptidoes: [
      { saber: { id: 9, nome: "Redação" }, precoHora: 60.0 },
      { saber: { id: 10, nome: "Gramática ENEM" }, precoHora: 55.0 },
    ],
  },
  {
    id: 105,
    nome: "Prof. Gabriel Torres",
    notaMedia: 4.7,
    totalAvaliacoes: 62,
    fotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Centro / Online",
    distanciaAproximadaKm: 1.8,
    textoProximidade: "A 1,8 km de você",
    nivelEnsino: "Ensino Médio",
    disponibilidade: "Hoje",
    aptidoes: [
      { saber: { id: 3, nome: "Física" }, precoHora: 50.0 },
      { saber: { id: 11, nome: "Física Mecânica" }, precoHora: 55.0 },
    ],
  },
  {
    id: 106,
    nome: "Profa. Beatriz Silveira",
    notaMedia: 4.9,
    totalAvaliacoes: 110,
    fotoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: false,
    regiaoAtendimento: "Sala Virtual Exclusiva",
    distanciaAproximadaKm: 0,
    textoProximidade: "100% Online",
    nivelEnsino: "Ensino Médio",
    disponibilidade: "Esta semana",
    aptidoes: [
      { saber: { id: 12, nome: "Química" }, precoHora: 45.0 },
      { saber: { id: 13, nome: "Química Orgânica" }, precoHora: 50.0 },
    ],
  },
  {
    id: 107,
    nome: "Prof. David Miller",
    notaMedia: 4.9,
    totalAvaliacoes: 95,
    fotoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
    oferecePresencial: false,
    regiaoAtendimento: "Sala Virtual Exclusiva",
    distanciaAproximadaKm: 0,
    textoProximidade: "100% Online",
    nivelEnsino: "Todos os níveis",
    disponibilidade: "Hoje",
    aptidoes: [
      { saber: { id: 14, nome: "Inglês" }, precoHora: 65.0 },
      { saber: { id: 15, nome: "Conversação TOEFL" }, precoHora: 70.0 },
    ],
  },
];

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================

export default function BuscaProfessores() {
  const { usuarioId, carregandoAuth } = useAuth() as any;

  // Captura parâmetro de rota enviado pela Home (ex: categoria=Matemática)
  const { categoria } = useLocalSearchParams<{ categoria?: string }>();

  // ==========================================
  // ESTADOS DE DADOS
  // ==========================================
  const [professoresBanco, setProfessoresBanco] = useState<ProfessorBusca[]>(
    PROFESSORES_DEMO_EXPANDIDOS,
  );
  const [professoresFiltrados, setProfessoresFiltrados] = useState<
    ProfessorBusca[]
  >(PROFESSORES_DEMO_EXPANDIDOS);
  const [saberes, setSaberes] = useState<string[]>([
    "Todas as matérias",
    "Matemática",
    "Física",
    "Programação",
    "Redação",
    "Química",
    "Biologia",
    "Inglês",
  ]);
  const [carregando, setCarregando] = useState(false);
  const [favoritos, setFavoritos] = useState<Record<number, boolean>>({});

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [paginaMaximaVisivel, setPaginaMaximaVisivel] = useState(1);
  const [temMaisPaginas, setTemMaisPaginas] = useState(true);
  const PAGE_SIZE = 10;

  // ==========================================
  // ESTADOS DE FILTRO
  // ==========================================
  const [busca, setBusca] = useState("");
  const [filtroMateria, setFiltroMateria] = useState<string>(
    categoria || "Todas as matérias",
  );
  const [filtroDisponibilidade, setFiltroDisponibilidade] = useState<string>("Todas");
  const [filtroFormato, setFiltroFormato] = useState<"TODAS" | "ONLINE" | "PRESENCIAL">("TODAS");
  const [filtroPrecoMax, setFiltroPrecoMax] = useState<number>(150);
  const [filtroNivelEnsino, setFiltroNivelEnsino] = useState<string>("Todos");
  const [ordenacao, setOrdenacao] = useState<
    "maisRelevantes" | "maisBarato" | "maisCaro" | "melhorAvaliado"
  >("maisRelevantes");

  // ==========================================
  // ESTADOS DE LOCALIZAÇÃO E RAIO (FASE 8 / MAP)
  // ==========================================
  const [raioKm, setRaioKm] = useState<number>(10);
  const [regiaoBusca, setRegiaoBusca] = useState<string>("");
  const [coordenadasAluno, setCoordenadasAluno] = useState<{ latitude: number; longitude: number } | null>(null);
  const [localizacaoAtiva, setLocalizacaoAtiva] = useState(false);
  const [solicitandoLocalizacao, setSolicitandoLocalizacao] = useState(false);

  // Estados dos Modais Suspensos da IMG-007
  const [modalMateriaVisivel, setModalMateriaVisivel] = useState(false);
  const [modalDisponibilidadeVisivel, setModalDisponibilidadeVisivel] = useState(false);
  const [modalFormatoVisivel, setModalFormatoVisivel] = useState(false);
  const [modalPrecoVisivel, setModalPrecoVisivel] = useState(false);
  const [modalNivelVisivel, setModalNivelVisivel] = useState(false);
  const [modalMaisFiltrosVisivel, setModalMaisFiltrosVisivel] = useState(false);
  const [modalOrdenacaoVisivel, setModalOrdenacaoVisivel] = useState(false);
  const [modalPrivacidadeVisivel, setModalPrivacidadeVisivel] = useState(false);

  // Monitora parâmetro de rota enviado pela Home
  useEffect(() => {
    if (categoria) {
      setFiltroMateria(categoria);
    }
  }, [categoria]);

  // Alternador de favorito com feedback visual
  const toggleFavorito = (id: number) => {
    setFavoritos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  /**
   * Solicita e ativa a geolocalização com consentimento explícito
   */
  const ativarLocalizacaoAluno = () => {
    setSolicitandoLocalizacao(true);

    if (typeof window !== "undefined" && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordenadasAluno({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setLocalizacaoAtiva(true);
          setSolicitandoLocalizacao(false);
          setFiltroFormato("PRESENCIAL");
        },
        (erro) => {
          console.warn("Localização não obtida via GPS:", erro.message);
          setCoordenadasAluno({
            latitude: -8.063169,
            longitude: -34.871139,
          });
          setLocalizacaoAtiva(true);
          setSolicitandoLocalizacao(false);
          setFiltroFormato("PRESENCIAL");
        },
        { enableHighAccuracy: false, timeout: 6000 }
      );
    } else {
      setCoordenadasAluno({
        latitude: -8.063169,
        longitude: -34.871139,
      });
      setLocalizacaoAtiva(true);
      setSolicitandoLocalizacao(false);
      setFiltroFormato("PRESENCIAL");
    }
  };

  const desativarLocalizacaoAluno = () => {
    setCoordenadasAluno(null);
    setLocalizacaoAtiva(false);
  };

  /**
   * Dispara a requisição para buscar os professores no backend Spring Boot
   */
  const buscarProfessoresPagina = useCallback(
    async (page: number) => {
      setCarregando(true);

      try {
        const params = new URLSearchParams();
        if (filtroFormato && filtroFormato !== "TODAS") params.append("modalidade", filtroFormato);
        if (filtroMateria && filtroMateria !== "Todas as matérias") params.append("termo", filtroMateria);
        if (busca.trim()) params.append("termo", busca.trim());
        if (regiaoBusca.trim()) params.append("regiao", regiaoBusca.trim());
        if (filtroPrecoMax) params.append("precoMax", filtroPrecoMax.toString());

        if (coordenadasAluno && filtroFormato === "PRESENCIAL") {
          params.append("latitude", coordenadasAluno.latitude.toString());
          params.append("longitude", coordenadasAluno.longitude.toString());
          params.append("raioKm", raioKm.toString());
        }

        const urlBusca = `${API_URL}/api/v1/usuarios/professores/busca?${params.toString()}`;
        let resProfs = await fetch(urlBusca);

        if (!resProfs.ok && usuarioId) {
          resProfs = await fetch(`${API_URL}/api/usuarios/professores/destaque/${usuarioId}`);
        }

        if (resProfs.ok) {
          const json = await resProfs.json();
          const dadosProfs: ProfessorBusca[] = Array.isArray(json)
            ? json
            : json.dados || json.data || [];

          if (dadosProfs.length > 0) {
            setProfessoresBanco(dadosProfs);
            setProfessoresFiltrados(dadosProfs);
          } else {
            setProfessoresBanco(PROFESSORES_DEMO_EXPANDIDOS);
            setProfessoresFiltrados(PROFESSORES_DEMO_EXPANDIDOS);
          }
          setPaginaAtual(page);
          setPaginaMaximaVisivel(Math.max(1, Math.ceil((dadosProfs.length || PROFESSORES_DEMO_EXPANDIDOS.length) / PAGE_SIZE)));
        } else {
          setProfessoresBanco(PROFESSORES_DEMO_EXPANDIDOS);
          setProfessoresFiltrados(PROFESSORES_DEMO_EXPANDIDOS);
        }
      } catch {
        setProfessoresBanco(PROFESSORES_DEMO_EXPANDIDOS);
        setProfessoresFiltrados(PROFESSORES_DEMO_EXPANDIDOS);
      } finally {
        setCarregando(false);
      }
    },
    [usuarioId, filtroFormato, filtroMateria, busca, regiaoBusca, filtroPrecoMax, coordenadasAluno, raioKm],
  );

  const handleFecharBusca = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  // Efeito 1: Busca inicial no banco / saberes
  useEffect(() => {
    let cancelado = false;

    const buscarDadosIniciais = async () => {
      setCarregando(true);
      try {
        const resSaberes = await fetch(`${API_URL}/api/saberes`);
        if (!cancelado && resSaberes.ok) {
          const dadosSaberes: Saber[] = await resSaberes.json();
          const nomesSaberes = dadosSaberes.map((s) => s.nome);
          setSaberes(["Todas as matérias", ...nomesSaberes]);
        }
      } catch {
        // Fallback silencioso mantendo saberes padrões
      }

      await buscarProfessoresPagina(1);
      if (!cancelado) setCarregando(false);
    };

    buscarDadosIniciais();

    return () => {
      cancelado = true;
    };
  }, [buscarProfessoresPagina]);

  // Efeito 2: Motor de filtragem e ordenação client-side
  useEffect(() => {
    let resultado = [...professoresBanco];

    // 1. Filtro textual
    if (busca.trim() !== "") {
      const termo = busca.toLowerCase();
      resultado = resultado.filter((prof) => {
        const nomeProf = prof.nome?.toLowerCase() || "";
        const materias = (prof.aptidoes || []).map((a) => a.saber?.nome?.toLowerCase() || "");
        return nomeProf.includes(termo) || materias.some((m) => m.includes(termo));
      });
    }

    // 2. Filtro por Matéria
    if (filtroMateria !== "Todas as matérias" && filtroMateria !== "Todas") {
      resultado = resultado.filter((prof) => {
        const materias = (prof.aptidoes || []).map((a) => a.saber?.nome?.toLowerCase() || "");
        return materias.some((m) => m.includes(filtroMateria.toLowerCase()));
      });
    }

    // 3. Filtro por Formato (Online / Presencial)
    if (filtroFormato === "ONLINE") {
      resultado = resultado.filter((prof) => !prof.oferecePresencial || prof.regiaoAtendimento?.includes("Online"));
    } else if (filtroFormato === "PRESENCIAL") {
      resultado = resultado.filter((prof) => prof.oferecePresencial);
    }

    // 4. Filtro por Disponibilidade
    if (filtroDisponibilidade !== "Todas") {
      resultado = resultado.filter((prof) => {
        if (!prof.disponibilidade) return true;
        return prof.disponibilidade.toLowerCase().includes(filtroDisponibilidade.toLowerCase());
      });
    }

    // 5. Filtro por Nível de Ensino
    if (filtroNivelEnsino !== "Todos") {
      resultado = resultado.filter((prof) => {
        if (!prof.nivelEnsino) return true;
        return prof.nivelEnsino.toLowerCase().includes(filtroNivelEnsino.toLowerCase()) || prof.nivelEnsino === "Todos os níveis";
      });
    }

    // 6. Filtro por Preço Máximo
    resultado = resultado.filter((prof) => {
      const menorPreco = Math.min(...(prof.aptidoes?.map((a) => a.precoHora) || [40]));
      return menorPreco <= filtroPrecoMax;
    });

    // 7. Ordenação
    if (ordenacao === "maisBarato") {
      resultado.sort((a, b) => {
        const precoA = a.aptidoes?.[0]?.precoHora || 0;
        const precoB = b.aptidoes?.[0]?.precoHora || 0;
        return precoA - precoB;
      });
    } else if (ordenacao === "maisCaro") {
      resultado.sort((a, b) => {
        const precoA = a.aptidoes?.[0]?.precoHora || 0;
        const precoB = b.aptidoes?.[0]?.precoHora || 0;
        return precoB - precoA;
      });
    } else if (ordenacao === "melhorAvaliado") {
      resultado.sort((a, b) => (b.notaMedia || 0) - (a.notaMedia || 0));
    }

    setProfessoresFiltrados(resultado);
  }, [
    busca,
    filtroMateria,
    filtroFormato,
    filtroDisponibilidade,
    filtroNivelEnsino,
    filtroPrecoMax,
    ordenacao,
    professoresBanco,
  ]);

  // Lista de buscas populares oficiais da IMG-007
  const buscasPopulares = [
    { label: "Matemática", icon: <Feather name="book-open" size={13} color={busca === "Matemática" || filtroMateria === "Matemática" ? "#FF5A1F" : "#64748B"} /> },
    { label: "Física", icon: <Feather name="zap" size={13} color={busca === "Física" || filtroMateria === "Física" ? "#FF5A1F" : "#64748B"} /> },
    { label: "Programação", icon: <Feather name="code" size={13} color={busca === "Programação" || filtroMateria === "Programação" ? "#FF5A1F" : "#64748B"} /> },
    { label: "Redação", icon: <Feather name="edit-3" size={13} color={busca === "Redação" || filtroMateria === "Redação" ? "#FF5A1F" : "#64748B"} /> },
    { label: "Química", icon: <Feather name="disc" size={13} color={busca === "Química" || filtroMateria === "Química" ? "#FF5A1F" : "#64748B"} /> },
    { label: "Biologia", icon: <Feather name="feather" size={13} color={busca === "Biologia" || filtroMateria === "Biologia" ? "#FF5A1F" : "#64748B"} /> },
    { label: "Inglês", icon: <Feather name="globe" size={13} color={busca === "Inglês" || filtroMateria === "Inglês" ? "#FF5A1F" : "#64748B"} /> },
  ];

  // Helper para resetar filtros
  const temFiltroAtivo =
    busca.trim() !== "" ||
    (filtroMateria !== "Todas as matérias" && filtroMateria !== "Todas") ||
    filtroFormato !== "TODAS" ||
    filtroDisponibilidade !== "Todas" ||
    filtroNivelEnsino !== "Todos" ||
    filtroPrecoMax < 150;

  const resetarFiltros = () => {
    setBusca("");
    setFiltroMateria("Todas as matérias");
    setFiltroFormato("TODAS");
    setFiltroDisponibilidade("Todas");
    setFiltroNivelEnsino("Todos");
    setFiltroPrecoMax(150);
    setOrdenacao("maisRelevantes");
  };

  return (
    <View style={estilos.telaContainer}>
      {/* ==================================================== */}
      {/* 1. CABEÇALHO COM FECHAMENTO E BUSCA INTEGRADA (IMG-007) */}
      {/* ==================================================== */}
      <View style={estilos.cabecalhoFixo}>
        <View style={estilos.cabecalhoTopo}>
          <TouchableOpacity
            onPress={handleFecharBusca}
            style={estilos.botaoFechar}
            accessibilityLabel="Fechar busca e voltar para a tela inicial"
            accessibilityRole="button"
          >
            <Feather name="x" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={estilos.tituloCabecalho}>Buscar professores</Text>
          {temFiltroAtivo ? (
            <TouchableOpacity onPress={resetarFiltros} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={estilos.textoLimparFiltros}>Limpar</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        {/* Barra de Pesquisa Integrada */}
        <View style={estilos.barraBuscaContainer}>
          <Feather name="search" size={20} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar professores, matérias ou habilidades..."
            placeholderTextColor="#94A3B8"
            style={estilos.campoBuscaInput}
            returnKeyType="search"
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scrollConteudo}
      >
        {/* Atalho Oficial para Busca Presencial com Mapa (ORI-009B) */}
        <TouchableOpacity
          style={estilos.atalhoBuscaPresencial}
          onPress={() => router.push("/busca-presencial" as any)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="map" size={16} color="#FF6B1A" style={{ marginRight: 8 }} />
            <Text style={estilos.textoAtalhoPresencial}>
              Ver Busca Presencial no Mapa (ORI-009B)
            </Text>
          </View>
          <Feather name="arrow-right" size={16} color="#FF6B1A" />
        </TouchableOpacity>

        {/* ==================================================== */}
        {/* 2. SEÇÃO DE BUSCAS POPULARES (CHIPS TEMÁTICOS) */}
        {/* ==================================================== */}
        <View style={estilos.secaoBuscasPopulares}>
          <Text style={estilos.tituloSecao}>Buscas populares</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.scrollChipsConteudo}
          >
            {buscasPopulares.map((item) => {
              const selecionado = busca === item.label || filtroMateria === item.label;
              return (
                <Chip
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  selected={selecionado}
                  variant={selecionado ? "filled" : "subtle"}
                  size="md"
                  style={{ marginRight: 8 }}
                  onPress={() => {
                    if (selecionado) {
                      setBusca("");
                      setFiltroMateria("Todas as matérias");
                    } else {
                      setBusca(item.label);
                      setFiltroMateria(item.label);
                    }
                  }}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* ==================================================== */}
        {/* 3. GRADE DE FILTROS SUSPENSOS (DROPDOWNS DA IMG-007) */}
        {/* ==================================================== */}
        <View style={estilos.secaoFiltrosSuspensos}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.scrollFiltrosHorizontais}
          >
            {/* Dropdown 1: Matéria */}
            <TouchableOpacity
              style={[
                estilos.botaoDropdownFiltro,
                filtroMateria !== "Todas as matérias" && filtroMateria !== "Todas" && estilos.botaoDropdownAtivo,
              ]}
              onPress={() => setModalMateriaVisivel(true)}
            >
              <Text
                style={[
                  estilos.textoDropdownFiltro,
                  filtroMateria !== "Todas as matérias" && filtroMateria !== "Todas" && estilos.textoDropdownAtivo,
                ]}
                numberOfLines={1}
              >
                {filtroMateria === "Todas as matérias" ? "Todas as matérias" : filtroMateria}
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color={filtroMateria !== "Todas as matérias" && filtroMateria !== "Todas" ? "#FF5A1F" : "#64748B"}
              />
            </TouchableOpacity>

            {/* Dropdown 2: Disponibilidade */}
            <TouchableOpacity
              style={[
                estilos.botaoDropdownFiltro,
                filtroDisponibilidade !== "Todas" && estilos.botaoDropdownAtivo,
              ]}
              onPress={() => setModalDisponibilidadeVisivel(true)}
            >
              <Text
                style={[
                  estilos.textoDropdownFiltro,
                  filtroDisponibilidade !== "Todas" && estilos.textoDropdownAtivo,
                ]}
              >
                {filtroDisponibilidade === "Todas" ? "Disponibilidade" : filtroDisponibilidade}
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color={filtroDisponibilidade !== "Todas" ? "#FF5A1F" : "#64748B"}
              />
            </TouchableOpacity>

            {/* Dropdown 3: Formato da Aula */}
            <TouchableOpacity
              style={[
                estilos.botaoDropdownFiltro,
                filtroFormato !== "TODAS" && estilos.botaoDropdownAtivo,
              ]}
              onPress={() => setModalFormatoVisivel(true)}
            >
              <Text
                style={[
                  estilos.textoDropdownFiltro,
                  filtroFormato !== "TODAS" && estilos.textoDropdownAtivo,
                ]}
              >
                {filtroFormato === "TODAS"
                  ? "Formato da aula"
                  : filtroFormato === "ONLINE"
                  ? "100% Online"
                  : "Presencial"}
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color={filtroFormato !== "TODAS" ? "#FF5A1F" : "#64748B"}
              />
            </TouchableOpacity>

            {/* Dropdown 4: Faixa de Preço */}
            <TouchableOpacity
              style={[
                estilos.botaoDropdownFiltro,
                filtroPrecoMax < 150 && estilos.botaoDropdownAtivo,
              ]}
              onPress={() => setModalPrecoVisivel(true)}
            >
              <Text
                style={[
                  estilos.textoDropdownFiltro,
                  filtroPrecoMax < 150 && estilos.textoDropdownAtivo,
                ]}
              >
                {filtroPrecoMax >= 150 ? "Faixa de preço" : `Até R$ ${filtroPrecoMax}/h`}
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color={filtroPrecoMax < 150 ? "#FF5A1F" : "#64748B"}
              />
            </TouchableOpacity>

            {/* Dropdown 5: Nível de Ensino */}
            <TouchableOpacity
              style={[
                estilos.botaoDropdownFiltro,
                filtroNivelEnsino !== "Todos" && estilos.botaoDropdownAtivo,
              ]}
              onPress={() => setModalNivelVisivel(true)}
            >
              <Text
                style={[
                  estilos.textoDropdownFiltro,
                  filtroNivelEnsino !== "Todos" && estilos.textoDropdownAtivo,
                ]}
              >
                {filtroNivelEnsino === "Todos" ? "Nível de ensino" : filtroNivelEnsino}
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color={filtroNivelEnsino !== "Todos" ? "#FF5A1F" : "#64748B"}
              />
            </TouchableOpacity>

            {/* Dropdown 6: Mais Filtros (Raio / GPS) */}
            <TouchableOpacity
              style={[
                estilos.botaoDropdownFiltro,
                (localizacaoAtiva || regiaoBusca.trim() !== "") && estilos.botaoDropdownAtivo,
              ]}
              onPress={() => setModalMaisFiltrosVisivel(true)}
            >
              <Feather
                name="sliders"
                size={14}
                color={localizacaoAtiva || regiaoBusca.trim() !== "" ? "#FF5A1F" : "#64748B"}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  estilos.textoDropdownFiltro,
                  (localizacaoAtiva || regiaoBusca.trim() !== "") && estilos.textoDropdownAtivo,
                ]}
              >
                Mais filtros
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color={localizacaoAtiva || regiaoBusca.trim() !== "" ? "#FF5A1F" : "#64748B"}
              />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ==================================================== */}
        {/* 4. BARRA DE ORDENAÇÃO E CONTADOR DINÂMICO (IMG-007) */}
        {/* ==================================================== */}
        <View style={estilos.barraContadorEOrdenacao}>
          <Text style={estilos.textoContadorProfessores}>
            {carregando
              ? "Buscando professores..."
              : `${professoresFiltrados.length} professores encontrados`}
          </Text>

          <TouchableOpacity
            style={estilos.botaoOrdenacao}
            onPress={() => setModalOrdenacaoVisivel(true)}
          >
            <Text style={estilos.textoRotuloOrdenar}>Ordenar por: </Text>
            <Text style={estilos.textoValorOrdenar}>
              {ordenacao === "maisRelevantes"
                ? "Mais relevantes"
                : ordenacao === "maisBarato"
                ? "Menor preço"
                : ordenacao === "maisCaro"
                ? "Maior preço"
                : "Melhor avaliação"}
            </Text>
            <Feather name="chevron-down" size={14} color="#0F172A" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* ==================================================== */}
        {/* 5. LISTA DE CARDS DE PROFESSORES (CARD OFICIAL ORI-003) */}
        {/* ==================================================== */}
        <View style={estilos.listaProfessoresContainer}>
          {carregando ? (
            <View style={estilos.loadingContainer}>
              <ActivityIndicator size="large" color="#FF5A1F" />
              <Text style={estilos.textoCarregando}>Carregando professores...</Text>
            </View>
          ) : professoresFiltrados.length === 0 ? (
            <View style={estilos.containerVazio}>
              <View style={estilos.iconeVazioWrapper}>
                <Feather name="search" size={32} color="#94A3B8" />
              </View>
              <Text style={estilos.tituloVazio}>Nenhum professor encontrado</Text>
              <Text style={estilos.descricaoVazio}>
                Tente ajustar os filtros, pesquisar por outra matéria ou limpar a busca.
              </Text>
              <TouchableOpacity style={estilos.botaoLimparVazio} onPress={resetarFiltros}>
                <Text style={estilos.textoBotaoLimparVazio}>Limpar todos os filtros</Text>
              </TouchableOpacity>
            </View>
          ) : (
            professoresFiltrados.map((prof) => {
              const precoFormatado = (
                prof.aptidoes?.[0]?.precoHora || 40
              ).toFixed(2).replace(".", ",");
              const notaFormatada = (prof.notaMedia || 4.9).toFixed(1).replace(".", ",");
              const ehFavorito = !!favoritos[prof.id];

              return (
                <Card
                  key={prof.id}
                  variant="default"
                  onPress={() => router.push(`/professor/${prof.id}` as any)}
                  style={estilos.cardProfessor}
                  accessibilityLabel={`Perfil de ${prof.nome}, ${prof.aptidoes?.[0]?.saber?.nome || "Professor"}`}
                >
                  <View style={estilos.cardCorpoPrincipal}>
                    {/* Avatar com status online verde */}
                    <View style={estilos.avatarContainer}>
                      <Image
                        source={{
                          uri: prof.fotoUrl || `https://i.pravatar.cc/150?u=${prof.id}`,
                        }}
                        style={estilos.avatarImagem}
                      />
                      <View style={estilos.indicadorOnlineVerde} />
                    </View>

                    {/* Informações centrais */}
                    <View style={estilos.colunaInformacoes}>
                      {/* Linha 1: Nome + Verificado + Favorito */}
                      <View style={estilos.linhaNomeEFavorito}>
                        <View style={estilos.grupoNome}>
                          <Text style={estilos.textoNomeProfessor} numberOfLines={1}>
                            {prof.nome}
                          </Text>
                          <MaterialIcons
                            name="verified"
                            size={16}
                            color="#0284C7"
                            style={{ marginLeft: 4 }}
                          />
                        </View>

                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            toggleFavorito(prof.id);
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={estilos.botaoFavorito}
                          accessibilityLabel={ehFavorito ? "Desfavoritar" : "Favoritar"}
                        >
                          <Ionicons
                            name={ehFavorito ? "heart" : "heart-outline"}
                            size={20}
                            color={ehFavorito ? "#EF4444" : "#94A3B8"}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Linha 2: Matéria lecionada */}
                      <Text style={estilos.textoEspecialidade} numberOfLines={1}>
                        {prof.aptidoes?.[0]?.saber?.nome || "Matemática"}
                      </Text>

                      {/* Linha 3: Avaliação com estrelas */}
                      <View style={estilos.linhaAvaliacao}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={estilos.textoNotaMedia}>
                          {notaFormatada}{" "}
                          <Text style={estilos.textoTotalAvaliacoes}>
                            ({prof.totalAvaliacoes || 128} avaliações)
                          </Text>
                        </Text>
                      </View>

                      {/* Linha 4: Badges de status e modalidade */}
                      <View style={estilos.grupoBadges}>
                        <Badge
                          variant="success"
                          size="sm"
                          dot
                          label="Disponível hoje"
                        />
                        {prof.oferecePresencial ? (
                          <Badge
                            variant="info"
                            size="sm"
                            icon={<Feather name="map-pin" size={10} color="#0284C7" />}
                            label={prof.textoProximidade || prof.regiaoAtendimento || "Presencial"}
                          />
                        ) : (
                          <Badge
                            variant="neutral"
                            size="sm"
                            icon={<Feather name="monitor" size={10} color="#475569" />}
                            label="100% Online"
                          />
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Linha Inferior: Preço em destaque */}
                  <View style={estilos.linhaPrecoRodape}>
                    <Text style={estilos.textoRotuloPreco}>A partir de</Text>
                    <View style={estilos.grupoPrecoValor}>
                      <Text style={estilos.textoValorPreco}>R$ {precoFormatado}</Text>
                      <Text style={estilos.textoSufixoHora}>/h</Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}

          {/* ==================================================== */}
          {/* 6. BANNER INSTITUCIONAL DE RODAPÉ (IMG-007) */}
          {/* ==================================================== */}
          <Card variant="elevated" style={estilos.cardBannerSolicitacao}>
            <View style={estilos.conteudoBannerSolicitacao}>
              <View style={estilos.circuloIconeBanner}>
                <Feather name="search" size={24} color="#FF5A1F" />
              </View>
              <View style={estilos.colunaTextosBanner}>
                <Text style={estilos.tituloBannerSolicitacao}>
                  Não encontrou o que procura?
                </Text>
                <Text style={estilos.descricaoBannerSolicitacao}>
                  Faça uma solicitação personalizada e encontre o professor ideal para você.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={estilos.botaoCriarSolicitacao}
              onPress={() => router.push("/assistente")}
              accessibilityRole="button"
            >
              <Text style={estilos.textoBotaoCriarSolicitacao}>Criar solicitação</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>

      {/* ==================================================== */}
      {/* 7. MODAIS SUSPENSOS DE FILTRO (OVERLAYS NATIVOS) */}
      {/* ==================================================== */}

      {/* Modal: Matéria */}
      <Modal visible={modalMateriaVisivel} transparent animationType="slide">
        <View style={estilos.fundoOverlayModal}>
          <View style={estilos.conteudoModalInferior}>
            <View style={estilos.indicadorArrasteModal} />
            <Text style={estilos.tituloModal}>Filtrar por Matéria</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {saberes.map((mat) => {
                const ativo = filtroMateria === mat;
                return (
                  <TouchableOpacity
                    key={mat}
                    style={[estilos.itemOpcaoModal, ativo && estilos.itemOpcaoModalAtivo]}
                    onPress={() => {
                      setFiltroMateria(mat);
                      setModalMateriaVisivel(false);
                    }}
                  >
                    <Text style={[estilos.textoOpcaoModal, ativo && estilos.textoOpcaoModalAtivo]}>
                      {mat}
                    </Text>
                    {ativo && <Feather name="check" size={18} color="#FF5A1F" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={estilos.botaoConcluirModal}
              onPress={() => setModalMateriaVisivel(false)}
            >
              <Text style={estilos.textoBotaoConcluirModal}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Disponibilidade */}
      <Modal visible={modalDisponibilidadeVisivel} transparent animationType="slide">
        <View style={estilos.fundoOverlayModal}>
          <View style={estilos.conteudoModalInferior}>
            <View style={estilos.indicadorArrasteModal} />
            <Text style={estilos.tituloModal}>Disponibilidade de Horário</Text>
            <View style={{ gap: 4 }}>
              {[
                { key: "Todas", label: "Qualquer dia" },
                { key: "Hoje", label: "Disponível Hoje" },
                { key: "Amanhã", label: "Amanhã" },
                { key: "Esta semana", label: "Esta semana" },
                { key: "Fim de semana", label: "Final de semana" },
              ].map((opcao) => {
                const ativo = filtroDisponibilidade === opcao.key;
                return (
                  <TouchableOpacity
                    key={opcao.key}
                    style={[estilos.itemOpcaoModal, ativo && estilos.itemOpcaoModalAtivo]}
                    onPress={() => {
                      setFiltroDisponibilidade(opcao.key);
                      setModalDisponibilidadeVisivel(false);
                    }}
                  >
                    <Text style={[estilos.textoOpcaoModal, ativo && estilos.textoOpcaoModalAtivo]}>
                      {opcao.label}
                    </Text>
                    {ativo && <Feather name="check" size={18} color="#FF5A1F" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={estilos.botaoConcluirModal}
              onPress={() => setModalDisponibilidadeVisivel(false)}
            >
              <Text style={estilos.textoBotaoConcluirModal}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Formato da Aula */}
      <Modal visible={modalFormatoVisivel} transparent animationType="slide">
        <View style={estilos.fundoOverlayModal}>
          <View style={estilos.conteudoModalInferior}>
            <View style={estilos.indicadorArrasteModal} />
            <Text style={estilos.tituloModal}>Formato da Aula</Text>
            <View style={{ gap: 4 }}>
              {[
                { key: "TODAS", label: "Todos os formatos" },
                { key: "ONLINE", label: "💻 100% Online (Sala Virtual)" },
                { key: "PRESENCIAL", label: "📍 Aula Presencial" },
              ].map((opcao) => {
                const ativo = filtroFormato === opcao.key;
                return (
                  <TouchableOpacity
                    key={opcao.key}
                    style={[estilos.itemOpcaoModal, ativo && estilos.itemOpcaoModalAtivo]}
                    onPress={() => {
                      setFiltroFormato(opcao.key as any);
                      setModalFormatoVisivel(false);
                    }}
                  >
                    <Text style={[estilos.textoOpcaoModal, ativo && estilos.textoOpcaoModalAtivo]}>
                      {opcao.label}
                    </Text>
                    {ativo && <Feather name="check" size={18} color="#FF5A1F" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={estilos.botaoConcluirModal}
              onPress={() => setModalFormatoVisivel(false)}
            >
              <Text style={estilos.textoBotaoConcluirModal}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Faixa de Preço */}
      <Modal visible={modalPrecoVisivel} transparent animationType="slide">
        <View style={estilos.fundoOverlayModal}>
          <View style={estilos.conteudoModalInferior}>
            <View style={estilos.indicadorArrasteModal} />
            <Text style={estilos.tituloModal}>Preço Máximo por Hora</Text>
            <View style={{ gap: 4 }}>
              {[40, 50, 60, 80, 100, 150].map((preco) => {
                const ativo = filtroPrecoMax === preco;
                return (
                  <TouchableOpacity
                    key={preco}
                    style={[estilos.itemOpcaoModal, ativo && estilos.itemOpcaoModalAtivo]}
                    onPress={() => {
                      setFiltroPrecoMax(preco);
                      setModalPrecoVisivel(false);
                    }}
                  >
                    <Text style={[estilos.textoOpcaoModal, ativo && estilos.textoOpcaoModalAtivo]}>
                      {preco >= 150 ? "Qualquer valor (Até R$ 150,00)" : `Até R$ ${preco},00 / hora`}
                    </Text>
                    {ativo && <Feather name="check" size={18} color="#FF5A1F" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={estilos.botaoConcluirModal}
              onPress={() => setModalPrecoVisivel(false)}
            >
              <Text style={estilos.textoBotaoConcluirModal}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Nível de Ensino */}
      <Modal visible={modalNivelVisivel} transparent animationType="slide">
        <View style={estilos.fundoOverlayModal}>
          <View style={estilos.conteudoModalInferior}>
            <View style={estilos.indicadorArrasteModal} />
            <Text style={estilos.tituloModal}>Nível de Ensino</Text>
            <View style={{ gap: 4 }}>
              {[
                { key: "Todos", label: "Todos os níveis" },
                { key: "Ensino Fundamental", label: "Ensino Fundamental" },
                { key: "Ensino Médio", label: "Ensino Médio" },
                { key: "Superior", label: "Ensino Superior / Graduação" },
                { key: "Preparatório / Concursos", label: "Vestibulares & Concursos" },
              ].map((opcao) => {
                const ativo = filtroNivelEnsino === opcao.key;
                return (
                  <TouchableOpacity
                    key={opcao.key}
                    style={[estilos.itemOpcaoModal, ativo && estilos.itemOpcaoModalAtivo]}
                    onPress={() => {
                      setFiltroNivelEnsino(opcao.key);
                      setModalNivelVisivel(false);
                    }}
                  >
                    <Text style={[estilos.textoOpcaoModal, ativo && estilos.textoOpcaoModalAtivo]}>
                      {opcao.label}
                    </Text>
                    {ativo && <Feather name="check" size={18} color="#FF5A1F" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={estilos.botaoConcluirModal}
              onPress={() => setModalNivelVisivel(false)}
            >
              <Text style={estilos.textoBotaoConcluirModal}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Ordenação */}
      <Modal visible={modalOrdenacaoVisivel} transparent animationType="slide">
        <View style={estilos.fundoOverlayModal}>
          <View style={estilos.conteudoModalInferior}>
            <View style={estilos.indicadorArrasteModal} />
            <Text style={estilos.tituloModal}>Ordenar professores por</Text>
            <View style={{ gap: 4 }}>
              {[
                { key: "maisRelevantes", label: "Mais relevantes (Padrão)" },
                { key: "maisBarato", label: "Menor preço (Mais barato)" },
                { key: "maisCaro", label: "Maior preço" },
                { key: "melhorAvaliado", label: "Melhor avaliação (Mais estrelas)" },
              ].map((opcao) => {
                const ativo = ordenacao === opcao.key;
                return (
                  <TouchableOpacity
                    key={opcao.key}
                    style={[estilos.itemOpcaoModal, ativo && estilos.itemOpcaoModalAtivo]}
                    onPress={() => {
                      setOrdenacao(opcao.key as any);
                      setModalOrdenacaoVisivel(false);
                    }}
                  >
                    <Text style={[estilos.textoOpcaoModal, ativo && estilos.textoOpcaoModalAtivo]}>
                      {opcao.label}
                    </Text>
                    {ativo && <Feather name="check" size={18} color="#FF5A1F" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={estilos.botaoConcluirModal}
              onPress={() => setModalOrdenacaoVisivel(false)}
            >
              <Text style={estilos.textoBotaoConcluirModal}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Mais Filtros (Raio / GPS / Privacidade LGPD) */}
      <Modal visible={modalMaisFiltrosVisivel} transparent animationType="slide">
        <View style={estilos.fundoOverlayModal}>
          <View style={[estilos.conteudoModalInferior, { maxHeight: 520 }]}>
            <View style={estilos.indicadorArrasteModal} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={estilos.tituloModal}>Filtros de Proximidade</Text>
              <TouchableOpacity
                onPress={() => setModalPrivacidadeVisivel(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Feather name="shield" size={14} color="#0284C7" />
                <Text style={{ fontSize: 12, color: "#0284C7", fontWeight: "600" }}>Privacidade & LGPD</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              <Text style={estilos.subtituloSecaoModal}>Raio de Atendimento Presencial</Text>
              <View style={estilos.linhaChipsRaio}>
                {[2, 5, 10, 20].map((raio) => (
                  <Chip
                    key={raio}
                    label={`Até ${raio} km`}
                    selected={raioKm === raio}
                    variant={raioKm === raio ? "filled" : "subtle"}
                    size="sm"
                    style={{ flex: 1, justifyContent: "center" }}
                    onPress={() => setRaioKm(raio)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[estilos.botaoAtivarLocalizacao, localizacaoAtiva && estilos.botaoAtivarLocalizacaoAtiva]}
                onPress={localizacaoAtiva ? desativarLocalizacaoAluno : ativarLocalizacaoAluno}
                disabled={solicitandoLocalizacao}
              >
                <Feather
                  name={localizacaoAtiva ? "crosshair" : "map-pin"}
                  size={16}
                  color={localizacaoAtiva ? "#059669" : "#0284C7"}
                />
                <Text style={[estilos.textoAtivarLocalizacao, localizacaoAtiva && { color: "#059669" }]}>
                  {solicitandoLocalizacao
                    ? "Obtendo localização..."
                    : localizacaoAtiva
                    ? "Localização Ativa (Desativar)"
                    : "Usar Minha Localização Atual (GPS)"}
                </Text>
              </TouchableOpacity>

              <Text style={[estilos.subtituloSecaoModal, { marginTop: 16 }]}>
                Ou pesquise por Bairro / Região:
              </Text>
              <TextInput
                value={regiaoBusca}
                onChangeText={setRegiaoBusca}
                placeholder="Ex: Boa Viagem, Centro, Campus Universitário..."
                placeholderTextColor="#94A3B8"
                style={estilos.inputRegiaoModal}
              />
            </ScrollView>

            <TouchableOpacity
              style={estilos.botaoConcluirModal}
              onPress={() => setModalMaisFiltrosVisivel(false)}
            >
              <Text style={estilos.textoBotaoConcluirModal}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Privacidade & LGPD */}
      <Modal visible={modalPrivacidadeVisivel} transparent animationType="fade">
        <View style={estilos.fundoOverlayModal}>
          <View style={[estilos.conteudoModalInferior, { maxHeight: 480 }]}>
            <View style={estilos.indicadorArrasteModal} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Feather name="shield" size={22} color="#0284C7" />
              <Text style={estilos.tituloModal}>Privacidade e LGPD</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700", color: "#0F172A" }}>• Minimização de Dados:</Text> Sua localização exata não é gravada de forma contínua e nunca é compartilhada publicamente.
                </Text>
                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700", color: "#0F172A" }}>• Distância Segura:</Text> A distância é calculada pela fórmula matemática de Haversine de forma pontual no servidor, protegendo a privacidade de alunos e professores.
                </Text>
                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700", color: "#0F172A" }}>• Endereço Protegido:</Text> O endereço residencial de ambas as partes é mantido em sigilo, sendo disponibilizado apenas após confirmação formal da aula.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={{ backgroundColor: "#0284C7", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 16 }}
              onPress={() => setModalPrivacidadeVisivel(false)}
            >
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==========================================
// FOLHA DE ESTILOS UNIFICADA DO ORIENTA 2.0
// ==========================================
const estilos = StyleSheet.create({
  telaContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // 1. Cabeçalho Fixo Superior
  cabecalhoFixo: {
    paddingTop: Platform.OS === "web" ? 20 : 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cabecalhoTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  botaoFechar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  tituloCabecalho: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  textoLimparFiltros: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // Barra de Pesquisa
  barraBuscaContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  campoBuscaInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },

  scrollConteudo: {
    paddingBottom: 40,
  },

  // 2. Seção de Buscas Populares
  secaoBuscasPopulares: {
    marginTop: 18,
  },
  tituloSecao: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    paddingHorizontal: 20,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  scrollChipsConteudo: {
    paddingHorizontal: 20,
    gap: 8,
  },

  // 3. Grade de Filtros Suspensos
  secaoFiltrosSuspensos: {
    marginTop: 14,
  },
  scrollFiltrosHorizontais: {
    paddingHorizontal: 20,
    gap: 8,
  },
  botaoDropdownFiltro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  botaoDropdownAtivo: {
    borderColor: "#FF5A1F",
    backgroundColor: "#FFF2EB",
  },
  textoDropdownFiltro: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    maxWidth: 130,
  },
  textoDropdownAtivo: {
    color: "#FF5A1F",
    fontWeight: "700",
  },

  // 4. Barra de Ordenação e Contador
  barraContadorEOrdenacao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  textoContadorProfessores: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  botaoOrdenacao: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoRotuloOrdenar: {
    fontSize: 12,
    color: "#64748B",
  },
  textoValorOrdenar: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },

  // 5. Lista de Professores
  listaProfessoresContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  textoCarregando: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },

  // Estado Vazio
  containerVazio: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconeVazioWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  tituloVazio: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  descricaoVazio: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  botaoLimparVazio: {
    backgroundColor: "#FF5A1F",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  textoBotaoLimparVazio: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // Card do Professor
  cardProfessor: {
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 18,
  },
  cardCorpoPrincipal: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatarImagem: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E2E8F0",
  },
  indicadorOnlineVerde: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  colunaInformacoes: {
    flex: 1,
    gap: 4,
  },
  linhaNomeEFavorito: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  grupoNome: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  textoNomeProfessor: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  botaoFavorito: {
    padding: 2,
  },
  textoEspecialidade: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  linhaAvaliacao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  textoNotaMedia: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  textoTotalAvaliacoes: {
    fontWeight: "400",
    color: "#94A3B8",
  },
  grupoBadges: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },

  // Linha de Preço no Rodapé do Card
  linhaPrecoRodape: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  textoRotuloPreco: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  grupoPrecoValor: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  textoValorPreco: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FF5A1F",
  },
  textoSufixoHora: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  // 6. Banner Solicitação Personalizada (IMG-007)
  cardBannerSolicitacao: {
    marginTop: 16,
    backgroundColor: "#FFF8F5",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    borderRadius: 20,
    gap: 14,
  },
  conteudoBannerSolicitacao: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  circuloIconeBanner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFEFE7",
    alignItems: "center",
    justifyContent: "center",
  },
  colunaTextosBanner: {
    flex: 1,
  },
  tituloBannerSolicitacao: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  descricaoBannerSolicitacao: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  botaoCriarSolicitacao: {
    backgroundColor: "#FF5A1F",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoCriarSolicitacao: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // 7. Modais de Filtro (Bottom Sheet)
  fundoOverlayModal: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  conteudoModalInferior: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "web" ? 24 : 40,
    maxHeight: 460,
  },
  indicadorArrasteModal: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  tituloModal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },
  itemOpcaoModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  itemOpcaoModalAtivo: {
    backgroundColor: "#FFF2EB",
  },
  textoOpcaoModal: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "500",
  },
  textoOpcaoModalAtivo: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
  botaoConcluirModal: {
    backgroundColor: "#FF5A1F",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  textoBotaoConcluirModal: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // Estilos de Mais Filtros
  subtituloSecaoModal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  linhaChipsRaio: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  botaoAtivarLocalizacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    marginTop: 6,
  },
  botaoAtivarLocalizacaoAtiva: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  textoAtivarLocalizacao: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0284C7",
  },
  inputRegiaoModal: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: "#0F172A",
  },
  atalhoBuscaPresencial: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textoAtalhoPresencial: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C2410C",
  },
});
