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
   * Dispara a requisição paginada para buscar os professores no banco de dados.
   * @async
   */
  const buscarProfessoresPagina = useCallback(
    async (page: number) => {
      if (!usuarioId) return;
      setCarregando(true);

      try {
        const url = `${API_URL}/api/usuarios/professores/destaque/${usuarioId}`;
        const resProfs = await fetch(url);

        if (resProfs.ok) {
          const dadosProfs: ProfessorBusca[] = await resProfs.json();
          const servidorRetornouTudo =
            page === 1 && dadosProfs.length > PAGE_SIZE;

          if (servidorRetornouTudo) {
            setPaginaLocalFallback(true);
            setPaginaMaximaVisivel(Math.ceil(dadosProfs.length / PAGE_SIZE));
            setTemMaisPaginas(dadosProfs.length > PAGE_SIZE);
          } else {
            setPaginaLocalFallback(false);
            setTemMaisPaginas(dadosProfs.length === PAGE_SIZE);
            setPaginaMaximaVisivel((anterior) =>
              Math.max(
                anterior,
                page + (dadosProfs.length === PAGE_SIZE ? 1 : 0),
              ),
            );
          }

          setProfessoresBanco(dadosProfs);
          setProfessoresFiltrados(dadosProfs);
          setPaginaAtual(page);
        }
      } catch (e) {
        console.error("Erro ao buscar professores por página:", e);
      } finally {
        setCarregando(false);
      }
    },
    [usuarioId],
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

        {/* Barramento de Filtros Dropdown */}
        <Text style={estilos.labelSecao}>Filtros</Text>
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
              {professoresExibicao.map((prof) => (
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
                  onPress={() => router.push(`/professor/${prof.id}`)}
                />
              ))}

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
});
