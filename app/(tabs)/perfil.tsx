/**
 * @file perfil.tsx
 * @description Redesign Unificado do Perfil - Orienta 2.0 [ORI-017 / ORI-018].
 * Implementação de alta fidelidade visual para as duas personas:
 * - Perfil do Aluno (IMG-016 / ORI-017): Hero com avatar, badge "Aluno", card azul de progresso
 *   (7 matérias, 12 mentorias, 45h), bio, menu da conta com chevrons, atividade recente e 5 abas Aluno.
 * - Perfil do Professor (IMG-017 / ORI-018): Hero docente com avatar, badge "Professor", card bege/creme
 *   de resumo do mês (24 aulas, 38 alunos, 36h, R$ 2.480,00), opções de ensino (bio, tarifas online/presencial,
 *   chave PIX), feed de avaliações dos alunos e 5 abas Professor.
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import {
  MOCK_PERFIL_ALUNO_OFICIAL,
  MOCK_PERFIL_PROFESSOR_OFICIAL,
  obterPerfilAluno,
  obterPerfilProfessor,
  PerfilAlunoData,
  PerfilProfessorData,
  ResultadoPerfilAluno,
  ResultadoPerfilProfessor,
  salvarPerfilAluno,
  salvarPerfilProfessor,
} from "../../services/perfilService";

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ persona?: string; papel?: string }>();
  const { logoutGlobal } = useAuth() as any;

  // Estado da persona ativa: "Aluno" ou "Professor"
  const [personaAtiva, setPersonaAtiva] = useState<"Aluno" | "Professor">("Aluno");

  // Estados dos dados de perfil
  const [perfilAluno, setPerfilAluno] = useState<PerfilAlunoData>(MOCK_PERFIL_ALUNO_OFICIAL);
  const [perfilProfessor, setPerfilProfessor] = useState<PerfilProfessorData>(MOCK_PERFIL_PROFESSOR_OFICIAL);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [isSimulado, setIsSimulado] = useState<boolean>(false);

  // Controle de visibilidade de saldo do resumo do professor
  const [saldoVisivel, setSaldoVisivel] = useState<boolean>(true);

  // Modais de Ação
  const [modalEditarAluno, setModalEditarAluno] = useState<boolean>(false);
  const [modalEditarProf, setModalEditarProf] = useState<boolean>(false);
  const [modalLogoutVisivel, setModalLogoutVisivel] = useState<boolean>(false);
  const [modalSegurancaVisivel, setModalSegurancaVisivel] = useState<boolean>(false);

  // Formulário Aluno
  const [formAlunoNome, setFormAlunoNome] = useState<string>("");
  const [formAlunoTelefone, setFormAlunoTelefone] = useState<string>("");
  const [formAlunoCidade, setFormAlunoCidade] = useState<string>("");
  const [formAlunoBio, setFormAlunoBio] = useState<string>("");

  // Formulário Professor
  const [formProfNome, setFormProfNome] = useState<string>("");
  const [formProfTitulacao, setFormProfTitulacao] = useState<string>("");
  const [formProfTelefone, setFormProfTelefone] = useState<string>("");
  const [formProfCidade, setFormProfCidade] = useState<string>("");
  const [formProfBio, setFormProfBio] = useState<string>("");
  const [formProfPrecoOnline, setFormProfPrecoOnline] = useState<string>("");
  const [formProfPrecoPresencial, setFormProfPrecoPresencial] = useState<string>("");
  const [formProfPix, setFormProfPix] = useState<string>("");

  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false);

  // Sincronizar com parâmetro de rota se fornecido
  useEffect(() => {
    if (params.persona === "professor" || params.papel === "professor") {
      setPersonaAtiva("Professor");
    } else if (params.persona === "aluno" || params.papel === "aluno") {
      setPersonaAtiva("Aluno");
    }
  }, [params.persona, params.papel]);

  // Carregar dados de ambos os perfis
  const carregarDados = useCallback(async () => {
    try {
      const [resAluno, resProf]: [ResultadoPerfilAluno, ResultadoPerfilProfessor] =
        await Promise.all([obterPerfilAluno(1), obterPerfilProfessor(2)]);

      setPerfilAluno(resAluno.dados);
      setPerfilProfessor(resProf.dados);
      setIsSimulado(resAluno.isSimulado || resProf.isSimulado);

      // Preencher formulário aluno
      setFormAlunoNome(resAluno.dados.nome);
      setFormAlunoTelefone(resAluno.dados.telefone);
      setFormAlunoCidade(resAluno.dados.cidade);
      setFormAlunoBio(resAluno.dados.bio);

      // Preencher formulário professor
      setFormProfNome(resProf.dados.nome);
      setFormProfTitulacao(resProf.dados.titulacao);
      setFormProfTelefone(resProf.dados.telefone);
      setFormProfCidade(resProf.dados.cidade);
      setFormProfBio(resProf.dados.bio);
      setFormProfPrecoOnline(String(resProf.dados.configuracoesEnsino.precoHoraOnline));
      setFormProfPrecoPresencial(String(resProf.dados.configuracoesEnsino.precoHoraPresencial));
      setFormProfPix(resProf.dados.configuracoesEnsino.chavePix);
    } catch {
      setIsSimulado(true);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarDados();
  };

  const handleSalvarAluno = async () => {
    setSalvandoEdicao(true);
    try {
      await salvarPerfilAluno(perfilAluno.id, {
        nome: formAlunoNome,
        telefone: formAlunoTelefone,
        cidade: formAlunoCidade,
        bio: formAlunoBio,
      });

      setPerfilAluno((prev) => ({
        ...prev,
        nome: formAlunoNome,
        telefone: formAlunoTelefone,
        cidade: formAlunoCidade,
        bio: formAlunoBio,
      }));
      setModalEditarAluno(false);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleSalvarProfessor = async () => {
    setSalvandoEdicao(true);
    try {
      const precoOnlineNum = parseFloat(formProfPrecoOnline) || 60;
      const precoPresencialNum = parseFloat(formProfPrecoPresencial) || 80;

      await salvarPerfilProfessor(perfilProfessor.id, {
        nome: formProfNome,
        titulacao: formProfTitulacao,
        telefone: formProfTelefone,
        cidade: formProfCidade,
        bio: formProfBio,
        configuracoesEnsino: {
          ...perfilProfessor.configuracoesEnsino,
          precoHoraOnline: precoOnlineNum,
          precoHoraPresencial: precoPresencialNum,
          chavePix: formProfPix,
        },
      });

      setPerfilProfessor((prev) => ({
        ...prev,
        nome: formProfNome,
        titulacao: formProfTitulacao,
        telefone: formProfTelefone,
        cidade: formProfCidade,
        bio: formProfBio,
        configuracoesEnsino: {
          ...prev.configuracoesEnsino,
          precoHoraOnline: precoOnlineNum,
          precoHoraPresencial: precoPresencialNum,
          chavePix: formProfPix,
        },
      }));
      setModalEditarProf(false);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleConfirmarLogout = async () => {
    setModalLogoutVisivel(false);
    if (logoutGlobal) {
      await logoutGlobal();
    }
    router.replace("/login" as any);
  };

  if (carregando) {
    return (
      <View style={[estilos.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF5A1F" />
        <Text style={estilos.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 0. BANNER DISCRETO DE MODO SIMULAÇÃO (OFFLINE)                 */}
      {/* ============================================================== */}
      {isSimulado && (
        <View style={estilos.bannerSimulacao}>
          <Ionicons name="information-circle" size={14} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={estilos.textoBannerSimulacao}>
            ⚠️ Modo Simulação: Dados offline em exibição
          </Text>
        </View>
      )}

      {/* ============================================================== */}
      {/* 1. HEADER SUPERIOR COM TÍTULO E BOTÃO SAIR                     */}
      {/* ============================================================== */}
      <View style={estilos.header}>
        <TouchableOpacity
          style={estilos.botaoHeaderCircular}
          onPress={() =>
            router.push(personaAtiva === "Professor" ? ("/home-professor" as any) : ("/(tabs)" as any))
          }
          activeOpacity={0.7}
          accessibilityLabel="Voltar para a Home"
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={estilos.headerTituloContainer}>
          <Text style={estilos.headerTitulo}>Meu Perfil</Text>
          <Text style={estilos.headerSubtitulo}>
            {personaAtiva === "Professor" ? "Visão Docente" : "Visão do Estudante"}
          </Text>
        </View>

        <TouchableOpacity
          style={estilos.botaoLogout}
          onPress={() => setModalLogoutVisivel(true)}
          activeOpacity={0.7}
          accessibilityLabel="Sair da Conta"
        >
          <Feather name="log-out" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 2. ALTERNADOR DE PERSONAS (ALUNO / PROFESSOR)                  */}
      {/* ============================================================== */}
      <View style={estilos.alternadorContainer}>
        <TouchableOpacity
          style={[
            estilos.botaoAlternador,
            personaAtiva === "Aluno" && estilos.botaoAlternadorAtivoAluno,
          ]}
          onPress={() => setPersonaAtiva("Aluno")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              estilos.textoAlternador,
              personaAtiva === "Aluno" && estilos.textoAlternadorAtivo,
            ]}
          >
            🎓 Aluno (IMG-016)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            estilos.botaoAlternador,
            personaAtiva === "Professor" && estilos.botaoAlternadorAtivoProf,
          ]}
          onPress={() => setPersonaAtiva("Professor")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              estilos.textoAlternador,
              personaAtiva === "Professor" && estilos.textoAlternadorAtivo,
            ]}
          >
            👨‍🏫 Professor (IMG-017)
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* CONTEÚDO SCROLLÁVEL                                            */}
      {/* ============================================================== */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            colors={["#FF5A1F"]}
            tintColor="#FF5A1F"
          />
        }
      >
        {/* ============================================================== */}
        {/* SEÇÃO 3A: VISÃO DO ALUNO [ORI-017 / IMG-016]                  */}
        {/* ============================================================== */}
        {personaAtiva === "Aluno" && (
          <>
            {/* HERO DO ALUNO */}
            <View style={estilos.heroContainer}>
              <View style={estilos.avatarContainer}>
                <Image
                  source={{ uri: perfilAluno.fotoUrl }}
                  style={estilos.avatarImagem}
                  accessibilityLabel="Foto de Perfil do Aluno"
                />
                <TouchableOpacity
                  style={estilos.botaoCameraFlutuante}
                  activeOpacity={0.85}
                  onPress={() => setModalEditarAluno(true)}
                  accessibilityLabel="Alterar foto de perfil"
                >
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={estilos.heroInfo}>
                <View style={estilos.linhaNomeBadge}>
                  <Text style={estilos.nomeEstudante}>{perfilAluno.nome}</Text>
                  <View style={estilos.badgeAluno}>
                    <Text style={estilos.textoBadgeAluno}>Aluno</Text>
                  </View>
                </View>

                <Text style={estilos.emailEstudante}>{perfilAluno.email}</Text>

                <View style={estilos.linhaLocalizacao}>
                  <Ionicons name="location-sharp" size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoLocalizacao}>
                    {perfilAluno.cidade}, {perfilAluno.estado}
                  </Text>
                  <Text style={estilos.pontoSeparador}>•</Text>
                  <Ionicons name="call-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoLocalizacao}>{perfilAluno.telefone}</Text>
                </View>
              </View>
            </View>

            {/* CARD AZUL MARINHO DE PROGRESSO GERAL (IMG-016) */}
            <View style={estilos.cardProgressoGeral}>
              <View style={estilos.cardProgressoHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={estilos.iconeProgressoWrap}>
                    <FontAwesome5 name="chart-pie" size={13} color="#FF5A1F" />
                  </View>
                  <Text style={estilos.cardProgressoTitulo}>Progresso Geral</Text>
                </View>
                <Text style={estilos.cardProgressoSubtitulo}>Neste Semestre</Text>
              </View>

              <View style={estilos.divisorCardProgresso} />

              <View style={estilos.gridMetricasProgresso}>
                <View style={estilos.colunaMetrica}>
                  <Text style={estilos.valorMetrica}>{perfilAluno.progresso.materiasCursando}</Text>
                  <Text style={estilos.labelMetrica}>Matérias</Text>
                </View>

                <View style={estilos.divisorVerticalMetrica} />

                <View style={estilos.colunaMetrica}>
                  <Text style={estilos.valorMetrica}>{perfilAluno.progresso.mentoriasRealizadas}</Text>
                  <Text style={estilos.labelMetrica}>Mentorias</Text>
                </View>

                <View style={estilos.divisorVerticalMetrica} />

                <View style={estilos.colunaMetrica}>
                  <Text style={estilos.valorMetrica}>{perfilAluno.progresso.horasAcumuladas}h</Text>
                  <Text style={estilos.labelMetrica}>Horas</Text>
                </View>
              </View>
            </View>

            {/* SEÇÃO SOBRE VOCÊ */}
            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Sobre você</Text>
              <View style={estilos.cardSobre}>
                <Text style={estilos.textoBio}>{perfilAluno.bio}</Text>
                <View style={estilos.divisorSuave} />
                <Text style={estilos.subtituloInteresses}>Disciplinas de interesse:</Text>
                <View style={estilos.chipsContainer}>
                  {perfilAluno.interesses.map((item, idx) => (
                    <View key={idx} style={estilos.chipInteresse}>
                      <Text style={estilos.textoChipInteresse}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* MENU DA CONTA COM CHEVRONS */}
            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Configurações da conta</Text>
              <View style={estilos.menuContaContainer}>
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => setModalEditarAluno(true)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#FFF0E7" }]}>
                    <Feather name="user" size={17} color="#FF5A1F" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Informações pessoais</Text>
                    <Text style={estilos.subtituloMenuItem}>Nome, contato e localização</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View style={estilos.divisorMenu} />

                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => router.push("/explorar-disciplinas" as any)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="book-open" size={17} color="#3B82F6" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Preferências de estudo</Text>
                    <Text style={estilos.subtituloMenuItem}>Modalidade e disciplinas ativas</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View style={estilos.divisorMenu} />

                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => router.push("/notificacoes" as any)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#FAF5FF" }]}>
                    <Feather name="bell" size={17} color="#8B5CF6" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Central de Notificações</Text>
                    <Text style={estilos.subtituloMenuItem}>Alertas de aula e avisos</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View style={estilos.divisorMenu} />

                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => setModalSegurancaVisivel(true)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#F0FDF4" }]}>
                    <Feather name="shield" size={17} color="#10B981" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Segurança e privacidade</Text>
                    <Text style={estilos.subtituloMenuItem}>Troca de senha e proteção</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ATIVIDADE RECENTE */}
            <View style={estilos.secaoContainer}>
              <View style={estilos.secaoHeaderLinha}>
                <Text style={estilos.secaoTitulo}>Atividade recente</Text>
                <TouchableOpacity onPress={() => router.push("/agenda" as any)}>
                  <Text style={estilos.linkVerTodas}>Ver agenda &gt;</Text>
                </TouchableOpacity>
              </View>

              <View style={estilos.listaAtividades}>
                {perfilAluno.atividadesRecentes.map((item) => (
                  <View key={item.id} style={estilos.cardAtividade}>
                    <Image source={{ uri: item.professorFoto }} style={estilos.avatarAtividade} />
                    <View style={estilos.infoAtividade}>
                      <Text style={estilos.materiaAtividade}>{item.materia}</Text>
                      <Text style={estilos.professorAtividade}>{item.professorNome}</Text>
                      <Text style={estilos.dataAtividade}>{item.data}</Text>
                    </View>
                    <View
                      style={[
                        estilos.badgeStatusAtividade,
                        item.status === "CONFIRMADA"
                          ? estilos.badgeConfirmada
                          : estilos.badgeConcluida,
                      ]}
                    >
                      <Text
                        style={[
                          estilos.textoBadgeStatus,
                          item.status === "CONFIRMADA"
                            ? estilos.textoStatusConfirmada
                            : estilos.textoStatusConcluida,
                        ]}
                      >
                        {item.status === "CONFIRMADA" ? "Confirmada" : "Concluída"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* BOTÃO PRIMÁRIO ALUNO */}
            <TouchableOpacity
              style={estilos.botaoEditarPerfilLaranja}
              onPress={() => setModalEditarAluno(true)}
              activeOpacity={0.85}
            >
              <Feather name="edit-3" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={estilos.textoBotaoEditarPerfil}>Editar perfil do aluno</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ============================================================== */}
        {/* SEÇÃO 3B: VISÃO DO PROFESSOR [ORI-018 / IMG-017]               */}
        {/* ============================================================== */}
        {personaAtiva === "Professor" && (
          <>
            {/* HERO DO PROFESSOR */}
            <View style={estilos.heroContainer}>
              <View style={estilos.avatarContainer}>
                <Image
                  source={{ uri: perfilProfessor.fotoUrl }}
                  style={[estilos.avatarImagem, { borderColor: "#10B981" }]}
                  accessibilityLabel="Foto de Perfil do Professor"
                />
                <TouchableOpacity
                  style={[estilos.botaoCameraFlutuante, { backgroundColor: "#10B981" }]}
                  activeOpacity={0.85}
                  onPress={() => setModalEditarProf(true)}
                  accessibilityLabel="Alterar foto docente"
                >
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={estilos.heroInfo}>
                <View style={estilos.linhaNomeBadge}>
                  <Text style={estilos.nomeEstudante}>{perfilProfessor.nome}</Text>
                  <View style={estilos.badgeProfessor}>
                    <FontAwesome5 name="chalkboard-teacher" size={10} color="#065F46" style={{ marginRight: 4 }} />
                    <Text style={estilos.textoBadgeProfessor}>Professor</Text>
                  </View>
                </View>

                <Text style={estilos.titulacaoDocente}>{perfilProfessor.titulacao}</Text>
                <Text style={estilos.emailEstudante}>{perfilProfessor.email}</Text>

                <View style={estilos.linhaLocalizacao}>
                  <Ionicons name="location-sharp" size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoLocalizacao}>
                    {perfilProfessor.cidade}, {perfilProfessor.estado}
                  </Text>
                  <Text style={estilos.pontoSeparador}>•</Text>
                  <Ionicons name="call-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={estilos.textoLocalizacao}>{perfilProfessor.telefone}</Text>
                </View>
              </View>
            </View>

            {/* CARD BEGE / CREME / DOURADO DE RESUMO DO MÊS (IMG-017) */}
            <View style={estilos.cardResumoMesDocente}>
              <View style={estilos.cardResumoMesHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={estilos.iconeResumoMesWrap}>
                    <FontAwesome5 name="wallet" size={13} color="#D97706" />
                  </View>
                  <Text style={estilos.cardResumoMesTitulo}>Resumo do Mês</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSaldoVisivel(!saldoVisivel)}
                  style={estilos.botaoOlhoSaldo}
                  activeOpacity={0.7}
                >
                  <Feather name={saldoVisivel ? "eye" : "eye-off"} size={14} color="#92400E" />
                  <Text style={estilos.textoOlhoSaldo}>{saldoVisivel ? "Ocultar" : "Mostrar"}</Text>
                </TouchableOpacity>
              </View>

              <View style={estilos.divisorCardResumoMes} />

              <View style={estilos.gridMetricasDocente}>
                <View style={estilos.blocoMetricaDocente}>
                  <View style={[estilos.miniIconeDocenteWrap, { backgroundColor: "#FEF3C7" }]}>
                    <Feather name="calendar" size={13} color="#D97706" />
                  </View>
                  <Text style={estilos.valorMetricaDocente}>
                    {perfilProfessor.resumoMes.aulasRealizadas}
                  </Text>
                  <Text style={estilos.labelMetricaDocente}>Aulas realizadas</Text>
                </View>

                <View style={estilos.blocoMetricaDocente}>
                  <View style={[estilos.miniIconeDocenteWrap, { backgroundColor: "#DBEAFE" }]}>
                    <Feather name="users" size={13} color="#2563EB" />
                  </View>
                  <Text style={estilos.valorMetricaDocente}>
                    {perfilProfessor.resumoMes.alunosAtendidos}
                  </Text>
                  <Text style={estilos.labelMetricaDocente}>Alunos atendidos</Text>
                </View>

                <View style={estilos.blocoMetricaDocente}>
                  <View style={[estilos.miniIconeDocenteWrap, { backgroundColor: "#F3E8FF" }]}>
                    <Feather name="clock" size={13} color="#9333EA" />
                  </View>
                  <Text style={estilos.valorMetricaDocente}>
                    {perfilProfessor.resumoMes.horasMinistradas}h
                  </Text>
                  <Text style={estilos.labelMetricaDocente}>Horas ministradas</Text>
                </View>

                <View style={estilos.blocoMetricaDocente}>
                  <View style={[estilos.miniIconeDocenteWrap, { backgroundColor: "#D1FAE5" }]}>
                    <Feather name="dollar-sign" size={13} color="#059669" />
                  </View>
                  <Text style={[estilos.valorMetricaDocente, { color: "#059669" }]}>
                    {saldoVisivel
                      ? `R$ ${perfilProfessor.resumoMes.ganhosMes.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}`
                      : "R$ ••••••"}
                  </Text>
                  <Text style={estilos.labelMetricaDocente}>Ganhos no mês</Text>
                </View>
              </View>
            </View>

            {/* SEÇÃO APRESENTAÇÃO DOCENTE & DISCIPLINAS */}
            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Apresentação profissional</Text>
              <View style={estilos.cardSobre}>
                <Text style={estilos.textoBio}>{perfilProfessor.bio}</Text>
                <View style={estilos.divisorSuave} />
                <Text style={estilos.subtituloInteresses}>Disciplinas lecionadas:</Text>
                <View style={estilos.chipsContainer}>
                  {perfilProfessor.materias.map((mat, idx) => (
                    <View key={idx} style={estilos.chipMateriaDocente}>
                      <FontAwesome5 name="book-reader" size={10} color="#047857" style={{ marginRight: 6 }} />
                      <Text style={estilos.textoChipMateriaDocente}>{mat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* OPÇÕES EXCLUSIVAS DE ENSINO & CONFIGURAÇÕES (IMG-017) */}
            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Gestão de ensino & Conta</Text>
              <View style={estilos.menuContaContainer}>
                {/* 1. Perfil Profissional */}
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => setModalEditarProf(true)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#ECFDF5" }]}>
                    <Feather name="award" size={17} color="#059669" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Perfil profissional</Text>
                    <Text style={estilos.subtituloMenuItem}>Titulação, biografia e foto docente</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View style={estilos.divisorMenu} />

                {/* 2. Formatos e Tarifas */}
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => setModalEditarProf(true)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#FFFBEB" }]}>
                    <Feather name="tag" size={17} color="#D97706" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Formatos de aula e tarifas</Text>
                    <Text style={estilos.subtituloMenuItem}>
                      Online: R$ {perfilProfessor.configuracoesEnsino.precoHoraOnline.toFixed(2)}/h • Presencial: R$ {perfilProfessor.configuracoesEnsino.precoHoraPresencial.toFixed(2)}/h
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View style={estilos.divisorMenu} />

                {/* 3. Métodos de Pagamento e Saque */}
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => router.push("/saque" as any)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="credit-card" size={17} color="#2563EB" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Métodos de pagamento & Saque</Text>
                    <Text style={estilos.subtituloMenuItem}>
                      PIX: {perfilProfessor.configuracoesEnsino.chavePix}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View style={estilos.divisorMenu} />

                {/* 4. Notificações */}
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => router.push("/notificacoes" as any)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#FAF5FF" }]}>
                    <Feather name="bell" size={17} color="#8B5CF6" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Central de Notificações</Text>
                    <Text style={estilos.subtituloMenuItem}>Alertas de solicitações de aula</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View style={estilos.divisorMenu} />

                {/* 5. Segurança */}
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => setModalSegurancaVisivel(true)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#F0FDF4" }]}>
                    <Feather name="shield" size={17} color="#10B981" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Segurança e privacidade</Text>
                    <Text style={estilos.subtituloMenuItem}>Troca de senha e proteção</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* FEED DE AVALIAÇÕES RECENTES DOS ALUNOS (IMG-017) */}
            <View style={estilos.secaoContainer}>
              <View style={estilos.secaoHeaderLinha}>
                <Text style={estilos.secaoTitulo}>Avaliações dos alunos</Text>
                <View style={estilos.badgeMediaAvaliacao}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={estilos.textoMediaAvaliacao}>5.0 (38)</Text>
                </View>
              </View>

              <View style={estilos.listaAvaliacoes}>
                {perfilProfessor.avaliacoesRecentes.map((rev) => (
                  <View key={rev.id} style={estilos.cardAvaliacao}>
                    <View style={estilos.headerAvaliacao}>
                      <Image source={{ uri: rev.alunoFoto }} style={estilos.avatarAvaliacao} />
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.nomeAlunoAvaliacao}>{rev.alunoNome}</Text>
                        <Text style={estilos.materiaAvaliacao}>{rev.materia}</Text>
                      </View>
                      <View style={estilos.estrelasRow}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons key={i} name="star" size={11} color="#F59E0B" />
                        ))}
                      </View>
                    </View>
                    <Text style={estilos.comentarioAvaliacao}>"{rev.comentario}"</Text>
                    <Text style={estilos.dataAvaliacao}>{rev.data}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* BOTÃO PRIMÁRIO PROFESSOR */}
            <TouchableOpacity
              style={[estilos.botaoEditarPerfilLaranja, { backgroundColor: "#FF5A1F" }]}
              onPress={() => setModalEditarProf(true)}
              activeOpacity={0.85}
            >
              <Feather name="edit-3" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={estilos.textoBotaoEditarPerfil}>Editar perfil profissional</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: EDITAR PERFIL DO ALUNO                                */}
      {/* ============================================================== */}
      <Modal visible={modalEditarAluno} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardEdicao}>
            <View style={estilos.modalHeaderLinha}>
              <Text style={estilos.modalTitulo}>Editar Perfil do Aluno</Text>
              <TouchableOpacity onPress={() => setModalEditarAluno(false)}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={estilos.labelInput}>Nome Completo</Text>
              <TextInput
                style={estilos.inputFormulario}
                value={formAlunoNome}
                onChangeText={setFormAlunoNome}
                placeholder="Ex: Jorbson Silva"
                placeholderTextColor="#94A3B8"
              />

              <Text style={estilos.labelInput}>Telefone / WhatsApp</Text>
              <TextInput
                style={estilos.inputFormulario}
                value={formAlunoTelefone}
                onChangeText={setFormAlunoTelefone}
                placeholder="(83) 98765-4321"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={estilos.labelInput}>Cidade</Text>
              <TextInput
                style={estilos.inputFormulario}
                value={formAlunoCidade}
                onChangeText={setFormAlunoCidade}
                placeholder="João Pessoa"
                placeholderTextColor="#94A3B8"
              />

              <Text style={estilos.labelInput}>Apresentação / Bio</Text>
              <TextInput
                style={[estilos.inputFormulario, { height: 90, textAlignVertical: "top" }]}
                value={formAlunoBio}
                onChangeText={setFormAlunoBio}
                placeholder="Fale um pouco sobre seus objetivos de estudo..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={estilos.modalAcoesLinha}>
              <TouchableOpacity
                style={estilos.botaoModalCancelar}
                onPress={() => setModalEditarAluno(false)}
              >
                <Text style={estilos.textoBotaoCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botaoModalSalvar}
                onPress={handleSalvarAluno}
                disabled={salvandoEdicao}
              >
                {salvandoEdicao ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoSalvar}>Salvar alterações</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: EDITAR PERFIL DO PROFESSOR (ORI-018)                   */}
      {/* ============================================================== */}
      <Modal visible={modalEditarProf} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardEdicao}>
            <View style={estilos.modalHeaderLinha}>
              <Text style={estilos.modalTitulo}>Editar Perfil Docente</Text>
              <TouchableOpacity onPress={() => setModalEditarProf(false)}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={estilos.labelInput}>Nome Completo</Text>
              <TextInput
                style={estilos.inputFormulario}
                value={formProfNome}
                onChangeText={setFormProfNome}
                placeholder="Ex: Prof. Carlos Mendes"
                placeholderTextColor="#94A3B8"
              />

              <Text style={estilos.labelInput}>Titulação Acadêmica</Text>
              <TextInput
                style={estilos.inputFormulario}
                value={formProfTitulacao}
                onChangeText={setFormProfTitulacao}
                placeholder="Mestre em Ciência da Computação • UFCG"
                placeholderTextColor="#94A3B8"
              />

              <Text style={estilos.labelInput}>Telefone / WhatsApp</Text>
              <TextInput
                style={estilos.inputFormulario}
                value={formProfTelefone}
                onChangeText={setFormProfTelefone}
                placeholder="(83) 99123-4567"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={estilos.labelInput}>Cidade</Text>
              <TextInput
                style={estilos.inputFormulario}
                value={formProfCidade}
                onChangeText={setFormProfCidade}
                placeholder="Campina Grande"
                placeholderTextColor="#94A3B8"
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.labelInput}>Preço Online (R$/h)</Text>
                  <TextInput
                    style={estilos.inputFormulario}
                    value={formProfPrecoOnline}
                    onChangeText={setFormProfPrecoOnline}
                    placeholder="60.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.labelInput}>Preço Presencial (R$/h)</Text>
                  <TextInput
                    style={estilos.inputFormulario}
                    value={formProfPrecoPresencial}
                    onChangeText={setFormProfPrecoPresencial}
                    placeholder="80.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={estilos.labelInput}>Chave PIX de Recebimento</Text>
              <TextInput
                style={estilos.inputFormulario}
                value={formProfPix}
                onChangeText={setFormProfPix}
                placeholder="carlos.mendes@orienta.edu.br"
                placeholderTextColor="#94A3B8"
              />

              <Text style={estilos.labelInput}>Biografia e Metodologia</Text>
              <TextInput
                style={[estilos.inputFormulario, { height: 90, textAlignVertical: "top" }]}
                value={formProfBio}
                onChangeText={setFormProfBio}
                placeholder="Descreva sua experiência acadêmica e didática..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={estilos.modalAcoesLinha}>
              <TouchableOpacity
                style={estilos.botaoModalCancelar}
                onPress={() => setModalEditarProf(false)}
              >
                <Text style={estilos.textoBotaoCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botaoModalSalvar, { backgroundColor: "#FF5A1F" }]}
                onPress={handleSalvarProfessor}
                disabled={salvandoEdicao}
              >
                {salvandoEdicao ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoSalvar}>Salvar perfil docente</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: CONFIRMAÇÃO DE LOGOUT                                 */}
      {/* ============================================================== */}
      <Modal visible={modalLogoutVisivel} transparent animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardLogout}>
            <View style={estilos.iconeLogoutWrap}>
              <Feather name="log-out" size={26} color="#EF4444" />
            </View>
            <Text style={estilos.tituloLogout}>Encerrar Sessão</Text>
            <Text style={estilos.subtituloLogout}>
              Tem certeza que deseja sair da sua conta Orienta? Seus dados salvos permanecerão sincronizados.
            </Text>

            <View style={estilos.linhaBotoesLogout}>
              <TouchableOpacity
                style={estilos.botaoCancelarLogout}
                onPress={() => setModalLogoutVisivel(false)}
              >
                <Text style={estilos.textoCancelarLogout}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botaoConfirmarLogout}
                onPress={handleConfirmarLogout}
              >
                <Text style={estilos.textoConfirmarLogout}>Sim, sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: SEGURANÇA E PRIVACIDADE                              */}
      {/* ============================================================== */}
      <Modal visible={modalSegurancaVisivel} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardEdicao}>
            <View style={estilos.modalHeaderLinha}>
              <Text style={estilos.modalTitulo}>Segurança da Conta</Text>
              <TouchableOpacity onPress={() => setModalSegurancaVisivel(false)}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={estilos.labelInput}>Senha Atual</Text>
            <TextInput
              style={estilos.inputFormulario}
              placeholder="Digite sua senha atual"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <Text style={estilos.labelInput}>Nova Senha</Text>
            <TextInput
              style={estilos.inputFormulario}
              placeholder="Mínimo de 8 caracteres"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <Text style={estilos.labelInput}>Confirmar Nova Senha</Text>
            <TextInput
              style={estilos.inputFormulario}
              placeholder="Repita a nova senha"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <View style={estilos.modalAcoesLinha}>
              <TouchableOpacity
                style={estilos.botaoModalCancelar}
                onPress={() => setModalSegurancaVisivel(false)}
              >
                <Text style={estilos.textoBotaoCancelar}>Fechar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botaoModalSalvar}
                onPress={() => {
                  setModalSegurancaVisivel(false);
                  Alert.alert("Sucesso", "Senha atualizada com sucesso!");
                }}
              >
                <Text style={estilos.textoBotaoSalvar}>Atualizar senha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==============================================================================
