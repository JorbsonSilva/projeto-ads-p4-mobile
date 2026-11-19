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

import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../config/api";
import {
  obterPerfilAluno,
  obterPerfilProfessor,
  PerfilAlunoData,
  PerfilProfessorData,
  ResultadoPerfilAluno,
  ResultadoPerfilProfessorData,
  DisponibilidadeProfessorData,
  salvarPerfilAluno,
  salvarPerfilProfessor,
  alterarSenha,
} from "../../services/perfilService";
import {
  obterPerfilProfessor as obterPerfilPublicoProfessor,
  PerfilProfessorPublico,
} from "../../services/professorService";

const DIAS_SEMANA = [
  { codigo: "SEGUNDA", nome: "Segunda-feira" },
  { codigo: "TERCA", nome: "Terça-feira" },
  { codigo: "QUARTA", nome: "Quarta-feira" },
  { codigo: "QUINTA", nome: "Quinta-feira" },
  { codigo: "SEXTA", nome: "Sexta-feira" },
  { codigo: "SABADO", nome: "Sábado" },
  { codigo: "DOMINGO", nome: "Domingo" },
] as const;

const HORARIOS_DISPONIVEIS = Array.from({ length: 36 }, (_, indice) => {
  const minutos = 6 * 60 + indice * 30;
  return `${Math.floor(minutos / 60).toString().padStart(2, "0")}:${(minutos % 60).toString().padStart(2, "0")}`;
});

function minutosDoHorario(horario: string): number {
  const partes = horario.slice(0, 5).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : Number.NaN;
}

function normalizarDiaSemana(dia: string): string {
  return dia.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/-FEIRA$/, "");
}

function horarioDeMinutos(minutos: number): string {
  return `${Math.floor(minutos / 60).toString().padStart(2, "0")}:${(minutos % 60).toString().padStart(2, "0")}`;
}

