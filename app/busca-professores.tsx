/**
 * @file busca-professores.tsx
 * @description Controlador da Tela de Busca Avançada de Professores.
 * Permite pesquisa em tempo real (texto), filtros por disciplina, preço máximo
 * e ordenação customizada. Suporta recebimento de parâmetros de rota para pré-filtragem.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Componentes Unificados e Configurações
import BarraBusca from "../components/BarraBusca";
import CardProfessor from "../components/CardProfessor";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

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
  aptidoes?: Aptidao[];
}

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================

export default function BuscaProfessores() {
  const { usuarioId, carregandoAuth } = useAuth() as any;

  // 🟢 Captura do parâmetro de rota enviado pela Home (Carrossel de Categorias)
  const { categoria } = useLocalSearchParams<{ categoria?: string }>();

  // ==========================================
  // ESTADOS DE DADOS
  // ==========================================
  const [professoresBanco, setProfessoresBanco] = useState<ProfessorBusca[]>(
    [],
  );
  const [professoresFiltrados, setProfessoresFiltrados] = useState<
    ProfessorBusca[]
  >([]);
  const [saberes, setSaberes] = useState<string[]>(["Todas"]);
  const [carregando, setCarregando] = useState(false);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [paginaMaximaVisivel, setPaginaMaximaVisivel] = useState(1);
  const [temMaisPaginas, setTemMaisPaginas] = useState(true);
  const [paginaLocalFallback, setPaginaLocalFallback] = useState(false);
  const PAGE_SIZE = 20;

  // ==========================================
  // ESTADOS DE FILTRO
  // ==========================================
  const [busca, setBusca] = useState("");
  // 🟢 Inicializa o filtro de matéria com a categoria recebida na rota (ou "Todas" se for null)
  const [filtroMateria, setFiltroMateria] = useState<string>(
    categoria || "Todas",
  );
  const [filtroPrecoMax, setFiltroPrecoMax] = useState(150);
  const [ordenacao, setOrdenacao] = useState<
    "maisRelevantes" | "maisBarato" | "maisCaro"
  >("maisRelevantes");

  // ==========================================
  // ESTADOS DE LOCALIZAÇÃO E RAIO (FASE 8 / MAP-001 a MAP-006)
  // ==========================================
  const [modalidade, setModalidade] = useState<"TODAS" | "ONLINE" | "PRESENCIAL">("TODAS");
  const [raioKm, setRaioKm] = useState<number>(10);
  const [regiaoBusca, setRegiaoBusca] = useState<string>("");
  const [coordenadasAluno, setCoordenadasAluno] = useState<{ latitude: number; longitude: number } | null>(null);
  const [localizacaoAtiva, setLocalizacaoAtiva] = useState(false);
  const [solicitandoLocalizacao, setSolicitandoLocalizacao] = useState(false);
  const [modalRaioVisivel, setModalRaioVisivel] = useState(false);
  const [modalPrivacidadeVisivel, setModalPrivacidadeVisivel] = useState(false);

  // Estados de Modais
  const [modalMateriaVisivel, setModalMateriaVisivel] = useState(false);
  const [modalPrecoVisivel, setModalPrecoVisivel] = useState(false);
  const [modalOrdenacaoVisivel, setModalOrdenacaoVisivel] = useState(false);

  // Monitora alterações nos parâmetros de rota para atualizar o filtro dinamicamente
  useEffect(() => {
    if (categoria) {
      setFiltroMateria(categoria);
    }
  }, [categoria]);

  /**
   * Solicita e ativa a localização do aluno com consentimento explícito (MAP-003, MAP-009).
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
          setModalidade("PRESENCIAL");
        },
        (erro) => {
          console.warn("Localização não obtida via GPS:", erro.message);
          // Fallback para ponto de demonstração (Recife - Marco Zero / Centro)
          setCoordenadasAluno({
            latitude: -8.063169,
            longitude: -34.871139,
          });
          setLocalizacaoAtiva(true);
          setSolicitandoLocalizacao(false);
          setModalidade("PRESENCIAL");
        },
        { enableHighAccuracy: false, timeout: 6000 }
      );
    } else {
      // Ponto de referência padrão de demonstração para banca acadêmica
      setCoordenadasAluno({
        latitude: -8.063169,
        longitude: -34.871139,
      });
      setLocalizacaoAtiva(true);
      setSolicitandoLocalizacao(false);
      setModalidade("PRESENCIAL");
    }
  };

  const desativarLocalizacaoAluno = () => {
    setCoordenadasAluno(null);
    setLocalizacaoAtiva(false);
  };

  /**
   * Dispara a requisição para buscar os professores no banco com suporte a Raio e Modalidade (Fase 8).
   * @async
   */
  const buscarProfessoresPagina = useCallback(
    async (page: number) => {
      setCarregando(true);

      try {
        const params = new URLSearchParams();
        if (modalidade) params.append("modalidade", modalidade);
        if (filtroMateria && filtroMateria !== "Todas") params.append("termo", filtroMateria);
        if (busca.trim()) params.append("termo", busca.trim());
        if (regiaoBusca.trim()) params.append("regiao", regiaoBusca.trim());
        if (filtroPrecoMax) params.append("precoMax", filtroPrecoMax.toString());

        if (coordenadasAluno && modalidade === "PRESENCIAL") {
          params.append("latitude", coordenadasAluno.latitude.toString());
          params.append("longitude", coordenadasAluno.longitude.toString());
          params.append("raioKm", raioKm.toString());
        }

        // Tenta o endpoint da Fase 8
        const urlBusca = `${API_URL}/api/v1/usuarios/professores/busca?${params.toString()}`;
        let resProfs = await fetch(urlBusca);

        if (!resProfs.ok && usuarioId) {
          // Fallback gracioso para a rota de destaque
          resProfs = await fetch(`${API_URL}/api/usuarios/professores/destaque/${usuarioId}`);
        }

        if (resProfs.ok) {
          const json = await resProfs.json();
          const dadosProfs: ProfessorBusca[] = Array.isArray(json)
            ? json
            : json.dados || json.data || [];

          setProfessoresBanco(dadosProfs);
          setProfessoresFiltrados(dadosProfs);
          setPaginaAtual(page);
          setPaginaMaximaVisivel(Math.max(1, Math.ceil(dadosProfs.length / PAGE_SIZE)));
          setTemMaisPaginas(dadosProfs.length > PAGE_SIZE);
        }
      } catch (e) {
        console.error("Erro ao buscar professores:", e);
      } finally {
        setCarregando(false);
      }
    },
    [usuarioId, modalidade, filtroMateria, busca, regiaoBusca, filtroPrecoMax, coordenadasAluno, raioKm],
  );

  const selecionarPagina = async (page: number) => {
    if (page === paginaAtual || page < 1 || page > paginaMaximaVisivel) return;
    if (paginaLocalFallback) {
      setPaginaAtual(page);
      return;
    }
    await buscarProfessoresPagina(page);
  };

  const handleFecharBusca = () => {
    router.replace("/(tabs)");
  };

  // ==========================================
  // EFEITO 1: BUSCA INICIAL NO BANCO DE DADOS
  // ==========================================
  useEffect(() => {
    if (carregandoAuth || !usuarioId) return;

    let cancelado = false;

    const buscarDadosIniciais = async () => {
      setCarregando(true);
      setPaginaAtual(1);
      setTemMaisPaginas(true);
      setPaginaLocalFallback(false);
      setProfessoresBanco([]);
      setProfessoresFiltrados([]);

      try {
        const resSaberes = await fetch(`${API_URL}/api/saberes`);
        if (!cancelado && resSaberes.ok) {
          const dadosSaberes: Saber[] = await resSaberes.json();
          const nomesSaberes = dadosSaberes.map((s) => s.nome);
          setSaberes(["Todas", ...nomesSaberes]);
        }

        await buscarProfessoresPagina(1);
      } catch (e) {
        if (!cancelado)
          console.error("Erro ao buscar dados da tela de busca:", e);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    buscarDadosIniciais();

    return () => {
      cancelado = true;
    };
  }, [carregandoAuth, usuarioId, buscarProfessoresPagina]);

  // ==========================================
  // EFEITO 2: MOTOR DE BUSCA E FILTRAGEM (CLIENT-SIDE)
  // ==========================================
  const professoresExibicao = paginaLocalFallback
    ? professoresFiltrados.slice(
        (paginaAtual - 1) * PAGE_SIZE,
        paginaAtual * PAGE_SIZE,
      )
    : professoresFiltrados;

  useEffect(() => {
    let resultado = professoresBanco;

    // 1. Filtro por Texto Livre (Nome ou Matéria)
    if (busca.trim() !== "") {
      const termo = busca.toLowerCase();
      resultado = resultado.filter((prof) => {
        const nomeProf = prof.nome?.toLowerCase() || "";
        const materiaProf =
          prof.aptidoes?.[0]?.saber?.nome?.toLowerCase() || "";
        return nomeProf.includes(termo) || materiaProf.includes(termo);
      });
    }

    // 2. Filtro por Matéria Selecionada no Dropdown
    if (filtroMateria !== "Todas") {
      resultado = resultado.filter((prof) => {
        const materiaProf = prof.aptidoes?.[0]?.saber?.nome || "";
        return materiaProf === filtroMateria;
      });
    }

    // 3. Filtro por Preço Máximo
    resultado = resultado.filter((prof) => {
      const precoProf = prof.aptidoes?.[0]?.precoHora || 0;
      return precoProf <= filtroPrecoMax;
    });

    // 4. Lógica de Ordenação
    if (ordenacao === "maisBarato") {
      resultado = resultado.slice().sort((a, b) => {
        const precoA = a.aptidoes?.[0]?.precoHora || 0;
        const precoB = b.aptidoes?.[0]?.precoHora || 0;
        return precoA - precoB;
      });
    } else if (ordenacao === "maisCaro") {
      resultado = resultado.slice().sort((a, b) => {
        const precoA = a.aptidoes?.[0]?.precoHora || 0;
        const precoB = b.aptidoes?.[0]?.precoHora || 0;
        return precoB - precoA;
      });
    }

    setProfessoresFiltrados(resultado);
  }, [busca, filtroMateria, filtroPrecoMax, ordenacao, professoresBanco]);

  // ==========================================
  // RENDERIZAÇÃO DA INTERFACE
  // ==========================================
  return (
    <View style={estilos.container}>
      {/* Header Fixo */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={handleFecharBusca}>
          <Ionicons name="close" size={32} color="#111" />
        </TouchableOpacity>
        <Text style={estilos.tituloPagina}>Buscar professores</Text>
      </View>

      {/* Barra de Busca de Texto */}
      <View style={{ paddingHorizontal: 20 }}>
        <BarraBusca
          valor={busca}
          aoMudarTexto={setBusca}
          placeholder="Buscar por matéria ou professor..."
          exibirFiltro={false}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Filtros Rápidos (Chips) */}
        <Text style={estilos.labelSecao}>Buscas populares</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={estilos.scrollChips}
        >
          {["Matemática", "Programação", "Física", "Biologia"].map((item) => (
            <TouchableOpacity
              key={item}
              style={[estilos.chip, busca === item && estilos.chipAtivo]}
              onPress={() => setBusca(item === busca ? "" : item)}
            >
              <Text
                style={[
                  estilos.textoChip,
                  busca === item && estilos.textoChipAtivo,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ========================================================================= */}
        {/* FASE 8: SELETOR DE MODALIDADE E RAIO DE ATENDIMENTO (MAP-001 a MAP-006) */}
        {/* ========================================================================= */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={estilos.labelSecaoSemPadding}>Modalidade da Aula</Text>
            <TouchableOpacity 
              onPress={() => setModalPrivacidadeVisivel(true)} 
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Feather name="shield" size={14} color="#0284C7" />
              <Text style={{ fontSize: 12, color: "#0284C7", fontWeight: "600" }}>Privacidade & LGPD</Text>
            </TouchableOpacity>
          </View>

          {/* Seletor de Modalidade (Todas / Online / Presencial) */}
          <View style={estilos.containerModalidade}>
            <TouchableOpacity
              style={[estilos.botaoModalidade, modalidade === "TODAS" && estilos.botaoModalidadeAtivo]}
              onPress={() => setModalidade("TODAS")}
            >
              <Text style={[estilos.textoModalidade, modalidade === "TODAS" && estilos.textoModalidadeAtivo]}>
                Todas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[estilos.botaoModalidade, modalidade === "ONLINE" && estilos.botaoModalidadeAtivo]}
              onPress={() => setModalidade("ONLINE")}
            >
              <Text style={[estilos.textoModalidade, modalidade === "ONLINE" && estilos.textoModalidadeAtivo]}>
                💻 100% Online
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[estilos.botaoModalidade, modalidade === "PRESENCIAL" && estilos.botaoModalidadeAtivoPresencial]}
              onPress={() => setModalidade("PRESENCIAL")}
            >
              <Text style={[estilos.textoModalidade, modalidade === "PRESENCIAL" && estilos.textoModalidadeAtivoPresencial]}>
                📍 Presencial
              </Text>
            </TouchableOpacity>
          </View>

          {/* Painel Avançado de Raio e Localização Presencial (Fase 8) */}
          {modalidade === "PRESENCIAL" && (
            <View style={estilos.painelPresencial}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={estilos.subtituloPresencial}>Raio de Busca (Servidor Haversine)</Text>
                {localizacaoAtiva && (
                  <View style={estilos.badgeGpsAtivo}>
                    <Feather name="check-circle" size={12} color="#10B981" />
                    <Text style={estilos.textoGpsAtivo}>GPS Ativo (Minimizado)</Text>
                  </View>
                )}
              </View>

              {/* Botões de Raio Permitidos pelo Produto: 2, 5, 10, 20 km (Decisão 17) */}
              <View style={estilos.linhaBotoesRaio}>
                {[2, 5, 10, 20].map((raio) => (
                  <TouchableOpacity
                    key={raio}
                    style={[estilos.chipRaio, raioKm === raio && estilos.chipRaioAtivo]}
                    onPress={() => setRaioKm(raio)}
                  >
                    <Text style={[estilos.textoChipRaio, raioKm === raio && estilos.textoChipRaioAtivo]}>
                      Até {raio} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Botão de Localização do Aluno com Consentimento */}
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[estilos.botaoAtivarGps, localizacaoAtiva && estilos.botaoAtivarGpsLigado]}
                  onPress={localizacaoAtiva ? desativarLocalizacaoAluno : ativarLocalizacaoAluno}
                  disabled={solicitandoLocalizacao}
                >
                  <Feather 
                    name={localizacaoAtiva ? "crosshair" : "map-pin"} 
                    size={16} 
                    color={localizacaoAtiva ? "#059669" : "#0284C7"} 
                  />
                  <Text style={[estilos.textoAtivarGps, localizacaoAtiva && { color: "#059669" }]}>
                    {solicitandoLocalizacao
                      ? "Obtendo..."
                      : localizacaoAtiva
                      ? "Localização Ativa (Desativar)"
                      : "Usar Localização Atual (GPS)"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Fallback sem GPS: Busca textual por Bairro / Região (MAP-008) */}
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                  Ou informe seu Bairro / Região (sem usar GPS):
                </Text>
                <BarraBusca
                  valor={regiaoBusca}
                  aoMudarTexto={setRegiaoBusca}
                  placeholder="Ex: Boa Viagem, Centro, Graças..."
                  exibirFiltro={false}
                />
              </View>
            </View>
          )}
        </View>

        {/* Barramento de Filtros Dropdown */}
        <Text style={estilos.labelSecao}>Filtros Avançados</Text>
        <View style={estilos.containerFiltros}>
          <TouchableOpacity
            style={estilos.botaoFiltroLargo}
            onPress={() => setModalMateriaVisivel(true)}
          >
            <Feather name="book" size={20} color="#555" />
            <Text style={estilos.textoFiltroBotao}>
              {filtroMateria === "Todas" ? "Todas as matérias" : filtroMateria}
            </Text>
            <Feather name="chevron-down" size={18} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.botaoFiltroLargo}
            onPress={() => setModalPrecoVisivel(true)}
          >
            <Feather name="dollar-sign" size={20} color="#555" />
            <Text style={estilos.textoFiltroBotao}>
              Até R$ {filtroPrecoMax.toFixed(2).replace(".", ",")}
            </Text>
            <Feather name="chevron-down" size={18} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.botaoFiltroLargo}
            onPress={() => setModalOrdenacaoVisivel(true)}
          >
            <Feather name="sliders" size={20} color="#555" />
            <Text style={estilos.textoFiltroBotao}>
              {ordenacao === "maisRelevantes"
                ? "Mais relevantes"
                : ordenacao === "maisBarato"
                  ? "Mais barato"
                  : "Mais caro"}
            </Text>
            <Feather name="chevron-down" size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Indicador de Resultados */}
        <View style={estilos.linhaInfo}>
          <Text style={estilos.textoResultados}>
            {carregando
              ? "Buscando..."
              : `${professoresFiltrados.length} professores encontrados`}
          </Text>
        </View>

        {/* Lista de Resultados e Paginação */}
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          {carregando ? (
            <ActivityIndicator
              size="large"
              color="#FF6B1A"
              style={{ marginTop: 40 }}
            />
          ) : (
            <>
              {professoresExibicao.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 16 }}>
                  <Feather name="map-pin" size={42} color="#94A3B8" />
                  <Text style={{ fontSize: 15, fontWeight: "bold", color: "#334155", marginTop: 12, textAlign: "center" }}>
                    Nenhum professor encontrado
                  </Text>
                  <Text style={{ fontSize: 13, color: "#64748B", marginTop: 6, textAlign: "center", lineHeight: 18 }}>
                    Tente ampliar o raio de atendimento (ex: 20 km), buscar por outra matéria ou procurar aulas na modalidade 100% Online.
                  </Text>
                </View>
              ) : (
                professoresExibicao.map((prof) => (
                  <CardProfessor
                    key={prof.id}
                    nome={prof.nome}
                    materia={prof.aptidoes?.[0]?.saber?.nome || "Geral"}
                    nota={prof.notaMedia || 5.0}
                    avaliacoes={prof.totalAvaliacoes || 0}
                    precoHora={prof.aptidoes?.[0]?.precoHora || 0}
                    fotoUrl={
                      prof.fotoUrl || `https://i.pravatar.cc/150?u=${prof.id}`
                    }
                    oferecePresencial={prof.oferecePresencial}
                    regiaoAtendimento={prof.regiaoAtendimento}
                    textoProximidade={prof.textoProximidade}
                    onPress={() => router.push(`/professor/${prof.id}`)}
                  />
                ))
              )}

              <View style={estilos.paginacaoContainer}>
                {Array.from({ length: paginaMaximaVisivel }, (_, index) => {
                  const numeroPagina = index + 1;
                  return (
                    <TouchableOpacity
                      key={numeroPagina}
                      style={[
                        estilos.paginaBotao,
                        paginaAtual === numeroPagina &&
                          estilos.paginaBotaoAtivo,
                      ]}
                      onPress={() => selecionarPagina(numeroPagina)}
                    >
                      <Text
                        style={
                          paginaAtual === numeroPagina
                            ? estilos.textoPaginaAtiva
                            : estilos.textoPagina
                        }
                      >
                        {numeroPagina}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {temMaisPaginas ? (
                <Text style={estilos.rodapeLista}>
                  Há mais páginas disponíveis. Selecione a próxima página.
                </Text>
              ) : (
                professoresBanco.length > 0 && (
                  <Text style={estilos.rodapeLista}>
                    Você chegou à última página disponível.
                  </Text>
                )
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ===================================== */}
      {/* MODAIS DE APOIO (OVERLAYS) */}
      {/* ===================================== */}

      {/* Modal de Matérias */}
      <Modal visible={modalMateriaVisivel} transparent animationType="slide">
        <View style={estilos.fundoModal}>
          <View style={estilos.containerModal}>
            <Text style={estilos.tituloModal}>Filtrar por Matéria</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300 }}
            >
              {saberes.map((mat) => (
                <TouchableOpacity
                  key={mat}
                  style={estilos.opcaoModal}
                  onPress={() => {
                    setFiltroMateria(mat);
                    setModalMateriaVisivel(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: filtroMateria === mat ? "#FF6B1A" : "#333",
                      fontWeight: filtroMateria === mat ? "bold" : "normal",
                    }}
                  >
                    {mat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={estilos.botaoFecharModal}
              onPress={() => setModalMateriaVisivel(false)}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Ordenação */}
      <Modal visible={modalOrdenacaoVisivel} transparent animationType="slide">
        <View style={estilos.fundoModal}>
          <View style={estilos.containerModal}>
            <Text style={estilos.tituloModal}>Ordenar professores</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 280 }}
            >
              {[
                { key: "maisRelevantes", label: "Mais relevantes" },
                { key: "maisBarato", label: "Mais barato" },
                { key: "maisCaro", label: "Mais caro" },
              ].map((opcao) => (
                <TouchableOpacity
                  key={opcao.key}
                  style={estilos.opcaoModal}
                  onPress={() => {
                    setOrdenacao(opcao.key as any);
                    setModalOrdenacaoVisivel(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: ordenacao === opcao.key ? "#FF6B1A" : "#333",
                      fontWeight: ordenacao === opcao.key ? "bold" : "normal",
                    }}
                  >
                    {opcao.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={estilos.botaoFecharModal}
              onPress={() => setModalOrdenacaoVisivel(false)}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Preço */}
      <Modal visible={modalPrecoVisivel} transparent animationType="slide">
        <View style={estilos.fundoModal}>
          <View style={estilos.containerModal}>
            <Text style={estilos.tituloModal}>Preço Máximo da Hora</Text>
            {[40, 60, 80, 100, 150].map((preco) => (
              <TouchableOpacity
                key={preco}
                style={estilos.opcaoModal}
                onPress={() => {
                  setFiltroPrecoMax(preco);
                  setModalPrecoVisivel(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: filtroPrecoMax === preco ? "#FF6B1A" : "#333",
                    fontWeight: filtroPrecoMax === preco ? "bold" : "normal",
                  }}
                >
                  Até R$ {preco},00
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={estilos.botaoFecharModal}
              onPress={() => setModalPrecoVisivel(false)}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Privacidade e Consentimento LGPD (Fase 8 / MAP-003, MAP-SEC-002) */}
      <Modal visible={modalPrivacidadeVisivel} transparent animationType="fade">
        <View style={estilos.fundoModal}>
          <View style={[estilos.containerModal, { maxHeight: 520 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Feather name="shield" size={24} color="#0284C7" />
              <Text style={estilos.tituloModal}>Privacidade e LGPD</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 20 }}>
                  <Text style={{ fontWeight: "bold", color: "#0F172A" }}>• Minimização de Dados:</Text> Sua localização exata não é gravada de forma contínua e nunca é compartilhada publicamente.
                </Text>
                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 20 }}>
                  <Text style={{ fontWeight: "bold", color: "#0F172A" }}>• Cálculo de Distância Seguro:</Text> A distância é calculada pela fórmula matemática de Haversine diretamente no servidor Java, sem envio para serviços externos pagos.
                </Text>
                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 20 }}>
                  <Text style={{ fontWeight: "bold", color: "#0F172A" }}>• Endereço Protegido:</Text> O endereço residencial do professor e do aluno não é exibido nos resultados de busca ou perfis públicos.
                </Text>
                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 20 }}>
                  <Text style={{ fontWeight: "bold", color: "#0F172A" }}>• Alternativa sem GPS:</Text> Se preferir não permitir o GPS, você pode pesquisar informando diretamente o seu bairro ou região.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={{ backgroundColor: "#0284C7", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 16 }}
              onPress={() => setModalPrivacidadeVisivel(false)}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 15 }}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==========================================
// FOLHA DE ESTILOS
// ==========================================
const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    marginTop: 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tituloPagina: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    flex: 1,
    marginLeft: 15,
  },
  labelSecao: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  scrollChips: { paddingLeft: 20, marginBottom: 5 },
  chip: {
    backgroundColor: "#F5F7FA",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  chipAtivo: { backgroundColor: "#FFF0E7", borderColor: "#FF6B1A" },
  textoChip: { fontWeight: "600", color: "#444" },
  textoChipAtivo: { color: "#FF6B1A" },
  containerFiltros: { paddingHorizontal: 20, gap: 12 },
  botaoFiltroLargo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 16,
    justifyContent: "space-between",
  },
  textoFiltroBotao: { flex: 1, marginLeft: 12, fontSize: 15, color: "#333" },
  linhaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 30,
    alignItems: "center",
  },
  textoResultados: { color: "#888", fontSize: 14 },
  fundoModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  containerModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
    paddingBottom: 40,
  },
  tituloModal: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  opcaoModal: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    alignItems: "center",
  },
  botaoFecharModal: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  paginacaoContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
    justifyContent: "center",
  },
  paginaBotao: {
    minWidth: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  paginaBotaoAtivo: {
    borderColor: "#FF6B1A",
    backgroundColor: "#FF6B1A",
  },
  textoPagina: {
    color: "#444",
    fontWeight: "600",
  },
  textoPaginaAtiva: {
    color: "#FFF",
    fontWeight: "700",
  },
  rodapeLista: {
    marginTop: 16,
    textAlign: "center",
    color: "#555",
  },

  // Estilos da Fase 8 (Modalidade, Raio e Geolocalização)
  labelSecaoSemPadding: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
  },
  containerModalidade: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  botaoModalidade: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoModalidadeAtivo: {
    backgroundColor: "#FFF0E7",
    borderColor: "#FF6B1A",
  },
  botaoModalidadeAtivoPresencial: {
    backgroundColor: "#F0F9FF",
    borderColor: "#0284C7",
  },
  textoModalidade: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  textoModalidadeAtivo: {
    color: "#FF6B1A",
    fontWeight: "700",
  },
  textoModalidadeAtivoPresencial: {
    color: "#0284C7",
    fontWeight: "700",
  },

  painelPresencial: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  subtituloPresencial: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0369A1",
  },
  badgeGpsAtivo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  textoGpsAtivo: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  linhaBotoesRaio: {
    flexDirection: "row",
    gap: 8,
  },
  chipRaio: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  chipRaioAtivo: {
    borderColor: "#0284C7",
    backgroundColor: "#E0F2FE",
  },
  textoChipRaio: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  textoChipRaioAtivo: {
    color: "#0369A1",
    fontWeight: "700",
  },
  botaoAtivarGps: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
  },
  botaoAtivarGpsLigado: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  textoAtivarGps: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0284C7",
  },
});