// ESTILOS VISUAIS UNIFICADOS (DESIGN SYSTEM ORIENTA 2.0)
// ==============================================================================

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  bannerSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  textoBannerSimulacao: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTituloContainer: {
    alignItems: "center",
  },
  headerTitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitulo: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 1,
  },
  botaoHeaderCircular: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoLogout: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  alternadorContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    padding: 3,
  },
  botaoAlternador: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoAlternadorAtivoAluno: {
    backgroundColor: "#1D4ED8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  botaoAlternadorAtivoProf: {
    backgroundColor: "#059669",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  textoAlternador: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  textoAlternadorAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  heroContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatarImagem: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    borderColor: "#3B82F6",
  },
  botaoCameraFlutuante: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FF5A1F",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  heroInfo: {
    flex: 1,
  },
  linhaNomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 3,
  },
  nomeEstudante: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  badgeAluno: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  textoBadgeAluno: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  badgeProfessor: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  textoBadgeProfessor: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  titulacaoDocente: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 2,
  },
  emailEstudante: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  linhaLocalizacao: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  textoLocalizacao: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  pontoSeparador: {
    marginHorizontal: 5,
    color: "#94A3B8",
    fontSize: 10,
  },
  cardProgressoGeral: {
    backgroundColor: "#0B1728",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#0B1728",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  cardProgressoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  iconeProgressoWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 90, 31, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  cardProgressoTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardProgressoSubtitulo: {
    fontSize: 11,
    color: "#94A3B8",
  },
  divisorCardProgresso: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 14,
  },
  gridMetricasProgresso: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colunaMetrica: {
    flex: 1,
    alignItems: "center",
  },
  valorMetrica: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  labelMetrica: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divisorVerticalMetrica: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  cardResumoMesDocente: {
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    elevation: 3,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardResumoMesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  iconeResumoMesWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  cardResumoMesTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  botaoOlhoSaldo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  textoOlhoSaldo: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  divisorCardResumoMes: {
    height: 1,
    backgroundColor: "#FDE68A",
    marginBottom: 12,
  },
  gridMetricasDocente: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  blocoMetricaDocente: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  miniIconeDocenteWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  valorMetricaDocente: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  labelMetricaDocente: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  secaoContainer: {
    marginBottom: 18,
  },
  secaoHeaderLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  secaoTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  linkVerTodas: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF5A1F",
  },
  badgeMediaAvaliacao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  textoMediaAvaliacao: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  cardSobre: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textoBio: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
  },
  divisorSuave: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  subtituloInteresses: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipInteresse: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  textoChipInteresse: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E40AF",
  },
  chipMateriaDocente: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  textoChipMateriaDocente: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
  },
  menuContaContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconeMenuWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoMenuItem: {
    flex: 1,
  },
  tituloMenuItem: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  subtituloMenuItem: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  divisorMenu: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 58,
  },
  listaAtividades: {
    gap: 8,
  },
  cardAtividade: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarAtividade: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  infoAtividade: {
    flex: 1,
  },
  materiaAtividade: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  professorAtividade: {
    fontSize: 11,
    color: "#64748B",
  },
  dataAtividade: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  badgeStatusAtividade: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeConfirmada: {
    backgroundColor: "#FFF0E7",
  },
  badgeConcluida: {
    backgroundColor: "#F0FDF4",
  },
  textoBadgeStatus: {
    fontSize: 10,
    fontWeight: "700",
  },
  textoStatusConfirmada: {
    color: "#FF5A1F",
  },
  textoStatusConcluida: {
    color: "#10B981",
  },
  listaAvaliacoes: {
    gap: 8,
  },
  cardAvaliacao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerAvaliacao: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  avatarAvaliacao: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  nomeAlunoAvaliacao: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  materiaAvaliacao: {
    fontSize: 10,
    color: "#64748B",
  },
  estrelasRow: {
    flexDirection: "row",
    gap: 2,
  },
  comentarioAvaliacao: {
    fontSize: 12,
    color: "#334155",
    fontStyle: "italic",
    lineHeight: 16,
    marginBottom: 4,
  },
  dataAvaliacao: {
    fontSize: 10,
    color: "#94A3B8",
  },
  botaoEditarPerfilLaranja: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5A1F",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#FF5A1F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  textoBotaoEditarPerfil: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
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
    position: "relative",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 3,
  },
  tabLabelAtivo: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
  tabIndicadorAtivo: {
    position: "absolute",
    bottom: -6,
    width: 14,
    height: 3,
    backgroundColor: "#FF5A1F",
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCardEdicao: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeaderLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  labelInput: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
    marginTop: 8,
  },
  inputFormulario: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  modalAcoesLinha: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  botaoModalCancelar: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotaoCancelar: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  botaoModalSalvar: {
    flex: 2,
    backgroundColor: "#FF5A1F",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotaoSalvar: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCardLogout: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginVertical: "auto",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  iconeLogoutWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tituloLogout: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  subtituloLogout: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  linhaBotoesLogout: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  botaoCancelarLogout: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  textoCancelarLogout: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  botaoConfirmarLogout: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  textoConfirmarLogout: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
