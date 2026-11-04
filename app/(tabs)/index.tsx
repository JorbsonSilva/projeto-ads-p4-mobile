/**
 * @file index.tsx
 * @description Controlador Principal da Tela Home (Hub Central de Navegação).
 * Gerencia o estado de autenticação e chaveia dinamicamente entre:
 * - Home do Aluno: 100% fiel à especificação oficial IMG-005 (Hero 3D, Categorias Populares,
 *   Cards Verticais de Professores em Destaque com R$/h, Faixa de 4 Benefícios e Seção Continue Aprendendo).
 * - Home do Professor: Dashboard operacional com Agenda do Dia, Métricas e Solicitações.
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { CentralNotificacoesModal } from "../../components/CentralNotificacoesModal";
import ResumoProfessor from "../../components/ResumoProfessor";
import { API_URL, extrairDadosLista, extrairDadosObjeto } from "../../config/api";
import { Theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { DEMO_PROFESSORES, DEMO_SABERES } from "../../data/demoData";
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
  saber: Saber;
  precoHora: number;
}

interface ProfessorDestaque {
  id: number;
  nome: string;
  notaMedia?: number;
  totalAvaliacoes?: number;
  fotoUrl?: any;
  materia?: string;
  precoHora?: number;
  tagColor?: string;
  tagBg?: string;
  online?: boolean;
  aptidoes?: Aptidao[];
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

const CATEGORIAS_POPULARES_IMG005 = [
  { id: 1, nome: "Exatas", icone: "book-open" as const, cor: "#2563EB", bg: "#EFF6FF" },
  { id: 2, nome: "Tecnologia", icone: "code" as const, cor: "#EA580C", bg: "#FFF7ED" },
  { id: 3, nome: "Humanas", icone: "edit-3" as const, cor: "#0284C7", bg: "#F0F9FF" },
  { id: 4, nome: "Ciências", icone: "activity" as const, cor: "#6366F1", bg: "#EEF2FF" },
  { id: 5, nome: "Idiomas", icone: "globe" as const, cor: "#334155", bg: "#F8FAFC" },
  { id: 6, nome: "Negócios", icone: "bar-chart-2" as const, cor: "#D97706", bg: "#FEF3C7" },
];

const PROFESSORES_DESTAQUE_IMG005: ProfessorDestaque[] = [
  {
    id: 1,
    nome: "Prof. Lucas Rocha",
    materia: "Matemática",
    notaMedia: 4.9,
    totalAvaliacoes: 128,
    precoHora: 40.0,
    fotoUrl: require("../../assets/images/prof-lucas.png"),
    tagColor: "#1D4ED8",
    tagBg: "#EFF6FF",
    online: true,
  },
  {
    id: 2,
    nome: "Profa. Ana Clara",
    materia: "Biologia",
    notaMedia: 4.8,
    totalAvaliacoes: 96,
    precoHora: 45.0,
    fotoUrl: require("../../assets/images/profa-ana.png"),
    tagColor: "#047857",
    tagBg: "#ECFDF5",
    online: true,
  },
  {
    id: 3,
    nome: "Prof. Rafael Lima",
    materia: "Programação",
    notaMedia: 4.9,
    totalAvaliacoes: 152,
    precoHora: 50.0,
    fotoUrl: require("../../assets/images/prof-rafael.png"),
    tagColor: "#6D28D9",
    tagBg: "#F5F3FF",
    online: true,
  },
];

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

const CONTINUE_APRENDENDO_IMG005 = [
  {
    id: 1,
    materia: "Cálculo",
    professoresCount: 3,
    icone: "check-circle" as const,
    cor: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    id: 2,
    materia: "Física",
    professoresCount: 4,
    icone: "alert-triangle" as const,
    cor: "#EA580C",
    bg: "#FFF7ED",
  },
  {
    id: 3,
    materia: "Python",
    professoresCount: 5,
    icone: "terminal" as const,
    cor: "#059669",
    bg: "#ECFDF5",
  },
  {
    id: 4,
    materia: "Inglês",
    professoresCount: 6,
    icone: "grid" as const,
    cor: "#7C3AED",
    bg: "#F5F3FF",
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
  const insets = useSafeAreaInsets();
  const { usuarioId } = useAuth() as any;
  const [professores, setProfessores] = useState<ProfessorDestaque[]>(
    PROFESSORES_DESTAQUE_IMG005
  );
  const [favoritos, setFavoritos] = useState<Record<number, boolean>>({});
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [modalNotificacoes, setModalNotificacoes] = useState(false);

  const buscarDadosAluno = useCallback(async () => {
    const isDemo =
      typeof window !== "undefined" &&
      (window.location.search.includes("demo=true") ||
        window.location.search.includes("preview=true") ||
        window.location.protocol === "https:");

    // Em modo demo ou ambiente de visualização, os dados oficiais da IMG-005 são imediatos
    if (isDemo || !usuarioId) {
      setProfessores(PROFESSORES_DESTAQUE_IMG005);
      setCarregandoDados(false);
      setAtualizando(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const resProfs = await fetch(
        `${API_URL}/api/usuarios/professores/destaque/${usuarioId}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (resProfs.ok) {
        const payloadProfs: unknown = await resProfs.json();
        const dadosProfs: any[] = extrairDadosLista<any>(payloadProfs);
        if (dadosProfs && dadosProfs.length > 0) {
          const profsMapeados: ProfessorDestaque[] = dadosProfs.map((p, idx) => ({
            id: p.id,
            nome: p.nome,
            notaMedia: p.notaMedia || 4.9,
            totalAvaliacoes: p.totalAvaliacoes || 100 + idx * 15,
            materia:
              p.aptidoes && p.aptidoes.length > 0
                ? p.aptidoes[0].saber.nome
                : "Matemática",
            precoHora:
              p.aptidoes && p.aptidoes.length > 0
                ? p.aptidoes[0].precoHora
                : 40.0,
            fotoUrl: p.fotoUrl
              ? { uri: p.fotoUrl }
              : PROFESSORES_DESTAQUE_IMG005[idx % PROFESSORES_DESTAQUE_IMG005.length].fotoUrl,
            tagColor:
              idx % 3 === 0 ? "#1D4ED8" : idx % 3 === 1 ? "#047857" : "#6D28D9",
            tagBg:
              idx % 3 === 0 ? "#EFF6FF" : idx % 3 === 1 ? "#ECFDF5" : "#F5F3FF",
            online: true,
          }));
          setProfessores(profsMapeados);
          return;
        }
      }
      setProfessores(PROFESSORES_DESTAQUE_IMG005);
    } catch {
      setProfessores(PROFESSORES_DESTAQUE_IMG005);
    } finally {
      setCarregandoDados(false);
      setAtualizando(false);
    }
  }, [usuarioId]);

  useFocusEffect(
    useCallback(() => {
      buscarDadosAluno();
    }, [buscarDadosAluno])
  );

  const aoAtualizar = () => {
    setAtualizando(true);
    buscarDadosAluno();
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
            onPress={() => setModalNotificacoes(true)}
            accessibilityLabel="Central de Notificações"
          >
            <Feather name="bell" size={24} color="#0F172A" />
            <View style={estilos.badgeSino} />
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
                Aprenda com quem{"\n"}
                <Text style={estilos.bannerHeroTituloDestaque}>
                  entende do assunto.
                </Text>
              </Text>

              <Text style={estilos.bannerHeroSubtitulo}>
                Mentorias personalizadas para te ajudar a chegar mais longe.
              </Text>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push("/busca-professores")}
                style={estilos.botaoHeroExplorar}
              >
                <Text style={estilos.textoBotaoHeroExplorar}>
                  Explorar professores
                </Text>
              </TouchableOpacity>

              {/* Indicador de Paginação Carrossel (3 Pontos) */}
              <View style={estilos.paginacaoHeroContainer}>
                <View style={[estilos.pontoPaginacao, estilos.pontoPaginacaoAtivo]} />
                <View style={estilos.pontoPaginacao} />
                <View style={estilos.pontoPaginacao} />
              </View>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.carrosselCategoriasContainer}
        >
          {CATEGORIAS_POPULARES_IMG005.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/busca-professores",
                  params: { categoria: cat.nome },
                })
              }
              style={estilos.cardCategoriaQuadrado}
            >
              <View style={estilos.iconeCategoriaWrap}>
                <Feather name={cat.icone} size={22} color={cat.cor} />
              </View>
              <Text style={estilos.textoCategoriaNome} numberOfLines={1}>
                {cat.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.carrosselProfessoresContainer}
        >
          {professores.map((prof) => {
            const isFav = !!favoritos[prof.id];
            const precoFormatado = (prof.precoHora || 40.0)
              .toFixed(2)
              .replace(".", ",");
            const notaFormatada = (prof.notaMedia || 4.9)
              .toFixed(1)
              .replace(".", ",");

            return (
              <TouchableOpacity
                key={prof.id}
                activeOpacity={0.9}
                onPress={() => router.push(`/professor/${prof.id}`)}
                style={estilos.cardProfessorVertical}
              >
                {/* Linha Topo: Status Online + Botão Favorito */}
                <View style={estilos.cardProfTopoLinha}>
                  <View style={estilos.badgeOnline}>
                    <View style={estilos.dotOnline} />
                    <Text style={estilos.textoOnline}>Online</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => alternarFavorito(prof.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={estilos.botaoFavorito}
                  >
                    <Ionicons
                      name={isFav ? "heart" : "heart-outline"}
                      size={18}
                      color={isFav ? "#EF4444" : "#94A3B8"}
                    />
                  </TouchableOpacity>
                </View>

                {/* Avatar Circular */}
                <View style={estilos.avatarProfWrapper}>
                  <Image
                    source={
                      typeof prof.fotoUrl === "number"
                        ? prof.fotoUrl
                        : typeof prof.fotoUrl === "object" && prof.fotoUrl?.uri
                        ? prof.fotoUrl
                        : { uri: `https://i.pravatar.cc/150?u=${prof.id}` }
                    }
                    style={estilos.avatarProfFoto}
                  />
                </View>

                {/* Informações Centrais */}
                <Text style={estilos.cardProfNome} numberOfLines={1}>
                  {prof.nome}
                </Text>
                <Text style={estilos.cardProfMateria} numberOfLines={1}>
                  {prof.materia || "Matemática"}
                </Text>

                {/* Avaliação com Estrela */}
                <View style={estilos.cardProfAvaliacaoLinha}>
                  <Text style={estilos.estrelaIcone}>★</Text>
                  <Text style={estilos.notaValor}>{notaFormatada}</Text>
                  <Text style={estilos.totalAvaliacoes}>
                    ({prof.totalAvaliacoes || 120} avaliações)
                  </Text>
                </View>

                {/* Preço por Hora */}
                <View style={estilos.cardProfPrecoArea}>
                  <Text style={estilos.textoAPartir}>A partir de</Text>
                  <Text style={estilos.textoPrecoHora}>
                    R$ {precoFormatado}/h
                  </Text>
                </View>

                {/* Chip de Disciplina */}
                <View
                  style={[
                    estilos.tagDisciplinaPill,
                    { backgroundColor: prof.tagBg || "#EFF6FF" },
                  ]}
                >
                  <Text
                    style={[
                      estilos.tagDisciplinaTexto,
                      { color: prof.tagColor || "#1D4ED8" },
                    ]}
                    numberOfLines={1}
                  >
                    {prof.materia || "Matemática"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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

        {/* ============================================================== */}
        {/* 7. SEÇÃO CONTINUE APRENDENDO (IMG-005)                         */}
        {/* ============================================================== */}
        <View style={estilos.secaoHeader}>
          <Text style={estilos.secaoTitulo}>Continue aprendendo</Text>
          <TouchableOpacity
            onPress={() => router.push("/explorar-disciplinas")}
            activeOpacity={0.7}
          >
            <Text style={estilos.secaoLink}>Ver todos &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.carrosselContinueContainer}
        >
          {CONTINUE_APRENDENDO_IMG005.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/busca-professores",
                  params: { categoria: item.materia },
                })
              }
              style={estilos.cardContinueItem}
            >
              <View
                style={[
                  estilos.iconeContinueWrap,
                  { backgroundColor: item.bg },
                ]}
              >
                <Feather name={item.icone} size={18} color={item.cor} />
              </View>
              <View style={estilos.infoContinueTextos}>
                <Text style={estilos.tituloContinueMateria} numberOfLines={1}>
                  {item.materia}
                </Text>
                <Text style={estilos.subtituloContinueProf}>
                  {item.professoresCount} professores
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Modal Central de Notificações */}
      <CentralNotificacoesModal
        visible={modalNotificacoes}
        onClose={() => setModalNotificacoes(false)}
        usuarioId={usuarioId || 1}
      />
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
            onPress={() => router.push("/agenda")}
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
  badgeSino: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#FF5A1F",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
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
  paginacaoHeroContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  pontoPaginacao: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  pontoPaginacaoAtivo: {
    backgroundColor: "#94A3B8",
    width: 14,
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
  carrosselCategoriasContainer: {
    paddingRight: 10,
    gap: 10,
    paddingBottom: 22,
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
    paddingRight: 10,
    gap: 12,
    paddingBottom: 24,
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
  badgeOnline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dotOnline: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  textoOnline: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
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
  avatarProfFoto: {
    width: "100%",
    height: "100%",
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

  // 7. Seção Continue Aprendendo
  carrosselContinueContainer: {
    paddingRight: 10,
    gap: 10,
    paddingBottom: 20,
  },
  cardContinueItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    paddingRight: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconeContinueWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContinueTextos: {
    justifyContent: "center",
  },
  tituloContinueMateria: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtituloContinueProf: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
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
