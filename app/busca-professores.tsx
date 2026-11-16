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
 * - Busca autenticada de professores e saberes, proximidade/raio GPS (Fase 8 / MAP) e consentimento LGPD.
 */

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import {
  API_URL,
  apiFetch,
  extrairDadosLista,
  getApiErrorMessage,
} from "../config/api";
import { useAuth } from "../context/AuthContext";
import TabBarRN001 from "../components/navigation/TabBarRN001";
import AvatarPerfil from "../components/AvatarPerfil";

// ==========================================
// 1. CONTRATOS DE TIPAGEM (INTERFACES TS)
// ==========================================

interface Saber {
  id: number | null;
  nome: string;
}

interface Aptidao {
  saber: Saber;
  precoHora: number | null;
}

interface AptidaoResposta {
  saberId: number | null;
  saberNome: string | null;
  precoHora: number | null;
}

interface ProfessorBusca {
  id: number;
  nome: string;
  notaMedia?: number | null;
  totalAvaliacoes?: number | null;
  fotoUrl?: string | null;
  oferecePresencial?: boolean;
  regiaoAtendimento?: string | null;
  distanciaAproximadaKm?: number;
  textoProximidade?: string;
  nivelEnsino?: string;
  disponibilidade?: string;
  aptidoes?: Aptidao[];
}

interface ProfessorBuscaResposta extends Omit<ProfessorBusca, "aptidoes"> {
  aptidoes?: AptidaoResposta[] | null;
}

function normalizarProfessor(professor: ProfessorBuscaResposta): ProfessorBusca {
  return {
    ...professor,
    aptidoes: professor.aptidoes?.map((aptidao) => ({
      saber: {
        id: aptidao.saberId,
        nome: aptidao.saberNome ?? "",
      },
      precoHora: aptidao.precoHora,
    })) ?? [],
  };
}

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================