function validarDisponibilidades(disponibilidades: DisponibilidadeProfessorData[]): string | null {
  for (const dia of DIAS_SEMANA) {
    const periodos = disponibilidades
      .filter((item) => item.diaSemana === dia.codigo)
      .map((item) => ({
        inicio: minutosDoHorario(item.horaInicio),
        fim: minutosDoHorario(item.horaFim),
      }))
      .sort((a, b) => a.inicio - b.inicio);

    for (let indice = 0; indice < periodos.length; indice += 1) {
      if (!Number.isFinite(periodos[indice].inicio) || !Number.isFinite(periodos[indice].fim)) {
        return `Selecione horários válidos para ${dia.nome}.`;
      }
      if (periodos[indice].fim < periodos[indice].inicio + 60) {
        return `Cada período de ${dia.nome} precisa ter pelo menos uma hora para permitir agendamentos.`;
      }
      if (indice > 0 && periodos[indice].inicio < periodos[indice - 1].fim) {
        return `Os períodos de ${dia.nome} não podem se sobrepor.`;
      }
    }
  }
  return null;
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { logoutGlobal, usuarioId, perfilAtivo, trocarPerfil } = useAuth();
  const personaAtiva = perfilAtivo === "Professor" ? "Professor" : "Aluno";

  // Estados dos dados de perfil
  const [perfilAluno, setPerfilAluno] = useState<PerfilAlunoData>({
    id: 0, nome: '', email: '', telefone: '', cidade: '', estado: '', tipo: 'ALUNO',
    fotoUrl: '', bio: '', progresso: { materiasCursando: 0, mentoriasRealizadas: 0, horasAcumuladas: 0 },
    interesses: [], atividadesRecentes: [],
  });
  const [perfilProfessor, setPerfilProfessor] = useState<PerfilProfessorData>({
    id: 0, nome: '', email: '', telefone: '', cidade: '', estado: '', tipo: 'PROFESSOR',
    fotoUrl: '', bio: '', titulacao: '',
    resumoMes: { aulasMinistradas: 0, horasDedicadas: 0, alunosAtendidos: 0, ganhosMes: 0 },
    configuracoesEnsino: { permitePresencial: false, chavePix: '' },
    saberes: [], disponibilidades: [],
  });
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [avaliacoesProfessor, setAvaliacoesProfessor] = useState<PerfilProfessorPublico | null>(null);
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState<boolean>(false);
  const [erroAvaliacoes, setErroAvaliacoes] = useState<string | null>(null);

  // Controle de visibilidade de saldo do resumo do professor
  const [saldoVisivel, setSaldoVisivel] = useState<boolean>(true);

  // Modais de Ação
  const [modalEditarAluno, setModalEditarAluno] = useState<boolean>(false);
  const [modalEditarProf, setModalEditarProf] = useState<boolean>(false);
  const [modalEditarTarifasProf, setModalEditarTarifasProf] = useState<boolean>(false);
  const [modalDisponibilidade, setModalDisponibilidade] = useState<boolean>(false);
  const [modalLogoutVisivel, setModalLogoutVisivel] = useState<boolean>(false);
  const [modalSegurancaVisivel, setModalSegurancaVisivel] = useState<boolean>(false);

  // Formulário Aluno
  const [formAlunoNome, setFormAlunoNome] = useState<string>("");
  const [formAlunoTelefone, setFormAlunoTelefone] = useState<string>("");
  const [formAlunoCidade, setFormAlunoCidade] = useState<string>("");
  const [formAlunoBio, setFormAlunoBio] = useState<string>("");
  const [senhaAtual, setSenhaAtual] = useState<string>("");
  const [novaSenha, setNovaSenha] = useState<string>("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState<string>("");
  const [alterandoSenha, setAlterandoSenha] = useState<boolean>(false);
  const [mensagemSenha, setMensagemSenha] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  // Formulário Professor
  const [formProfNome, setFormProfNome] = useState<string>("");
  const [formProfTitulacao, setFormProfTitulacao] = useState<string>("");
  const [formProfTelefone, setFormProfTelefone] = useState<string>("");
  const [formProfCidade, setFormProfCidade] = useState<string>("");
  const [formProfBio, setFormProfBio] = useState<string>("");
  const [formProfPrecoOnline, setFormProfPrecoOnline] = useState<string>("");
  const [formProfPrecoPresencial, setFormProfPrecoPresencial] = useState<string>("");
  const [formProfPresencial, setFormProfPresencial] = useState<boolean>(false);
  const [disponibilidadesRascunho, setDisponibilidadesRascunho] = useState<DisponibilidadeProfessorData[]>([]);
  const [seletorHorarioAberto, setSeletorHorarioAberto] = useState<string | null>(null);

  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false);
  const [trocandoPerfil, setTrocandoPerfil] = useState<boolean>(false);

  const carregarDados = useCallback(async () => {
    try {
      if (!usuarioId) throw new Error("Sua sessão expirou. Entre novamente.");
      const id = Number(usuarioId);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identificador de usuário inválido.");

      if (personaAtiva === "Professor") {
        const res: ResultadoPerfilProfessorData = await obterPerfilProfessor(id);
        setPerfilProfessor(res.dados);
        setFormProfNome(res.dados.nome);
        setFormProfTitulacao(res.dados.titulacao);
        setFormProfTelefone(res.dados.telefone);
        setFormProfCidade(res.dados.cidade);
        setFormProfBio(res.dados.bio);
        setFormProfPrecoOnline(String(res.dados.configuracoesEnsino.valorHoraOnline || ""));
        setFormProfPrecoPresencial(String(res.dados.configuracoesEnsino.valorHoraPresencial || ""));
        setFormProfPresencial(res.dados.configuracoesEnsino.permitePresencial);
        setCarregandoAvaliacoes(true);
        setErroAvaliacoes(null);
        try {
          setAvaliacoesProfessor(await obterPerfilPublicoProfessor(id));
        } catch (error) {
          setAvaliacoesProfessor(null);
          setErroAvaliacoes(getApiErrorMessage(error));
        } finally {
          setCarregandoAvaliacoes(false);
        }
      } else {
        const res: ResultadoPerfilAluno = await obterPerfilAluno(id);
        setPerfilAluno(res.dados);
        setFormAlunoNome(res.dados.nome);
        setFormAlunoTelefone(res.dados.telefone);
        setFormAlunoCidade(res.dados.cidade);
        setFormAlunoBio(res.dados.bio);
      }
    } catch (error) {
      Alert.alert("Não foi possível carregar o perfil", error instanceof Error ? error.message : "Tente novamente mais tarde.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [personaAtiva, usuarioId]);

  useFocusEffect(
    useCallback(() => {
      void carregarDados();
    }, [carregarDados])
  );

  const onRefresh = () => {
    setAtualizando(true);
    carregarDados();
  };

  const alterarPerfil = async (perfil: "Aluno" | "Professor") => {
    if (perfil === personaAtiva || trocandoPerfil) return;
    setTrocandoPerfil(true);
    try {
      await trocarPerfil(perfil);
    } catch (error) {
      Alert.alert("Não foi possível trocar de perfil", getApiErrorMessage(error));
    } finally {
      setTrocandoPerfil(false);
    }
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
    } catch (error) {
      Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente mais tarde.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleSalvarProfessor = async () => {
    setSalvandoEdicao(true);
    try {
      await salvarPerfilProfessor(perfilProfessor.id, {
        nome: formProfNome,
        telefone: formProfTelefone,
        cidade: formProfCidade,
        bio: formProfBio,
        titulacao: formProfTitulacao,
      });

      setPerfilProfessor((prev) => ({
        ...prev,
        nome: formProfNome,
        telefone: formProfTelefone,
        cidade: formProfCidade,
        bio: formProfBio,
        titulacao: formProfTitulacao,
      }));
      setModalEditarProf(false);
    } catch (error) {
      Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente mais tarde.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleSalvarTarifasProfessor = async () => {
    setSalvandoEdicao(true);
    try {
      const precoOnlineNum = formProfPrecoOnline.trim() ? Number(formProfPrecoOnline.replace(",", ".")) : undefined;
      const precoPresencialNum = formProfPrecoPresencial.trim() ? Number(formProfPrecoPresencial.replace(",", ".")) : undefined;
      if (
        (precoOnlineNum !== undefined && (!Number.isFinite(precoOnlineNum) || precoOnlineNum <= 0)) ||
        (precoPresencialNum !== undefined && (!Number.isFinite(precoPresencialNum) || precoPresencialNum <= 0))
      ) {
        Alert.alert("Valor inválido", "Informe um preço maior que zero ou deixe o campo vazio.");
        return;
      }

      await salvarPerfilProfessor(perfilProfessor.id, {
        configuracoesEnsino: {
          ...perfilProfessor.configuracoesEnsino,
          valorHoraOnline: precoOnlineNum,
          valorHoraPresencial: precoPresencialNum,
          permitePresencial: formProfPresencial,
        },
      });

      setPerfilProfessor((prev) => ({
        ...prev,
        configuracoesEnsino: {
          ...prev.configuracoesEnsino,
          valorHoraOnline: precoOnlineNum,
          valorHoraPresencial: precoPresencialNum,
          permitePresencial: formProfPresencial,
        },
      }));
      setModalEditarTarifasProf(false);
    } catch (error) {
      Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente mais tarde.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const abrirEditorDisponibilidade = () => {
    setDisponibilidadesRascunho(perfilProfessor.disponibilidades.map((item) => ({
      diaSemana: normalizarDiaSemana(item.diaSemana),
      horaInicio: item.horaInicio.slice(0, 5),
      horaFim: item.horaFim.slice(0, 5),
    })));
    setSeletorHorarioAberto(null);
    setModalDisponibilidade(true);
  };

  const alternarDiaDisponivel = (diaSemana: string) => {
    setDisponibilidadesRascunho((atuais) => atuais.some((item) => item.diaSemana === diaSemana)
      ? atuais.filter((item) => item.diaSemana !== diaSemana)
      : [...atuais, { diaSemana, horaInicio: "09:00", horaFim: "17:00" }]);
    setSeletorHorarioAberto(null);
  };

  const atualizarHorarioDisponivel = (
    diaSemana: string,
    indice: number,
    campo: "horaInicio" | "horaFim",
    horario: string,
  ) => {
    setDisponibilidadesRascunho((atuais) => {
      const periodosDoDia = atuais.filter((item) => item.diaSemana === diaSemana);
      const periodo = periodosDoDia[indice];
      if (!periodo) return atuais;

      const atualizado = { ...periodo, [campo]: horario };
      if (campo === "horaInicio" && minutosDoHorario(atualizado.horaFim) < minutosDoHorario(horario) + 60) {
        atualizado.horaFim = horarioDeMinutos(minutosDoHorario(horario) + 60);
      }

      let indiceDoDia = -1;
      return atuais.map((item) => {
        if (item.diaSemana !== diaSemana) return item;
        indiceDoDia += 1;
        return indiceDoDia === indice ? atualizado : item;
      });
    });
    setSeletorHorarioAberto(null);
  };

  const adicionarPeriodoDisponivel = (diaSemana: string) => {
    const periodosDoDia = disponibilidadesRascunho.filter((item) => item.diaSemana === diaSemana);
    const horariosOrdenados = [
      ...HORARIOS_DISPONIVEIS.filter((horario) => minutosDoHorario(horario) >= 18 * 60),
      ...HORARIOS_DISPONIVEIS.filter((horario) => minutosDoHorario(horario) < 18 * 60),
    ];
    const inicioLivre = horariosOrdenados.find((inicio) => {
      const inicioMinutos = minutosDoHorario(inicio);
      const fimMinutos = inicioMinutos + 60;
      return fimMinutos <= minutosDoHorario("23:30")
        && periodosDoDia.every((periodo) =>
          fimMinutos <= minutosDoHorario(periodo.horaInicio)
          || inicioMinutos >= minutosDoHorario(periodo.horaFim)
        );
    });

    if (!inicioLivre) {
      Alert.alert("Sem horário livre", "Remova ou ajuste um período existente para adicionar outro.");
      return;
    }

    const inicioMinutos = minutosDoHorario(inicioLivre);
    setDisponibilidadesRascunho((atuais) => [
      ...atuais,
      {
        diaSemana,
        horaInicio: inicioLivre,
        horaFim: horarioDeMinutos(inicioMinutos + 60),
      },
    ]);
  };

  const removerPeriodoDisponivel = (diaSemana: string, indice: number) => {
    let indiceDoDia = -1;
    setDisponibilidadesRascunho((atuais) => atuais.filter((item) => {
      if (item.diaSemana !== diaSemana) return true;
      indiceDoDia += 1;
      return indiceDoDia !== indice;
    }));
    setSeletorHorarioAberto(null);
  };

  const handleSalvarDisponibilidades = async () => {
    const erro = validarDisponibilidades(disponibilidadesRascunho);
    if (erro) {
      Alert.alert("Horários inválidos", erro);
      return;
    }

    setSalvandoEdicao(true);
    try {
      await salvarPerfilProfessor(perfilProfessor.id, {
        disponibilidades: disponibilidadesRascunho,
      });
      setPerfilProfessor((prev) => ({
        ...prev,
        disponibilidades: disponibilidadesRascunho,
      }));
      setModalDisponibilidade(false);
    } catch (error) {
      Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente mais tarde.");
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

  const handleAlterarSenha = async () => {
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
      setMensagemSenha({ tipo: "erro", texto: "Preencha os três campos de senha." });
      return;
    }
    if (novaSenha.length < 8) {
      setMensagemSenha({ tipo: "erro", texto: "A nova senha deve ter pelo menos 8 caracteres." });
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setMensagemSenha({ tipo: "erro", texto: "A confirmação deve ser igual à nova senha." });
      return;
    }
    if (novaSenha === senhaAtual) {
      setMensagemSenha({ tipo: "erro", texto: "A nova senha deve ser diferente da senha atual." });
      return;
    }

    const id = Number(usuarioId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setMensagemSenha({ tipo: "erro", texto: "Sua sessão expirou. Entre novamente para alterar a senha." });
      return;
    }

    setMensagemSenha(null);
    setAlterandoSenha(true);
    try {
      await alterarSenha(id, senhaAtual, novaSenha);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setMensagemSenha({ tipo: "sucesso", texto: "Senha alterada com sucesso." });
    } catch (error) {
      setMensagemSenha({ tipo: "erro", texto: getApiErrorMessage(error) });
    } finally {
      setAlterandoSenha(false);
    }
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

      <View style={estilos.alternadorContainer}>
        <TouchableOpacity
          style={[
            estilos.botaoAlternador,
            personaAtiva === "Aluno" && estilos.botaoAlternadorAtivoAluno,
          ]}
          onPress={() => alterarPerfil("Aluno")}
          disabled={trocandoPerfil}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: personaAtiva === "Aluno" }}
        >
          <Text
            style={[
              estilos.textoAlternador,
              personaAtiva === "Aluno" && estilos.textoAlternadorAtivo,
            ]}
          >
            🎓 Aluno
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            estilos.botaoAlternador,
            personaAtiva === "Professor" && estilos.botaoAlternadorAtivoProf,
          ]}
          onPress={() => alterarPerfil("Professor")}
          disabled={trocandoPerfil}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: personaAtiva === "Professor" }}
        >
          <Text
            style={[
              estilos.textoAlternador,
              personaAtiva === "Professor" && estilos.textoAlternadorAtivo,
            ]}
          >
            👨‍🏫 Professor
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
                  {perfilAluno.interesses.length > 0 ? (
                    perfilAluno.interesses.map((item, idx) => (
                      <View key={`${item}-${idx}`} style={estilos.chipInteresse}>
                        <Text style={estilos.textoChipInteresse}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={estilos.interessesVazios}>
                      Nenhuma disciplina selecionada.
                    </Text>
                  )}
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
                  onPress={() =>
                    router.push({
                      pathname: "/explorar-disciplinas",
                      params: { modo: "preferencias" },
                    } as any)
                  }
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="book-open" size={17} color="#3B82F6" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Preferências de estudo</Text>
                    <Text style={estilos.subtituloMenuItem}>Escolha matérias do seu interesse</Text>
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
                  onPress={() => {
                    setMensagemSenha(null);
                    setModalSegurancaVisivel(true);
                  }}
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
                <TouchableOpacity onPress={() => router.push("/(tabs)/agenda" as any)}>
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

                <Text style={estilos.titulacaoDocente}>{perfilProfessor.bio ? 'Professor' : ''}</Text>
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
                    {perfilProfessor.resumoMes.aulasMinistradas}
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
                    {perfilProfessor.resumoMes.horasDedicadas}h
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

            {/* PERFIL PROFISSIONAL E DISCIPLINAS */}
            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Perfil profissional</Text>
              <View style={estilos.cardSobre}>
                <Text style={estilos.subtituloInteresses}>Titulação acadêmica</Text>
                <Text style={estilos.textoBio}>
                  {perfilProfessor.titulacao || "Não informada"}
                </Text>
                <View style={estilos.divisorSuave} />
                <Text style={estilos.subtituloInteresses}>Apresentação e metodologia</Text>
                <Text style={estilos.textoBio}>
                  {perfilProfessor.bio || "Nenhuma apresentação profissional cadastrada."}
                </Text>
                <View style={estilos.divisorSuave} />
                <Text style={estilos.subtituloInteresses}>Disciplinas lecionadas</Text>
                <View style={estilos.chipsContainer}>
                  {perfilProfessor.saberes.length > 0 ? (
                    perfilProfessor.saberes.map((mat: { id: number; nome: string; nivel: string }) => (
                      <View key={mat.id} style={estilos.chipMateriaDocente}>
                        <FontAwesome5 name="book-reader" size={10} color="#047857" style={{ marginRight: 6 }} />
                        <Text style={estilos.textoChipMateriaDocente}>{mat.nome}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={estilos.textoBio}>Nenhuma disciplina cadastrada.</Text>
                  )}
                </View>
              </View>
            </View>

            {/* EDIÇÃO E DISCIPLINAS DO PERFIL PROFISSIONAL */}
            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Dados profissionais</Text>
              <View style={estilos.menuContaContainer}>
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => setModalEditarProf(true)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#ECFDF5" }]}>
                    <Feather name="award" size={17} color="#059669" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Editar informações profissionais</Text>
                    <Text style={estilos.subtituloMenuItem}>Nome, contato, titulação e apresentação</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
                <View style={estilos.divisorMenu} />
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => router.push({
                    pathname: "/explorar-disciplinas",
                    params: { modo: "disciplinas-professor" },
                  })}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#EFF6FF" }]}>
                    <Feather name="book-open" size={17} color="#2563EB" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Disciplinas lecionadas</Text>
                    <Text style={estilos.subtituloMenuItem}>
                      {perfilProfessor.saberes.length > 0
                        ? `${perfilProfessor.saberes.length} disciplina(s) selecionada(s)`
                        : "Selecione as matérias que você ensina"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* EDIÇÃO DE FORMATOS E TARIFAS */}
            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Formatos de aula e tarifas</Text>
              <View style={estilos.menuContaContainer}>
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={() => setModalEditarTarifasProf(true)}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#FFFBEB" }]}>
                    <Feather name="tag" size={17} color="#D97706" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Configurar aulas e valores</Text>
                    <Text style={estilos.subtituloMenuItem}>
                      Online: {perfilProfessor.configuracoesEnsino.valorHoraOnline !== undefined ? `R$ ${perfilProfessor.configuracoesEnsino.valorHoraOnline.toFixed(2)}/h` : "Não informado"} • Presencial: {perfilProfessor.configuracoesEnsino.permitePresencial ? (perfilProfessor.configuracoesEnsino.valorHoraPresencial !== undefined ? `R$ ${perfilProfessor.configuracoesEnsino.valorHoraPresencial.toFixed(2)}/h` : "valor não informado") : "não oferecido"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Disponibilidade semanal</Text>
              <View style={estilos.menuContaContainer}>
                <TouchableOpacity
                  style={estilos.menuItem}
                  onPress={abrirEditorDisponibilidade}
                  activeOpacity={0.7}
                >
                  <View style={[estilos.iconeMenuWrap, { backgroundColor: "#ECFDF5" }]}>
                    <Feather name="calendar" size={17} color="#059669" />
                  </View>
                  <View style={estilos.infoMenuItem}>
                    <Text style={estilos.tituloMenuItem}>Definir dias e horários</Text>
                    <Text style={estilos.subtituloMenuItem}>
                      {perfilProfessor.disponibilidades.length === 0
                        ? "Nenhum horário cadastrado"
                        : DIAS_SEMANA
                            .filter((dia) => perfilProfessor.disponibilidades.some((item) =>
                              normalizarDiaSemana(item.diaSemana) === dia.codigo
                            ))
                            .map((dia) => {
                              const periodos = perfilProfessor.disponibilidades
                                .filter((item) => normalizarDiaSemana(item.diaSemana) === dia.codigo)
                                .map((item) => `${item.horaInicio.slice(0, 5)}–${item.horaFim.slice(0, 5)}`)
                                .join(", ");
                              return `${dia.nome.replace("-feira", "")}: ${periodos}`;
                            })
                            .join(" • ")}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* CONTA */}
            <View style={estilos.secaoContainer}>
              <Text style={estilos.secaoTitulo}>Conta</Text>
              <View style={estilos.menuContaContainer}>
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
                  {avaliacoesProfessor && avaliacoesProfessor.totalAvaliacoes > 0 && !erroAvaliacoes ? (
                    <Ionicons name="star" size={12} color="#F59E0B" />
                  ) : null}
                  <Text style={estilos.textoMediaAvaliacao}>
                    {carregandoAvaliacoes
                      ? "Carregando..."
                      : erroAvaliacoes
                        ? "Indisponível"
                        : avaliacoesProfessor && avaliacoesProfessor.totalAvaliacoes > 0
                          ? `${avaliacoesProfessor.notaMedia?.toFixed(1) ?? "Sem nota"} (${avaliacoesProfessor.totalAvaliacoes} avaliações)`
                          : "Sem avaliações"}
                  </Text>
                </View>
              </View>

              <View style={estilos.listaAvaliacoes}>
                {carregandoAvaliacoes ? (
                  <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center", paddingVertical: 16 }}>
                    Carregando avaliações dos alunos...
                  </Text>
                ) : erroAvaliacoes ? (
                  <Text style={{ color: "#B91C1C", fontSize: 13, textAlign: "center", paddingVertical: 16 }}>
                    Não foi possível carregar as avaliações: {erroAvaliacoes}
                  </Text>
                ) : !avaliacoesProfessor || avaliacoesProfessor.totalAvaliacoes === 0 ? (
                  <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center", paddingVertical: 16 }}>
                    Nenhuma avaliação registrada ainda.
                  </Text>
                ) : avaliacoesProfessor.avaliacoesRecentes.length === 0 ? (
                  <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center", paddingVertical: 16 }}>
                    Existem {avaliacoesProfessor.totalAvaliacoes} avaliação(ões), mas nenhuma possui comentário.
                  </Text>
                ) : (
                  avaliacoesProfessor.avaliacoesRecentes.map((avaliacao) => (
                    <View key={avaliacao.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text style={{ color: "#0F172A", fontSize: 14, fontWeight: "600" }}>
                          {avaliacao.alunoNome}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={{ color: "#475569", fontSize: 12 }}>{avaliacao.nota}</Text>
                        </View>
                      </View>
                      <Text style={{ color: "#475569", fontSize: 13 }}>{avaliacao.comentario}</Text>
                      {avaliacao.data ? (
                        <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 6 }}>{avaliacao.data}</Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            </View>

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

      {/* EDIÇÃO DO PERFIL PROFISSIONAL OU DAS AULAS E TARIFAS */}
      <Modal visible={modalEditarProf || modalEditarTarifasProf} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardEdicao}>
            <View style={estilos.modalHeaderLinha}>
              <Text style={estilos.modalTitulo}>
                {modalEditarProf ? "Editar perfil profissional" : "Formatos de aula e tarifas"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalEditarProf(false);
                  setModalEditarTarifasProf(false);
                }}
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {modalEditarProf ? (
                <>
                  <Text style={estilos.labelInput}>Nome completo</Text>
                  <TextInput
                    style={estilos.inputFormulario}
                    value={formProfNome}
                    onChangeText={setFormProfNome}
                    placeholder="Ex: Prof. Carlos Mendes"
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={estilos.labelInput}>Titulação acadêmica</Text>
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

                  <Text style={estilos.labelInput}>Biografia e metodologia</Text>
                  <TextInput
                    style={[estilos.inputFormulario, { height: 90, textAlignVertical: "top" }]}
                    value={formProfBio}
                    onChangeText={setFormProfBio}
                    placeholder="Descreva sua experiência acadêmica e didática..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                  />
                </>
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={estilos.labelInput}>Aulas online</Text>
                      <Text style={estilos.subtituloMenuItem}>Disponíveis para atendimento remoto</Text>
                    </View>
                    <Feather name="video" size={20} color="#059669" />
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={estilos.labelInput}>Aulas presenciais</Text>
                      <Text style={estilos.subtituloMenuItem}>Ative para oferecer atendimento presencial</Text>
                    </View>
                    <Switch
                      value={formProfPresencial}
                      onValueChange={setFormProfPresencial}
                      trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
                      thumbColor={formProfPresencial ? "#059669" : "#F8FAFC"}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.labelInput}>Valor online (R$/h)</Text>
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
                      <Text style={estilos.labelInput}>Valor presencial (R$/h)</Text>
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
                </>
              )}
            </ScrollView>

            <View style={estilos.modalAcoesLinha}>
              <TouchableOpacity
                style={estilos.botaoModalCancelar}
                onPress={() => {
                  setModalEditarProf(false);
                  setModalEditarTarifasProf(false);
                }}
              >
                <Text style={estilos.textoBotaoCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botaoModalSalvar, { backgroundColor: "#FF5A1F" }]}
                onPress={modalEditarProf ? handleSalvarProfessor : handleSalvarTarifasProfessor}
                disabled={salvandoEdicao}
              >
                {salvandoEdicao ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoSalvar}>
                    {modalEditarProf ? "Salvar perfil profissional" : "Salvar formatos e tarifas"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalDisponibilidade} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardEdicao}>
            <View style={estilos.modalHeaderLinha}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.modalTitulo}>Disponibilidade semanal</Text>
                <Text style={estilos.textoAjudaDisponibilidade}>
                  Selecione os dias e os períodos em que aceita aulas.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalDisponibilidade(false)}
                accessibilityLabel="Fechar disponibilidade"
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              {DIAS_SEMANA.map((dia) => {
                const periodos = disponibilidadesRascunho.filter((item) => item.diaSemana === dia.codigo);
                const diaAtivo = periodos.length > 0;
                return (
                  <View key={dia.codigo} style={estilos.cardDiaDisponibilidade}>
                    <TouchableOpacity
                      style={estilos.botaoDiaDisponibilidade}
                      onPress={() => alternarDiaDisponivel(dia.codigo)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ selected: diaAtivo }}
                    >
                      <Feather
                        name={diaAtivo ? "check-square" : "square"}
                        size={20}
                        color={diaAtivo ? "#059669" : "#94A3B8"}
                      />
                      <Text style={estilos.nomeDiaDisponibilidade}>{dia.nome}</Text>
                      <Text style={estilos.statusDiaDisponibilidade}>
                        {diaAtivo ? "Disponível" : "Indisponível"}
                      </Text>
                    </TouchableOpacity>

                    {periodos.map((periodo, indice) => {
                      const seletorInicio = `${dia.codigo}-${indice}-inicio`;
                      const seletorFim = `${dia.codigo}-${indice}-fim`;
                      const mostrarInicio = seletorHorarioAberto === seletorInicio;
                      const mostrarFim = seletorHorarioAberto === seletorFim;
                      const horariosInicio = HORARIOS_DISPONIVEIS.filter((horario) =>
                        minutosDoHorario(horario) + 60 <= minutosDoHorario("23:30")
                      );
                      const horariosFim = HORARIOS_DISPONIVEIS.filter((horario) =>
                        minutosDoHorario(horario) >= minutosDoHorario(periodo.horaInicio) + 60
                      );

                      return (
                        <View key={`${dia.codigo}-${indice}`} style={estilos.periodoDisponibilidade}>
                          <View style={estilos.linhaPeriodoDisponibilidade}>
                            <Text style={estilos.labelPeriodoDisponibilidade}>Período {indice + 1}</Text>
                            <TouchableOpacity
                              onPress={() => removerPeriodoDisponivel(dia.codigo, indice)}
                              accessibilityLabel={`Remover período ${indice + 1} de ${dia.nome}`}
                            >
                              <Feather name="trash-2" size={16} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                          <View style={estilos.seletoresPeriodoDisponibilidade}>
                            <TouchableOpacity
                              style={[estilos.botaoHorarioDisponibilidade, mostrarInicio && estilos.botaoHorarioDisponibilidadeAtivo]}
                              onPress={() => setSeletorHorarioAberto(mostrarInicio ? null : seletorInicio)}
                            >
                              <Text style={estilos.labelHorarioDisponibilidade}>Início</Text>
                              <Text style={estilos.valorHorarioDisponibilidade}>{periodo.horaInicio}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[estilos.botaoHorarioDisponibilidade, mostrarFim && estilos.botaoHorarioDisponibilidadeAtivo]}
                              onPress={() => setSeletorHorarioAberto(mostrarFim ? null : seletorFim)}
                            >
                              <Text style={estilos.labelHorarioDisponibilidade}>Término</Text>
                              <Text style={estilos.valorHorarioDisponibilidade}>{periodo.horaFim}</Text>
                            </TouchableOpacity>
                          </View>

                          {(mostrarInicio || mostrarFim) && (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={estilos.opcoesHorarioDisponibilidade}
                            >
                              {(mostrarInicio ? horariosInicio : horariosFim).map((horario) => {
                                const selecionado = horario === (mostrarInicio ? periodo.horaInicio : periodo.horaFim);
                                return (
                                  <TouchableOpacity
                                    key={horario}
                                    style={[
                                      estilos.opcaoHorarioDisponibilidade,
                                      selecionado && estilos.opcaoHorarioDisponibilidadeAtiva,
                                    ]}
                                    onPress={() => atualizarHorarioDisponivel(
                                      dia.codigo,
                                      indice,
                                      mostrarInicio ? "horaInicio" : "horaFim",
                                      horario,
                                    )}
                                  >
                                    <Text
                                      style={[
                                        estilos.textoOpcaoHorarioDisponibilidade,
                                        selecionado && estilos.textoOpcaoHorarioDisponibilidadeAtiva,
                                      ]}
                                    >
                                      {horario}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          )}
                        </View>
                      );
                    })}

                    {diaAtivo && (
                      <TouchableOpacity
                        style={estilos.botaoAdicionarPeriodo}
                        onPress={() => adicionarPeriodoDisponivel(dia.codigo)}
                        activeOpacity={0.7}
                      >
                        <Feather name="plus" size={15} color="#059669" />
                        <Text style={estilos.textoAdicionarPeriodo}>Adicionar período</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={estilos.modalAcoesLinha}>
              <TouchableOpacity
                style={estilos.botaoModalCancelar}
                onPress={() => setModalDisponibilidade(false)}
              >
                <Text style={estilos.textoBotaoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={estilos.botaoModalSalvar}
                onPress={handleSalvarDisponibilidades}
                disabled={salvandoEdicao}
              >
                {salvandoEdicao ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoSalvar}>Salvar disponibilidade</Text>
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
              <TouchableOpacity
                onPress={() => {
                  if (alterandoSenha) return;
                  setMensagemSenha(null);
                  setModalSegurancaVisivel(false);
                }}
                disabled={alterandoSenha}
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {mensagemSenha && (
              <View
                style={[
                  estilos.mensagemSenha,
                  mensagemSenha.tipo === "sucesso"
                    ? estilos.mensagemSenhaSucesso
                    : estilos.mensagemSenhaErro,
                ]}
                accessibilityRole="alert"
              >
                <Feather
                  name={mensagemSenha.tipo === "sucesso" ? "check-circle" : "alert-circle"}
                  size={17}
                  color={mensagemSenha.tipo === "sucesso" ? "#047857" : "#B91C1C"}
                />
                <Text
                  style={[
                    estilos.textoMensagemSenha,
                    mensagemSenha.tipo === "sucesso"
                      ? estilos.textoMensagemSenhaSucesso
                      : estilos.textoMensagemSenhaErro,
                  ]}
                >
                  {mensagemSenha.texto}
                </Text>
              </View>
            )}

            <Text style={estilos.labelInput}>Senha Atual</Text>
            <TextInput
              style={estilos.inputFormulario}
              value={senhaAtual}
              onChangeText={(valor) => {
                setSenhaAtual(valor);
                setMensagemSenha(null);
              }}
              placeholder="Digite sua senha atual"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <Text style={estilos.labelInput}>Nova Senha</Text>
            <TextInput
              style={estilos.inputFormulario}
              value={novaSenha}
              onChangeText={(valor) => {
                setNovaSenha(valor);
                setMensagemSenha(null);
              }}
              placeholder="Mínimo de 8 caracteres"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <Text style={estilos.labelInput}>Confirmar Nova Senha</Text>
            <TextInput
              style={estilos.inputFormulario}
              value={confirmarNovaSenha}
              onChangeText={(valor) => {
                setConfirmarNovaSenha(valor);
                setMensagemSenha(null);
              }}
              placeholder="Repita a nova senha"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />

            <View style={estilos.modalAcoesLinha}>
              <TouchableOpacity
                style={estilos.botaoModalCancelar}
                onPress={() => {
                  if (alterandoSenha) return;
                  setMensagemSenha(null);
                  setModalSegurancaVisivel(false);
                }}
                disabled={alterandoSenha}
              >
                <Text style={estilos.textoBotaoCancelar}>Fechar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botaoModalSalvar}
                onPress={() => void handleAlterarSenha()}
                disabled={alterandoSenha}
              >
                {alterandoSenha ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoSalvar}>Atualizar senha</Text>
                )}
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
  textoAjudaDisponibilidade: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },
  cardDiaDisponibilidade: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  botaoDiaDisponibilidade: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 32,
  },
  nomeDiaDisponibilidade: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusDiaDisponibilidade: {
    fontSize: 10,
    color: "#64748B",
  },
  periodoDisponibilidade: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  linhaPeriodoDisponibilidade: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  labelPeriodoDisponibilidade: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  seletoresPeriodoDisponibilidade: {
    flexDirection: "row",
    gap: 8,
  },
  botaoHorarioDisponibilidade: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  botaoHorarioDisponibilidadeAtivo: {
    borderColor: "#059669",
    backgroundColor: "#ECFDF5",
  },
  labelHorarioDisponibilidade: {
    fontSize: 10,
    color: "#64748B",
  },
  valorHorarioDisponibilidade: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  opcoesHorarioDisponibilidade: {
    gap: 6,
    paddingVertical: 8,
  },
  opcaoHorarioDisponibilidade: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  opcaoHorarioDisponibilidadeAtiva: {
    backgroundColor: "#059669",
  },
  textoOpcaoHorarioDisponibilidade: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  textoOpcaoHorarioDisponibilidadeAtiva: {
    color: "#FFFFFF",
  },
  botaoAdicionarPeriodo: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 8,
    paddingVertical: 4,
  },
  textoAdicionarPeriodo: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
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
  mensagemSenha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  mensagemSenhaSucesso: {
    backgroundColor: "#ECFDF5",
  },
  mensagemSenhaErro: {
    backgroundColor: "#FEF2F2",
  },
  textoMensagemSenha: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  textoMensagemSenhaSucesso: {
    color: "#047857",
  },
  textoMensagemSenhaErro: {
    color: "#B91C1C",
  },
  interessesVazios: {
    color: "#64748B",
    fontSize: 12,
    fontStyle: "italic",
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
