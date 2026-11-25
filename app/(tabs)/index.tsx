/**
 * @file index.tsx
 * @description Controlador Principal da Tela Home (Hub Central de Navegação).
 * Gerencia o estado de autenticação e chaveia dinamicamente entre:
 * - Home do Aluno: Hero 3D, categorias populares, professores em destaque e benefícios.
 * - Home do Professor: Dashboard operacional com Agenda do Dia, Métricas e Solicitações.
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Importações de Componentes Globais e Contexto de Sessão
import BotaoRapido from "../../components/BotaoRapido";
import CardAula from "../../components/CardAula";
import AvatarPerfil from "../../components/AvatarPerfil";
import ResumoProfessor from "../../components/ResumoProfessor";
import {
  API_URL,
  apiFetch,
  extrairDadosLista,
  extrairDadosObjeto,
  getApiErrorMessage,
} from "../../config/api";
import { Theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { CategoriaPopular, obterCategoriasPopulares } from "../../services/disciplinasService";
import HomeProfessorScreen from "../home-professor";

const { width: LARGURA_DISPOSITIVO } = Dimensions.get("window");

// ==========================================
// 1. CONTRATOS DE TIPAGEM (INTERFACES TS)
// ==========================================

interface Saber {
  id: number;
  nome: string;
}

interface InteresseAssociativo {
  id: number;
  saber: Saber;
}

interface Aptidao {
  saberNome?: string | null;
  precoHora?: number | null;
}

interface ProfessorDestaque {
  id: number;
  nome: string;
  notaMedia: number | null;
  totalAvaliacoes: number | null;
  fotoUrl: string | null;
  materia: string | null;
  precoHora: number | null;
}

interface ProfessorDestaqueApi {
  id: number;
  nome: string;
  notaMedia?: number | null;
  totalAvaliacoes?: number | null;
  fotoUrl?: string | null;
  aptidoes?: Aptidao[] | null;
}

interface AlunoVinculado {
  id: number;
  nome: string;
}

interface DadosAluno {
  id: number;
  nome: string;
  interesses?: InteresseAssociativo[];
}

interface Agendamento {
  id: number;
  data: string;
  hora: string;
  status: string;
  aluno?: AlunoVinculado;
}

// ==========================================
// 2. DADOS DE REFERÊNCIA OFICIAL (IMG-005)
// ==========================================

const VISUAL_CATEGORIAS: Record<
  string,
  { icone: keyof typeof Feather.glyphMap; cor: string; bg: string }
> = {
  Exatas: { icone: "book-open", cor: "#2563EB", bg: "#EFF6FF" },
  Tecnologia: { icone: "code", cor: "#EA580C", bg: "#FFF7ED" },
  Humanas: { icone: "edit-3", cor: "#0284C7", bg: "#F0F9FF" },
  Ciências: { icone: "activity", cor: "#6366F1", bg: "#EEF2FF" },
  Idiomas: { icone: "globe", cor: "#334155", bg: "#F8FAFC" },
  Negócios: { icone: "bar-chart-2", cor: "#D97706", bg: "#FEF3C7" },
};

const BENEFICIOS_IMG005 = [
  {
    id: 1,
    icone: "calendar" as const,
    cor: "#2563EB",
    titulo: "Agende",
    descricao: "suas mentorias\nde forma fácil",
  },
  {
    id: 2,
    icone: "message-square" as const,
    cor: "#10B981",
    titulo: "Tire dúvidas",
    descricao: "e evolua com\nacompanhamento",
  },
  {
    id: 3,
    icone: "shield" as const,
    cor: "#D97706",
    titulo: "Ambiente",
    descricao: "seguro e confiável\npara aprender",
  },
  {
    id: 4,
    icone: "trending-up" as const,
    cor: "#FF5A1F",
    titulo: "Acompanhe",
    descricao: "seu progresso\nsempre",
  },
];


// ==========================================
// 3. COMPONENTE PRINCIPAL (HUB CHAVEADOR)
// ==========================================

export default function Index() {
  const { perfilAtivo, nomeUsuario } = useAuth() as any;

  return perfilAtivo === "Professor" ? (
    <HomeProfessorScreen exibirBarraInferior={false} />
  ) : (
    <HomeAluno nome={nomeUsuario} />
  );
}

// ==========================================
// 4. SUBVISÃO: HOME DO ALUNO (IMG-005)
// ==========================================

function HomeAluno({ nome }: { nome: string }) {
  const { isAuthenticated, carregandoAuth, perfilAtivo } = useAuth();
  const exibirTutor = process.env.EXPO_PUBLIC_TUTOR_ENABLED !== "false" &&
    isAuthenticated && !carregandoAuth && perfilAtivo === "Aluno";
  const insets = useSafeAreaInsets();
  const [professores, setProfessores] = useState<ProfessorDestaque[]>([]);
  const [favoritos, setFavoritos] = useState<Record<number, boolean>>({});
  const [carregandoProfessores, setCarregandoProfessores] = useState(true);
  const [erroProfessores, setErroProfessores] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const categoriasScrollRef = useRef<ScrollView>(null);
  const [categoriasTemAnterior, setCategoriasTemAnterior] = useState(false);
  const [categoriasTemProxima, setCategoriasTemProxima] = useState(false);
  const categoriasMedidasRef = useRef({ larguraConteudo: 0, larguraVisivel: 0 });
  const professoresScrollRef = useRef<ScrollView>(null);
  const [professoresTemAnterior, setProfessoresTemAnterior] = useState(false);
  const [professoresTemProxima, setProfessoresTemProxima] = useState(false);
  const professoresMedidasRef = useRef({ larguraConteudo: 0, larguraVisivel: 0 });
  const [categoriasPopulares, setCategoriasPopulares] = useState<CategoriaPopular[]>([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [erroCategorias, setErroCategorias] = useState<string | null>(null);

  const atualizarIndicadoresCategorias = (offsetX = 0) => {
    const { larguraConteudo, larguraVisivel } = categoriasMedidasRef.current;
    setCategoriasTemAnterior(offsetX > 2);
    setCategoriasTemProxima(offsetX + larguraVisivel < larguraConteudo - 2);
  };

  const moverCategorias = () => {
    if (categoriasTemProxima) {
      categoriasScrollRef.current?.scrollToEnd({ animated: true });
    } else {
      categoriasScrollRef.current?.scrollTo({ x: 0, animated: true });
    }
  };

  const atualizarIndicadoresProfessores = (offsetX = 0) => {
    const { larguraConteudo, larguraVisivel } = professoresMedidasRef.current;
    setProfessoresTemAnterior(offsetX > 2);
    setProfessoresTemProxima(offsetX + larguraVisivel < larguraConteudo - 2);
  };

  const moverProfessores = () => {
    if (professoresTemProxima) {
      professoresScrollRef.current?.scrollToEnd({ animated: true });
    } else {
      professoresScrollRef.current?.scrollTo({ x: 0, animated: true });
    }
  };

  const carregarCategoriasPopulares = useCallback(async () => {
    setCarregandoCategorias(true);
    setErroCategorias(null);
    setCategoriasTemAnterior(false);
    setCategoriasTemProxima(false);
    categoriasScrollRef.current?.scrollTo({ x: 0, animated: false });

    try {
      setCategoriasPopulares(await obterCategoriasPopulares());
    } catch (error) {
      setCategoriasPopulares([]);
      setErroCategorias(getApiErrorMessage(error));
    } finally {
      setCarregandoCategorias(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarCategoriasPopulares();
    }, [carregarCategoriasPopulares])
  );

  const carregarProfessores = useCallback(async () => {
    setCarregandoProfessores(true);
    setErroProfessores(null);
    setProfessoresTemAnterior(false);
    setProfessoresTemProxima(false);
    professoresScrollRef.current?.scrollTo({ x: 0, animated: false });
    try {
      const resposta = await apiFetch(
        `${API_URL}/api/v1/usuarios/professores/busca?modalidade=TODAS`
      );
      const registros = extrairDadosLista<ProfessorDestaqueApi>(await resposta.json());
      const professoresReais = registros
        .filter((professor) =>
          Number.isInteger(professor.id) &&
          professor.id > 0 &&
          typeof professor.nome === "string" &&
          professor.nome.trim().length > 0
        )
        .map((professor): ProfessorDestaque => {
          const aptidoes = (professor.aptidoes ?? []).filter(
            (aptidao): aptidao is Aptidao =>
              typeof aptidao?.saberNome === "string" &&
              aptidao.saberNome.trim().length > 0
          );
          const aptidaoPrincipal = aptidoes[0];
          const precos = aptidoes
            .map((aptidao) => aptidao.precoHora)
            .filter((preco): preco is number =>
              typeof preco === "number" && Number.isFinite(preco) && preco >= 0
            );

          return {
            id: professor.id,
            nome: professor.nome.trim(),
            notaMedia:
              typeof professor.notaMedia === "number" &&
              Number.isFinite(professor.notaMedia)
                ? professor.notaMedia
                : null,
            totalAvaliacoes:
              typeof professor.totalAvaliacoes === "number" &&
              Number.isFinite(professor.totalAvaliacoes)
                ? professor.totalAvaliacoes
                : null,
            fotoUrl:
              typeof professor.fotoUrl === "string" && professor.fotoUrl.trim()
                ? professor.fotoUrl.trim()
                : null,
            materia: aptidaoPrincipal?.saberNome?.trim() ?? null,
            precoHora: precos.length > 0 ? Math.min(...precos) : null,
          };
        })
        .slice(0, 10);
      setProfessores(professoresReais);
    } catch (error) {
      setProfessores([]);
      setErroProfessores(getApiErrorMessage(error));
    } finally {
      setCarregandoProfessores(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarProfessores();
    }, [carregarProfessores])
  );

  const aoAtualizar = async () => {
    setAtualizando(true);
    await Promise.all([carregarCategoriasPopulares(), carregarProfessores()]);
    setAtualizando(false);
  };

  const alternarFavorito = (id: number) => {
    setFavoritos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const primeiroNome = (nome || "Jorbson").split(" ")[0];

  return (
    <View style={estilos.telaGeral}>
      <ScrollView
        style={estilos.telaGeral}
        contentContainerStyle={estilos.conteudoScrollAluno}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoAtualizar}
            colors={["#FF5A1F"]}
            tintColor="#FF5A1F"
          />
        }
      >
        {/* ============================================================== */}
        {/* 1. SAUDAÇÃO PERSONALIZADA E SINO DE NOTIFICAÇÕES (IMG-005)      */}
        {/* ============================================================== */}
        <View style={estilos.cabecalhoAluno}>
          <View style={estilos.areaBoasVindas}>
            <Text style={estilos.textoOla}>Olá, {primeiroNome}! 👋</Text>
            <Text style={estilos.tituloPrincipal}>
              Encontre o professor ideal{"\n"}e{" "}
              <Text style={estilos.palavraAvance}>avance</Text> nos seus estudos.
            </Text>
          </View>

          <TouchableOpacity
            style={estilos.botaoSino}
            activeOpacity={0.7}
            onPress={() => router.push("/notificacoes" as any)}
            accessibilityLabel="Central de Notificações"
          >
            <Feather name="bell" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* 2. BARRA DE BUSCA COM BOTÃO DE FILTROS (IMG-005)               */}
        {/* ============================================================== */}
        <View style={estilos.linhaBusca}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/busca-professores")}
            style={estilos.campoBusca}
          >
            <Feather
              name="search"
              size={20}
              color="#94A3B8"
              style={{ marginRight: 10 }}
            />
            <Text style={estilos.placeholderBusca} numberOfLines={1}>
              Buscar professores, matérias ou habilidades...
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/busca-professores",
                params: { abrirFiltros: "true" },
              })
            }
            style={estilos.botaoFiltros}
          >
            <Feather
              name="sliders"
              size={18}
              color="#0F172A"
              style={{ marginRight: 6 }}
            />
            <Text style={estilos.textoFiltros}>Filtros</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* 3. HERO BANNER 3D COM MENSAGEM INSTITUCIONAL (IMG-005)         */}
        {/* ============================================================== */}
        <View style={estilos.bannerHeroContainer}>
          <LinearGradient
            colors={["#FFF8F1", "#FFEDE1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={estilos.bannerHeroGradiente}
          >
            {/* Lado Esquerdo: Textos Institucionais e Botão CTA */}
            <View style={estilos.bannerHeroTextoArea}>
              <Text style={estilos.bannerHeroTitulo}>
                Conheça o Tutor{"\n"}
                <Text style={estilos.bannerHeroTituloDestaque}>
                  Virtual Orienta.
                </Text>
              </Text>

              <Text style={estilos.bannerHeroSubtitulo}>
                Tire dúvidas, receba dicas de estudo e encontre apoio para avançar.
              </Text>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push("/assistente")}
                style={estilos.botaoHeroExplorar}
                accessibilityRole="button"
                accessibilityLabel="Conversar com o Tutor Virtual Orienta"
              >
                <Text style={estilos.textoBotaoHeroExplorar}>
                  Conversar com o tutor
                </Text>
              </TouchableOpacity>

            </View>

            {/* Lado Direito: Ilustração 3D com Estudante e Ícones Flutuantes */}
            <View style={estilos.bannerHeroImagemArea}>
              <Image
                source={require("../../assets/images/hero-student.png")}
                style={estilos.imagemHeroEstudante}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
        </View>

        {exibirTutor && (
          <TouchableOpacity
            style={estilos.atalhoTutor}
            accessibilityRole="button"
            onPress={() => router.push("/tutor")}
          >
            <Feather name="help-circle" size={20} color="#A83A16" />
            <Text style={estilos.textoAtalhoTutor}>Dúvidas sobre o Orienta</Text>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>
        )}

        {/* ============================================================== */}
        {/* 4. CARROSSEL DE SEIS CATEGORIAS POPULARES (IMG-005)            */}
        {/* ============================================================== */}
        <View style={estilos.secaoHeader}>
          <Text style={estilos.secaoTitulo}>Categorias populares</Text>
          <TouchableOpacity
            onPress={() => router.push("/explorar-disciplinas")}
            activeOpacity={0.7}
          >
            <Text style={estilos.secaoLink}>Ver todas &gt;</Text>
          </TouchableOpacity>
        </View>

        {carregandoCategorias ? (
          <ActivityIndicator
            size="small"
            color="#FF5A1F"
            style={estilos.estadoCategorias}
            accessibilityLabel="Carregando categorias populares"
          />
        ) : erroCategorias ? (
          <TouchableOpacity
            style={estilos.estadoCategorias}
            onPress={() => void carregarCategoriasPopulares()}
            accessibilityRole="button"
          >
            <Text style={estilos.mensagemCategorias}>
              Não foi possível carregar as categorias. Toque para tentar novamente.
            </Text>
          </TouchableOpacity>
        ) : categoriasPopulares.length === 0 ? (
          <Text style={estilos.mensagemCategorias}>
            Ainda não há categorias ensinadas por professores.
          </Text>
        ) : (
          <View
            style={estilos.areaCarrosselCategorias}
            onLayout={(event) => {
              categoriasMedidasRef.current.larguraVisivel = event.nativeEvent.layout.width;
              atualizarIndicadoresCategorias();
            }}
          >
            <ScrollView
              ref={categoriasScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              directionalLockEnabled
              contentContainerStyle={estilos.carrosselCategoriasContainer}
              accessibilityLabel="Categorias populares. Deslize horizontalmente para ver todas."
              onContentSizeChange={(width) => {
                categoriasMedidasRef.current.larguraConteudo = width;
                atualizarIndicadoresCategorias();
              }}
              onScroll={(event) =>
                atualizarIndicadoresCategorias(event.nativeEvent.contentOffset.x)
              }
              scrollEventThrottle={16}
            >
              {categoriasPopulares.map((cat) => {
                const visual = VISUAL_CATEGORIAS[cat.nome] ?? {
                  icone: "book" as const,
                  cor: "#475569",
                  bg: "#F8FAFC",
                };
                return (
                  <TouchableOpacity
                    key={cat.nome}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: "/busca-professores",
                        params: { categoria: cat.nome },
                      })
                    }
                    style={estilos.cardCategoriaQuadrado}
                  >
                    <View style={[estilos.iconeCategoriaWrap, { backgroundColor: visual.bg }]}>
                      <Feather name={visual.icone} size={22} color={visual.cor} />
                    </View>
                    <Text style={estilos.textoCategoriaNome} numberOfLines={1}>
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {(categoriasTemAnterior || categoriasTemProxima) && (
              <TouchableOpacity
                style={[estilos.setaCarrosselCategorias, estilos.setaCarrosselDireita]}
                onPress={moverCategorias}
                accessibilityRole="button"
                accessibilityLabel={
                  categoriasTemProxima
                    ? "Mostrar mais categorias"
                    : "Voltar às primeiras categorias"
                }
              >
                <Feather
                  name={categoriasTemProxima ? "chevron-right" : "chevron-left"}
                  size={20}
                  color="#475569"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* 5. CARDS VERTICAIS DE PROFESSORES RECOMENDADOS (IMG-005)       */}
        {/* ============================================================== */}
        <View style={estilos.secaoHeader}>
          <Text style={estilos.secaoTitulo}>Professores em destaque</Text>
          <TouchableOpacity
            onPress={() => router.push("/busca-professores")}
            activeOpacity={0.7}
          >
            <Text style={estilos.secaoLink}>Ver todas &gt;</Text>
          </TouchableOpacity>
        </View>

        {carregandoProfessores ? (
          <ActivityIndicator
            size="small"
            color="#FF5A1F"
            style={estilos.estadoProfessores}
            accessibilityLabel="Carregando professores em destaque"
          />
        ) : erroProfessores ? (
          <TouchableOpacity
            style={estilos.estadoProfessores}
            onPress={() => void carregarProfessores()}
            accessibilityRole="button"
          >
            <Text style={estilos.mensagemProfessores}>
              Não foi possível carregar os professores. Toque para tentar novamente.
            </Text>
          </TouchableOpacity>
        ) : professores.length === 0 ? (
          <Text style={estilos.mensagemProfessores}>
            Ainda não há professores cadastrados para exibir.
          </Text>
        ) : (
          <View
            style={estilos.areaCarrosselProfessores}
            onLayout={(event) => {
              professoresMedidasRef.current.larguraVisivel = event.nativeEvent.layout.width;
              atualizarIndicadoresProfessores();
            }}
          >
            <ScrollView
              ref={professoresScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              directionalLockEnabled
              contentContainerStyle={estilos.carrosselProfessoresContainer}
              accessibilityLabel="Professores em destaque. Deslize horizontalmente para ver até 10 professores."
              onContentSizeChange={(width) => {
                professoresMedidasRef.current.larguraConteudo = width;
                atualizarIndicadoresProfessores();
              }}
              onScroll={(event) =>
                atualizarIndicadoresProfessores(event.nativeEvent.contentOffset.x)
              }
              scrollEventThrottle={16}
            >
              {professores.map((prof) => {
                const isFav = !!favoritos[prof.id];
                const precoFormatado =
                  prof.precoHora !== null
                    ? prof.precoHora.toFixed(2).replace(".", ",")
                    : null;
                const notaFormatada =
                  prof.notaMedia !== null
                    ? prof.notaMedia.toFixed(1).replace(".", ",")
                    : null;

                return (
                  <TouchableOpacity
                    key={prof.id}
                    activeOpacity={0.9}
                    onPress={() => router.push(`/professor/${prof.id}`)}
                    style={estilos.cardProfessorVertical}
                  >
                    <View style={estilos.cardProfTopoLinha}>
                      <TouchableOpacity
                        onPress={() => alternarFavorito(prof.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={estilos.botaoFavorito}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isFav ? `Remover ${prof.nome} dos favoritos` : `Favoritar ${prof.nome}`
                        }
                      >
                        <Ionicons
                          name={isFav ? "heart" : "heart-outline"}
                          size={18}
                          color={isFav ? "#EF4444" : "#94A3B8"}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={estilos.avatarProfWrapper}>
                      <AvatarPerfil
                        nome={prof.nome}
                        fotoUrl={prof.fotoUrl}
                        tamanho={66}
                      />
                    </View>

                    <Text style={estilos.cardProfNome} numberOfLines={1}>
                      {prof.nome}
                    </Text>
                    <Text style={estilos.cardProfMateria} numberOfLines={1}>
                      {prof.materia ?? "Matéria não informada"}
                    </Text>

                    <View style={estilos.cardProfAvaliacaoLinha}>
                      {notaFormatada ? (
                        <>
                          <Text style={estilos.estrelaIcone}>★</Text>
                          <Text style={estilos.notaValor}>{notaFormatada}</Text>
                        </>
                      ) : (
                        <Text style={estilos.totalAvaliacoes}>Sem nota</Text>
                      )}
                      <Text style={estilos.totalAvaliacoes}>
                        {prof.totalAvaliacoes !== null
                          ? `(${prof.totalAvaliacoes} avaliações)`
                          : "(avaliações indisponíveis)"}
                      </Text>
                    </View>

                    <View style={estilos.cardProfPrecoArea}>
                      {precoFormatado ? (
                        <>
                          <Text style={estilos.textoAPartir}>A partir de</Text>
                          <Text style={estilos.textoPrecoHora}>
                            R$ {precoFormatado}/h
                          </Text>
                        </>
                      ) : (
                        <Text style={estilos.totalAvaliacoes}>Preço não informado</Text>
                      )}
                    </View>

                    {prof.materia && (
                      <View style={estilos.tagDisciplinaPill}>
                        <Text
                          style={estilos.tagDisciplinaTexto}
                          numberOfLines={1}
                        >
                          {prof.materia}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {(professoresTemAnterior || professoresTemProxima) && (
              <TouchableOpacity
                style={[
                  estilos.setaCarrosselCategorias,
                  estilos.setaCarrosselProfessores,
                ]}
                onPress={moverProfessores}
                accessibilityRole="button"
                accessibilityLabel={
                  professoresTemProxima
                    ? "Mostrar mais professores"
                    : "Voltar aos primeiros professores"
                }
              >
                <Feather
                  name={professoresTemProxima ? "chevron-right" : "chevron-left"}
                  size={20}
                  color="#475569"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* 6. FAIXA INSTITUCIONAL COM QUATRO BENEFÍCIOS (IMG-005)         */}
        {/* ============================================================== */}
        <View style={estilos.faixaBeneficiosCard}>
          {BENEFICIOS_IMG005.map((b, idx) => (
            <React.Fragment key={b.id}>
              <View style={estilos.colunaBeneficio}>
                <View style={estilos.iconeBeneficioWrap}>
                  <Feather name={b.icone} size={20} color={b.cor} />
                </View>
                <Text style={estilos.beneficioTitulo}>{b.titulo}</Text>
                <Text style={estilos.beneficioDescricao}>{b.descricao}</Text>
              </View>
              {idx < BENEFICIOS_IMG005.length - 1 && (
                <View style={estilos.divisorVerticalBeneficio} />
              )}
            </React.Fragment>
          ))}
        </View>

      </ScrollView>

    </View>
  );
}

// ==========================================
// 5. SUBVISÃO: DASHBOARD DO PROFESSOR (PRESERVADO)
// ==========================================

function HomeProfessor({ nome }: { nome: string }) {
  const { usuarioId } = useAuth() as any;
  const [proximasAulas, setProximasAulas] = useState<Agendamento[]>([]);
  const [carregandoAulas, setCarregandoAulas] = useState(true);

  // Estados do Modal de Alertas
  const [modalSolicitacoesVisivel, setModalSolicitacoesVisivel] =
    useState(false);
  const [alertasDescartados, setAlertasDescartados] = useState(false);

  const buscarAulasProfessor = useCallback(async () => {
    if (!usuarioId) return;
    try {
      const res = await fetch(`${API_URL}/agendamentos/professor/${usuarioId}`);
      if (res.ok) {
        const payload: unknown = await res.json();
        const dados: Agendamento[] = extrairDadosLista<Agendamento>(payload);
        setProximasAulas(dados);
      }
    } catch (error) {
      console.error("Erro na busca de agendamentos do professor: ", error);
    } finally {
      setCarregandoAulas(false);
    }
  }, [usuarioId]);

  useFocusEffect(
    useCallback(() => {
      setAlertasDescartados(false);
      buscarAulasProfessor();
    }, [buscarAulasProfessor])
  );

  const hoje = new Date();
  const anoAtualStr = String(hoje.getFullYear());
  const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, "0");
  const diaAtualStr = String(hoje.getDate()).padStart(2, "0");
  const hojeStr = `${anoAtualStr}-${mesAtualStr}-${diaAtualStr}`;

  const aulasHoje = proximasAulas
    .filter((a) => a.status === "CONFIRMADO" && a.data === hojeStr)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const solicitacoesPendentes = proximasAulas.filter(
    (a) => a.status === "PENDENTE"
  );
  const aulasConfirmadasTotal = proximasAulas.filter(
    (a) => a.status === "CONFIRMADO"
  ).length;

  useEffect(() => {
    if (solicitacoesPendentes.length > 0 && !alertasDescartados) {
      setModalSolicitacoesVisivel(true);
    } else {
      setModalSolicitacoesVisivel(false);
    }
  }, [proximasAulas, alertasDescartados]);

  const lidarComAceite = async (idAgendamento: number) => {
    try {
      const res = await fetch(
        `${API_URL}/agendamentos/${idAgendamento}/aceitar`,
        { method: "PUT" }
      );
      if (res.ok) {
        buscarAulasProfessor();
      }
    } catch (error) {
      console.error("Falha ao aceitar mentoria: ", error);
    }
  };

  const lidarComRecusa = async (idAgendamento: number) => {
    try {
      const res = await fetch(
        `${API_URL}/agendamentos/${idAgendamento}/cancelar`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            justificativa: "Recusado via painel mobile pelo professor.",
          }),
        }
      );
      if (res.ok) {
        buscarAulasProfessor();
      }
    } catch (error) {
      console.error("Falha ao recusar mentoria: ", error);
    }
  };

  const primeiraSolicitacao = solicitacoesPendentes[0];

  return (
    <View style={estilos.telaGeral}>
      <ScrollView
        style={estilos.telaGeral}
        contentContainerStyle={estilos.conteudoScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.cabecalhoProfessor}>
          <Text style={estilos.textoOla}>Olá, {nome || "Professor"}! 🎓</Text>
          <Text style={estilos.tituloPrincipal}>
            Gerencie suas aulas,{"\n"}inspire e{" "}
            <Text style={estilos.palavraAvance}>transforme vidas.</Text>
          </Text>
        </View>

        <View style={estilos.cardResumoGeral}>
          <View style={estilos.resumoGeralHeader}>
            <Text style={estilos.resumoGeralTitulo}>Resumo geral</Text>
            <TouchableOpacity style={estilos.botaoFiltroMes}>
              <Text style={estilos.textoFiltroMes}>Este mês ⌄</Text>
            </TouchableOpacity>
          </View>
          <View style={estilos.containerMetricas}>
            <ResumoProfessor
              icon="award"
              titulo="Aulas ativas"
              valor={String(aulasConfirmadasTotal)}
              fundo="#FFF0E7"
            />
            <ResumoProfessor
              icon="users"
              titulo="Solicitações"
              valor={String(solicitacoesPendentes.length)}
              fundo="#EEF5FF"
            />
            <ResumoProfessor
              icon="dollar-sign"
              titulo="Ganhos (R$)"
              valor="0,00"
              fundo="#EFFBF4"
            />
            <ResumoProfessor
              icon="star"
              titulo="Avaliação"
              valor="5.0"
              fundo="#FFFDEB"
            />
          </View>
        </View>

        <Text style={estilos.tituloSecaoRapida}>Acesso rápido</Text>
        <View style={estilos.containerAcessoRapido}>
          <BotaoRapido
            icon="calendar"
            texto="Nova aula"
            onPress={() => router.push("/(tabs)/agenda")}
          />
          <BotaoRapido
            icon="dollar-sign"
            texto="Painel ganhos"
            onPress={() => router.push("/painel-ganhos")}
          />
          <BotaoRapido
            icon="clock"
            texto="Histórico"
            onPress={() => router.push("/historico-alunos")}
          />
        </View>

        <View style={estilos.bannerProfessor}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.bannerProfTitulo}>
              Precisa de ajuda com suas aulas?
            </Text>
            <Text style={estilos.bannerProfSubtitulo}>
              Acesse nosso assistente acadêmico para tirar dúvidas e dicas pedagógicas.
            </Text>
            <TouchableOpacity
              style={estilos.botaoProfAssistente}
              onPress={() => router.push("/assistente")}
            >
              <Text style={estilos.textoProfAssistente}>Abrir assistente</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={estilos.tituloSecaoRapida}>Agenda do dia</Text>
        <View style={estilos.listaAulasContainer}>
          {carregandoAulas ? (
            <ActivityIndicator
              size="large"
              color="#FF5A1F"
              style={{ padding: 20 }}
            />
          ) : aulasHoje.length > 0 ? (
            aulasHoje.map((aula) => (
              <CardAula
                key={aula.id}
                id={aula.id}
                nome={aula.aluno ? aula.aluno.nome : "Aluno Orienta"}
                materia="Mentoria Geral"
                data={aula.data}
                hora={aula.hora}
                status={aula.status}
                foto={`https://i.pravatar.cc/150?u=${aula.id}`}
                onAceitar={lidarComAceite}
                onRecusar={lidarComRecusa}
              />
            ))
          ) : (
            <Text style={estilos.textoVazioCentralizado}>
              Você não possui mentorias confirmadas para hoje. Aproveite para planejar seus conteúdos!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Modal de Alerta de Solicitação para o Professor */}
      <Modal
        visible={modalSolicitacoesVisivel}
        transparent
        animationType="fade"
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCard}>
            <View style={estilos.modalHeader}>
              <FontAwesome5 name="bell" size={20} color="#FF5A1F" />
              <Text style={estilos.modalTitulo}>Nova solicitação de mentoria</Text>
            </View>

            <Text style={estilos.modalSubtitulo}>
              Um aluno solicitou um horário com você. Revise os detalhes abaixo:
            </Text>

            {primeiraSolicitacao && (
              <View style={estilos.containerDetalhesSolicitacao}>
                <View style={estilos.modalAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.modalAlunoNome}>
                    {primeiraSolicitacao.aluno
                      ? primeiraSolicitacao.aluno.nome
                      : "Novo Aluno"}
                  </Text>
                  <Text style={estilos.modalDataTexto}>
                    Data: {primeiraSolicitacao.data} às {primeiraSolicitacao.hora}
                  </Text>
                </View>
              </View>
            )}

            <View style={estilos.modalContainerAcoes}>
              <TouchableOpacity
                style={[estilos.modalBotao, { backgroundColor: "#EF4444" }]}
                onPress={() => {
                  if (primeiraSolicitacao) lidarComRecusa(primeiraSolicitacao.id);
                  setModalSolicitacoesVisivel(false);
                }}
              >
                <Text style={estilos.modalTextoBotao}>Recusar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.modalBotao, { backgroundColor: "#10B981" }]}
                onPress={() => {
                  if (primeiraSolicitacao) lidarComAceite(primeiraSolicitacao.id);
                  setModalSolicitacoesVisivel(false);
                }}
              >
                <Text style={estilos.modalTextoBotao}>Aceitar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={estilos.modalBotaoVerDepois}
              onPress={() => {
                setAlertasDescartados(true);
                setModalSolicitacoesVisivel(false);
              }}
            >
              <Text style={estilos.modalTextoVerDepois}>Ver mais tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==========================================
// 6. ESTILOS VISUAIS DO ORIENTA 2.0 (IMG-005)
// ==========================================

const estilos = StyleSheet.create({
  telaGeral: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  telaCarregamento: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  conteudoScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  conteudoScrollAluno: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
  },

  // 1. Cabeçalho do Aluno
  cabecalhoAluno: {
    marginTop: Platform.OS === "ios" ? 44 : 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cabecalhoProfessor: {
    marginTop: Platform.OS === "ios" ? 44 : 20,
    marginBottom: 16,
  },
  areaBoasVindas: {
    flex: 1,
    paddingRight: 12,
  },
  textoOla: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  tituloPrincipal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  palavraAvance: {
    color: "#FF5A1F",
  },
  botaoSino: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  // 2. Barra de Busca e Filtros
  linhaBusca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  campoBusca: {
    flex: 1,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  placeholderBusca: {
    fontSize: 13,
    color: "#94A3B8",
    flex: 1,
  },
  botaoFiltros: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  textoFiltros: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  // 3. Hero Banner 3D
  bannerHeroContainer: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 24,
    shadowColor: "#FF5A1F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  bannerHeroGradiente: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  bannerHeroTextoArea: {
    flex: 1.2,
    paddingRight: 6,
    zIndex: 2,
  },
  bannerHeroTitulo: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  bannerHeroTituloDestaque: {
    color: "#FF5A1F",
  },
  bannerHeroSubtitulo: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 17,
  },
  botaoHeroExplorar: {
    backgroundColor: "#FF5A1F",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 14,
    alignSelf: "flex-start",
    shadowColor: "#FF5A1F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  textoBotaoHeroExplorar: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  bannerHeroImagemArea: {
    flex: 0.95,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  imagemHeroEstudante: {
    width: 148,
    height: 148,
  },

  // 4. Cabeçalho de Seções Genérico
  atalhoTutor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
  },
  textoAtalhoTutor: {
    flex: 1,
    color: "#15233C",
    fontSize: 15,
    fontWeight: "600",
  },
  secaoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  secaoLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5A1F",
  },

  // 4. Categorias Populares
  estadoCategorias: {
    minHeight: 102,
    justifyContent: "center",
  },
  mensagemCategorias: {
    minHeight: 54,
    paddingVertical: 16,
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
  },
  estadoProfessores: {
    minHeight: 220,
    justifyContent: "center",
  },
  mensagemProfessores: {
    minHeight: 54,
    paddingVertical: 16,
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
  },
  areaCarrosselCategorias: {
    position: "relative",
  },
  carrosselCategoriasContainer: {
    paddingLeft: 10,
    paddingRight: 44,
    gap: 10,
    paddingBottom: 22,
  },
  setaCarrosselCategorias: {
    position: "absolute",
    top: 26,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 1,
  },
  setaCarrosselDireita: {
    right: 4,
  },
  cardCategoriaQuadrado: {
    width: 76,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconeCategoriaWrap: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  textoCategoriaNome: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },

  // 5. Professores em Destaque (Cards Verticais)
  carrosselProfessoresContainer: {
    paddingLeft: 10,
    paddingRight: 44,
    gap: 12,
    paddingBottom: 24,
  },
  areaCarrosselProfessores: {
    position: "relative",
  },
  setaCarrosselProfessores: {
    top: "50%",
    right: 4,
    marginTop: -15,
  },
  cardProfessorVertical: {
    width: 158,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardProfTopoLinha: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  botaoFavorito: {
    padding: 2,
  },
  avatarProfWrapper: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#F8FAFC",
  },
  cardProfNome: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 2,
  },
  cardProfMateria: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 6,
  },
  cardProfAvaliacaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 10,
  },
  estrelaIcone: {
    color: "#F59E0B",
    fontSize: 11,
  },
  notaValor: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  totalAvaliacoes: {
    fontSize: 10,
    color: "#94A3B8",
  },
  cardProfPrecoArea: {
    alignItems: "center",
    marginBottom: 10,
  },
  textoAPartir: {
    fontSize: 10,
    color: "#94A3B8",
  },
  textoPrecoHora: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0284C7",
  },
  tagDisciplinaPill: {
    width: "100%",
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tagDisciplinaTexto: {
    fontSize: 11,
    fontWeight: "700",
  },

  // 6. Faixa de Benefícios
  faixaBeneficiosCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  colunaBeneficio: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  iconeBeneficioWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  beneficioTitulo: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 2,
  },
  beneficioDescricao: {
    fontSize: 8.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 11,
  },
  divisorVerticalBeneficio: {
    width: 1,
    height: 40,
    backgroundColor: "#F1F5F9",
  },

  // Subvisão do Professor
  textoVazioCentralizado: {
    color: "#999",
    fontStyle: "italic",
    padding: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  cardResumoGeral: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  resumoGeralHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resumoGeralTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
  },
  botaoFiltroMes: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FAFAFA",
  },
  textoFiltroMes: {
    fontSize: 12,
    color: "#555",
    fontWeight: "500",
  },
  containerMetricas: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  tituloSecaoRapida: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 26,
    marginBottom: 14,
    color: "#111",
  },
  containerAcessoRapido: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bannerProfessor: {
    marginTop: 20,
    backgroundColor: "#FFF0E7",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  bannerProfTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  bannerProfSubtitulo: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 12,
  },
  botaoProfAssistente: {
    backgroundColor: "#FF5A1F",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  textoProfAssistente: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
  },
  listaAulasContainer: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFF",
    marginTop: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "88%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF5A1F",
  },
  modalSubtitulo: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 18,
  },
  containerDetalhesSolicitacao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E1F0FF",
    marginRight: 14,
  },
  modalAlunoNome: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 4,
  },
  modalDataTexto: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  modalContainerAcoes: {
    flexDirection: "row",
    gap: 10,
  },
  modalBotao: {
    flex: 1,
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTextoBotao: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalBotaoVerDepois: {
    marginTop: 16,
    alignSelf: "center",
    paddingVertical: 6,
  },
  modalTextoVerDepois: {
    color: "#777",
    fontWeight: "600",
    fontSize: 14,
  },
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    paddingHorizontal: 8,
    elevation: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 3,
  },
});