export default function BuscaProfessores() {
  const { token, carregandoAuth } = useAuth();

  // Captura parâmetro de rota enviado pela Home (ex: categoria=Matemática)
  const { categoria } = useLocalSearchParams<{ categoria?: string }>();

  // ==========================================
  // ESTADOS DE DADOS
  // ==========================================
  const [professoresBanco, setProfessoresBanco] = useState<ProfessorBusca[]>([]);
  const [professoresFiltrados, setProfessoresFiltrados] = useState<ProfessorBusca[]>([]);
  const [saberes, setSaberes] = useState<string[]>(["Todas as matérias"]);
  const [carregando, setCarregando] = useState(true);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<Record<number, boolean>>({});

  // Paginação
  const PAGE_SIZE = 10;
  const [paginaAtual, setPaginaAtual] = useState(1);
  const scrollConteudoRef = useRef<ScrollView>(null);

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
    async (signal?: AbortSignal) => {
      if (carregandoAuth) return;
      if (!token) {
        setProfessoresBanco([]);
        setErroBusca("Sua sessão expirou. Entre novamente.");
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErroBusca(null);

      try {
        const params = new URLSearchParams();
        if (filtroFormato && filtroFormato !== "TODAS") params.append("modalidade", filtroFormato);
        const termoBusca = busca.trim() || (
          filtroMateria !== "Todas as matérias" && filtroMateria !== "Todas"
            ? filtroMateria
            : ""
        );
        if (termoBusca) params.append("termo", termoBusca);
        if (regiaoBusca.trim()) params.append("regiao", regiaoBusca.trim());
        if (filtroPrecoMax < 150) params.append("precoMax", filtroPrecoMax.toString());

        if (coordenadasAluno && filtroFormato === "PRESENCIAL") {
          params.append("latitude", coordenadasAluno.latitude.toString());
          params.append("longitude", coordenadasAluno.longitude.toString());
          params.append("raioKm", raioKm.toString());
        }

        const urlBusca = `${API_URL}/api/v1/usuarios/professores/busca?${params.toString()}`;
        const resProfs = await apiFetch(urlBusca, { signal });
        const resposta = await resProfs.json();
        const dadosProfs = extrairDadosLista<ProfessorBuscaResposta>(resposta)
          .map(normalizarProfessor);
        setProfessoresBanco(dadosProfs);
      } catch (error) {
        if (signal?.aborted) return;
        setProfessoresBanco([]);
        setErroBusca(getApiErrorMessage(error));
      } finally {
        if (!signal?.aborted) setCarregando(false);
      }
    },
    [
      token,
      carregandoAuth,
      filtroFormato,
      filtroMateria,
      busca,
      regiaoBusca,
      filtroPrecoMax,
      coordenadasAluno,
      raioKm,
    ],
  );

  const handleFecharBusca = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  // Carrega o catálogo de saberes autenticado no backend.
  useEffect(() => {
    if (carregandoAuth || !token) return;
    const controller = new AbortController();
    let cancelado = false;

    const buscarSaberes = async () => {
      try {
        const resSaberes = await apiFetch(`${API_URL}/api/v1/saberes`, {
          signal: controller.signal,
        });
        const resposta = await resSaberes.json();
        if (!cancelado) {
          const dadosSaberes = extrairDadosLista<Saber>(resposta);
          const nomesSaberes = dadosSaberes.map((s) => s.nome);
          setSaberes(["Todas as matérias", ...nomesSaberes]);
        }
      } catch (error) {
        if (!cancelado) setErroBusca(getApiErrorMessage(error));
      }
    };

    void buscarSaberes();

    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [carregandoAuth, token]);

  // Busca novamente quando a sessão ou os filtros mudam.
  useEffect(() => {
    if (carregandoAuth) return;
    const controller = new AbortController();
    void buscarProfessoresPagina(controller.signal);
    return () => controller.abort();
  }, [buscarProfessoresPagina, carregandoAuth]);

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
      resultado = resultado.filter((prof) => prof.oferecePresencial === false);
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
    if (filtroPrecoMax < 150) {
      resultado = resultado.filter((prof) =>
        (prof.aptidoes ?? []).some(
          (aptidao) => aptidao.precoHora !== null && aptidao.precoHora <= filtroPrecoMax,
        ),
      );
    }

    // 7. Ordenação
    if (ordenacao === "maisBarato") {
      resultado.sort((a, b) => {
        const precoA = a.aptidoes?.[0]?.precoHora;
        const precoB = b.aptidoes?.[0]?.precoHora;
        if (precoA === null || precoA === undefined) return precoB == null ? 0 : 1;
        if (precoB === null || precoB === undefined) return -1;
        return precoA - precoB;
      });
    } else if (ordenacao === "maisCaro") {
      resultado.sort((a, b) => {
        const precoA = a.aptidoes?.[0]?.precoHora;
        const precoB = b.aptidoes?.[0]?.precoHora;
        if (precoA === null || precoA === undefined) return precoB == null ? 0 : 1;
        if (precoB === null || precoB === undefined) return -1;
        return precoB - precoA;
      });
    } else if (ordenacao === "melhorAvaliado") {
      resultado.sort((a, b) => (b.notaMedia || 0) - (a.notaMedia || 0));
    }

    setProfessoresFiltrados(resultado);
    setPaginaAtual(1);
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

  const totalPaginas = Math.max(1, Math.ceil(professoresFiltrados.length / PAGE_SIZE));
  const primeiraPaginaVisivel = Math.max(
    1,
    Math.min(paginaAtual - 2, totalPaginas - 4),
  );
  const paginasVisiveis = Array.from(
    { length: Math.min(totalPaginas, 5) },
    (_, indice) => primeiraPaginaVisivel + indice,
  );
  const inicioPagina = (paginaAtual - 1) * PAGE_SIZE;
  const professoresDaPagina = professoresFiltrados.slice(
    inicioPagina,
    inicioPagina + PAGE_SIZE,
  );

  const mudarPagina = (pagina: number) => {
    setPaginaAtual(pagina);
    scrollConteudoRef.current?.scrollTo({ y: 0, animated: true });
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
        ref={scrollConteudoRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scrollConteudo}
      >
        {/* Atalho para busca presencial */}
        <TouchableOpacity
          style={estilos.atalhoBuscaPresencial}
          onPress={() => router.push("/busca-presencial" as any)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Buscar professores para aulas presenciais perto de você"
        >
          <View style={estilos.iconeAtalhoPresencial}>
            <Ionicons name="map-outline" size={19} color="#FF5A1F" />
          </View>
          <View style={estilos.conteudoAtalhoPresencial}>
            <Text style={estilos.tituloAtalhoPresencial}>
              Aulas presenciais
            </Text>
            <Text style={estilos.descricaoAtalhoPresencial}>
              Encontre professores perto de você
            </Text>
          </View>
          <View style={estilos.iconeSetaAtalho}>
            <Feather name="arrow-right" size={16} color="#FF5A1F" />
          </View>
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
            {carregandoAuth || carregando
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
          {carregandoAuth || carregando ? (
            <View style={estilos.loadingContainer}>
              <ActivityIndicator size="large" color="#FF5A1F" />
              <Text style={estilos.textoCarregando}>Carregando professores...</Text>
            </View>
          ) : erroBusca ? (
            <View style={estilos.containerVazio}>
              <View style={estilos.iconeVazioWrapper}>
                <Feather name="alert-circle" size={32} color="#DC2626" />
              </View>
              <Text style={estilos.tituloVazio}>Não foi possível carregar os professores</Text>
              <Text style={estilos.descricaoVazio}>{erroBusca}</Text>
              <TouchableOpacity
                style={estilos.botaoLimparVazio}
                onPress={() => void buscarProfessoresPagina()}
                disabled={!token}
              >
                <Text style={estilos.textoBotaoLimparVazio}>Tentar novamente</Text>
              </TouchableOpacity>
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
            professoresDaPagina.map((prof) => {
              const preco = prof.aptidoes?.find(
                (aptidao) => aptidao.precoHora !== null,
              )?.precoHora;
              const precoFormatado = preco?.toFixed(2).replace(".", ",");
              const notaFormatada = prof.notaMedia?.toFixed(1).replace(".", ",");
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
                      <AvatarPerfil
                        nome={prof.nome}
                        fotoUrl={prof.fotoUrl}
                        tamanho={64}
                      />
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
                        {prof.aptidoes?.[0]?.saber?.nome || "Especialidade não informada"}
                      </Text>

                      {/* Linha 3: Avaliação com estrelas */}
                      {notaFormatada ? (
                        <View style={estilos.linhaAvaliacao}>
                          <Ionicons name="star" size={14} color="#F59E0B" />
                          <Text style={estilos.textoNotaMedia}>
                            {notaFormatada}{" "}
                            <Text style={estilos.textoTotalAvaliacoes}>
                              ({prof.totalAvaliacoes ?? 0} avaliações)
                            </Text>
                          </Text>
                        </View>
                      ) : (
                        <Text style={estilos.textoTotalAvaliacoes}>Sem avaliações</Text>
                      )}

                      {/* Linha 4: Badges de status e modalidade */}
                      <View style={estilos.grupoBadges}>
                        {prof.oferecePresencial === true ? (
                          <Badge
                            variant="info"
                            size="sm"
                            icon={<Feather name="map-pin" size={10} color="#0284C7" />}
                            label={prof.textoProximidade || prof.regiaoAtendimento || "Presencial"}
                          />
                        ) : prof.oferecePresencial === false ? (
                          <Badge
                            variant="neutral"
                            size="sm"
                            icon={<Feather name="monitor" size={10} color="#475569" />}
                            label="Online"
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Linha Inferior: Preço em destaque */}
                  <View style={estilos.linhaPrecoRodape}>
                    {precoFormatado ? (
                      <>
                        <Text style={estilos.textoRotuloPreco}>A partir de</Text>
                        <View style={estilos.grupoPrecoValor}>
                          <Text style={estilos.textoValorPreco}>R$ {precoFormatado}</Text>
                          <Text style={estilos.textoSufixoHora}>/h</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={estilos.textoRotuloPreco}>Preço não informado</Text>
                    )}
                  </View>
                </Card>
              );
            })
          )}

          {!carregandoAuth && !carregando && !erroBusca && totalPaginas > 1 && (
            <View style={estilos.containerPaginacao}>
              <Text style={estilos.textoResumoPaginacao}>
                Exibindo {inicioPagina + 1} a{" "}
                {Math.min(inicioPagina + PAGE_SIZE, professoresFiltrados.length)} de{" "}
                {professoresFiltrados.length} professores
              </Text>
              <View style={estilos.controlesPaginacao}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Página anterior"
                  disabled={paginaAtual === 1}
                  onPress={() => mudarPagina(Math.max(1, paginaAtual - 1))}
                  style={[
                    estilos.botaoPagina,
                    paginaAtual === 1 && estilos.botaoPaginaDesativado,
                  ]}
                >
                  <Feather name="chevron-left" size={18} color="#475569" />
                </TouchableOpacity>
                {paginasVisiveis.map((pagina) => {
                  const ativa = pagina === paginaAtual;
                  return (
                    <TouchableOpacity
                      key={pagina}
                      accessibilityRole="button"
                      accessibilityLabel={`Página ${pagina}`}
                      accessibilityState={{ selected: ativa }}
                      onPress={() => mudarPagina(pagina)}
                      style={[
                        estilos.botaoPagina,
                        ativa && estilos.botaoPaginaAtivo,
                      ]}
                    >
                      <Text
                        style={[
                          estilos.textoPagina,
                          ativa && estilos.textoPaginaAtivo,
                        ]}
                      >
                        {pagina}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Próxima página"
                  disabled={paginaAtual === totalPaginas}
                  onPress={() =>
                    mudarPagina(Math.min(totalPaginas, paginaAtual + 1))
                  }
                  style={[
                    estilos.botaoPagina,
                    paginaAtual === totalPaginas && estilos.botaoPaginaDesativado,
                  ]}
                >
                  <Feather name="chevron-right" size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
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

      {/* Barra de Navegação Inferior Dockada (5 Abas - RN-001) */}
      <TabBarRN001 abaAtiva="buscar" />
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
  containerPaginacao: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  textoResumoPaginacao: {
    fontSize: 12,
    color: "#64748B",
  },
  controlesPaginacao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  botaoPagina: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoPaginaAtivo: {
    borderColor: "#FF5A1F",
    backgroundColor: "#FF5A1F",
  },
  botaoPaginaDesativado: {
    opacity: 0.4,
  },
  textoPagina: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  textoPaginaAtivo: {
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    padding: 12,
  },
  iconeAtalhoPresencial: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  conteudoAtalhoPresencial: {
    flex: 1,
  },
  tituloAtalhoPresencial: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  descricaoAtalhoPresencial: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  iconeSetaAtalho: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
