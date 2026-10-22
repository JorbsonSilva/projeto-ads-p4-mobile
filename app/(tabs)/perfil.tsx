/**
 * @file perfil.tsx
 * @description Controlador da Tela de Perfil do Usuário.
 * Permite ao usuário visualizar e editar suas informações pessoais, segurança,
 */

import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotaoCustomizado } from "../../components/BotaoCustomizado";
import { InputCustomizado } from "../../components/InputCustomizado";
import { API_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const diasDaSemanaDisponiveis = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

const HORARIOS_LISTA = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

export default function PerfilPeca1() {
  const roteador = useRouter();
  const URL_BACKEND = `${API_URL}`;

  const [carregando, setCarregando] = useState(true);
  const {
    perfilAtivo,
    alternarPerfilGlobal,
    usuarioId,
    carregandoAuth,
    logoutGlobal,
  } = useAuth() as any;

  // Estados Pessoais
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [salvandoPessoal, setSalvandoPessoal] = useState(false);

  // Estados de Segurança
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [mostrarConfirmLogout, setMostrarConfirmLogout] = useState(false);

  // Controles de Acordeão
  const [expandirInfo, setExpandirInfo] = useState(false);
  const [expandirSeguranca, setExpandirSeguranca] = useState(false);

  // Estados do Aluno
  const [bioAluno, setBioAluno] = useState("");
  const [buscaSaber, setBuscaSaber] = useState("");
  const [catalogoSaberesBD, setCatalogoSaberesBD] = useState<any[]>([]);
  const [interesses, setInteresses] = useState<any[]>([]);
  const [salvandoAluno, setSalvandoAluno] = useState(false);

  // Estados do Professor
  const [bioProfessor, setBioProfessor] = useState("");
  const [aptidoes, setAptidoes] = useState<any[]>([]);
  const [buscaSaberProf, setBuscaSaberProf] = useState("");
  const [saberProfSelecionado, setSaberProfSelecionado] = useState<any>(null);
  const [nivelProf, setNivelProf] = useState("Iniciante");
  const [precoProf, setPrecoProf] = useState("");

  // Estados de Controle de Disponibilidade
  const [disponibilidades, setDisponibilidades] = useState<any[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState("Segunda");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [salvandoProf, setSalvandoProf] = useState(false);

  // Modal de Seleção de Horário
  const [modalHorarioVisivel, setModalHorarioVisivel] = useState(false);
  const [tipoHorario, setTipoHorario] = useState<"inicio" | "fim">("inicio");

  // ==========================================
  // CICLO DE VIDA E DADOS
  // ==========================================
  useEffect(() => {
    if (carregandoAuth) return;
    if (!usuarioId) return roteador.replace("/login");

    const inicializarPerfil = async () => {
      try {
        const resposta = await fetch(
          `${URL_BACKEND}/api/usuarios/${usuarioId}`,
        );
        if (resposta.ok) {
          const dados = await resposta.json();
          setNome(dados.nome || "");
          setEmail(dados.email || "");
          setNascimento(dados.dataNascimento || "");
          setCpf(dados.cpf || "");
          setBioAluno(dados.bioAluno || "");
          setInteresses(dados.interesses || []);
          setBioProfessor(dados.bioProfessor || "");
          setAptidoes(dados.aptidoes || []);
          setDisponibilidades(dados.disponibilidades || []);
        }

        const resSaberes = await fetch(`${URL_BACKEND}/api/saberes`);
        if (resSaberes.ok) {
          setCatalogoSaberesBD(await resSaberes.json());
        }
      } catch (error) {
        console.error("Erro ao inicializar:", error);
      } finally {
        setCarregando(false);
      }
    };
    inicializarPerfil();
  }, [carregandoAuth, usuarioId]);

  // ==========================================
  // REGRAS DE NEGÓCIO E FUNÇÕES
  // ==========================================
  const handleLogout = async () => {
    try {
      if (logoutGlobal) await logoutGlobal();
      else
        await AsyncStorage.multiRemove([
          "@orienta_perfil",
          "@orienta_usuario_id",
        ]);
    } catch (error) {
      console.error("Erro no logout:", error);
    } finally {
      roteador.replace("/login");
    }
  };

  const atualizarDadosPessoais = async () => {
    if (!nome)
      return Alert.alert("Erro", "O campo Nome Completo é obrigatório.");
    setSalvandoPessoal(true);
    try {
      const resposta = await fetch(`${URL_BACKEND}/api/usuarios/${usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, dataNascimento: nascimento, cpf }),
      });
      if (resposta.ok) {
        Alert.alert("Sucesso", "Seus dados pessoais foram atualizados.");
        setExpandirInfo(false);
      }
    } catch (error) {
      Alert.alert("Erro", "Falha de conexão com o servidor.");
    } finally {
      setSalvandoPessoal(false);
    }
  };

  const processarTrocaSenha = async () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha)
      return Alert.alert("Atenção", "Preencha todas as senhas.");
    if (novaSenha !== confirmarSenha)
      return Alert.alert(
        "Atenção",
        "A nova senha e a confirmação não coincidem.",
      );

    setSalvandoSenha(true);
    try {
      const resposta = await fetch(
        `${URL_BACKEND}/api/usuarios/${usuarioId}/senha`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senhaAtual, novaSenha }),
        },
      );
      if (resposta.ok) {
        Alert.alert("Sucesso", "Sua senha foi alterada com segurança.");
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
        setExpandirSeguranca(false);
      } else {
        Alert.alert("Erro", "Senha atual incorreta.");
      }
    } catch (error) {
      Alert.alert("Erro", "Falha na troca de senha.");
    } finally {
      setSalvandoSenha(false);
    }
  };

  const salvarPerfilAluno = async () => {
    setSalvandoAluno(true);
    try {
      await fetch(`${URL_BACKEND}/api/usuarios/${usuarioId}/aluno`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bioAluno,
          interessesIds: interesses.map((item) => item.saber?.id || item.id),
        }),
      });
      Alert.alert("Sucesso", "Seu perfil de Aluno foi atualizado!");
    } catch (error) {
      Alert.alert("Erro", "Falha de conexão.");
    } finally {
      setSalvandoAluno(false);
    }
  };

  const salvarPerfilProfessor = async () => {
    setSalvandoProf(true);
    try {
      const aptidoesMapeadas = aptidoes.map((apt) => ({
        saberId: apt.saber?.id || apt.saberId,
        nivelDominio: apt.nivelDominio,
        precoHora: apt.precoHora,
      }));
      await fetch(`${URL_BACKEND}/api/usuarios/${usuarioId}/professor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bioProfessor,
          aptidoesNova: aptidoesMapeadas,
          disponibilidadesNova: disponibilidades,
        }),
      });
      Alert.alert("Sucesso", "Perfil de Professor atualizado com sucesso!");
    } catch (error) {
      Alert.alert("Erro", "Falha de conexão.");
    } finally {
      setSalvandoProf(false);
    }
  };

  const adicionarInteresse = (saber: any) => {
    if (interesses.some((item) => (item.saber?.id || item.id) === saber.id))
      return;
    setInteresses([...interesses, { saber }]);
    setBuscaSaber("");
  };
  const removerInteresse = (id: number) =>
    setInteresses(
      interesses.filter((item) => (item.saber?.id || item.id) !== id),
    );

  const prepararAptidao = (saber: any) => {
    if (aptidoes.some((item) => (item.saber?.id || item.saberId) === saber.id))
      return Alert.alert("Aviso", "Matéria já adicionada.");
    setSaberProfSelecionado(saber);
    setBuscaSaberProf("");
  };

  const cancelarAdicaoAptidao = () => {
    setSaberProfSelecionado(null);
    setPrecoProf("");
    setNivelProf("Iniciante");
  };

  const confirmarAdicaoAptidao = () => {
    if (!precoProf) return Alert.alert("Aviso", "Defina o valor da hora/aula.");
    setAptidoes([
      ...aptidoes,
      {
        saberId: saberProfSelecionado.id,
        nomeExibicao: saberProfSelecionado.nome,
        nivelDominio: nivelProf,
        precoHora: parseFloat(precoProf.replace(",", ".")) || 0,
      },
    ]);
    setSaberProfSelecionado(null);
    setPrecoProf("");
    setNivelProf("Iniciante");
  };

  const removerAptidao = (id: number) =>
    setAptidoes(
      aptidoes.filter((item) => (item.saber?.id || item.saberId) !== id),
    );

  const processarSelecaoHorario = (hora: string) => {
    if (tipoHorario === "inicio") {
      setHoraInicio(hora);
      if (!horaFim || hora >= horaFim) {
        const index = HORARIOS_LISTA.indexOf(hora);
        if (index !== -1 && index < HORARIOS_LISTA.length - 1) {
          setHoraFim(HORARIOS_LISTA[index + 1]);
        }
      }
    } else {
      if (horaInicio && hora <= horaInicio) {
        Alert.alert(
          "Aviso",
          "O horário de término deve ser posterior ao início.",
        );
        return;
      }
      setHoraFim(hora);
    }
    setModalHorarioVisivel(false);
  };

  const adicionarDisponibilidade = () => {
    if (!horaInicio || !horaFim)
      return Alert.alert("Aviso", "Preencha o intervalo de início e fim.");
    setDisponibilidades([
      ...disponibilidades,
      {
        diaSemana: diaSelecionado,
        horaInicio: `${horaInicio}:00`,
        horaFim: `${horaFim}:00`,
      },
    ]);
    setHoraInicio("");
    setHoraFim("");
  };

  const removerDisponibilidade = (index: number) => {
    const novaLista = [...disponibilidades];
    novaLista.splice(index, 1);
    setDisponibilidades(novaLista);
  };

  // ==========================================
  // RENDERIZAÇÃO DA INTERFACE (UI)
  // ==========================================
  if (carregando) {
    return (
      <View style={estilos.telaCarregamento}>
        <ActivityIndicator size="large" color="#FF6B1A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.telaGeral} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={estilos.headerNav}>
          <Text style={estilos.tituloHeader}>Gestão de Conta</Text>
          <TouchableOpacity
            onPress={() => setMostrarConfirmLogout(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="log-out" size={24} color="#D93838" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={estilos.conteudoScroll}
        >
          <View style={estilos.containerIdentidade}>
            <View style={estilos.avatarContainer}>
              <View style={estilos.avatarCirculo}>
                <Text style={estilos.avatarLetra}>
                  {nome ? nome.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
              <View style={estilos.iconeEdicaoFoto}>
                <Feather name="camera" size={14} color="#FFF" />
              </View>
            </View>
            <Text style={estilos.nomeDestaque}>{nome || "Usuário"}</Text>
            <Text style={estilos.emailDestaque}>{email}</Text>
          </View>

          {/* ACORDEÃO 1: INFORMAÇÕES PESSOAIS */}
          <View style={estilos.cartaoAcordeao}>
            <TouchableOpacity
              style={estilos.cabecalhoAcordeao}
              onPress={() => setExpandirInfo(!expandirInfo)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Feather name="user" size={20} color="#0057B8" />
                <Text style={estilos.tituloSessao}>Informações Pessoais</Text>
              </View>
              <Feather
                name={expandirInfo ? "chevron-up" : "chevron-down"}
                size={22}
                color="#999"
              />
            </TouchableOpacity>

            {expandirInfo && (
              <View style={estilos.conteudoAcordeao}>
                <Text style={estilos.labelInput}>
                  E-mail de Cadastro (Bloqueado)
                </Text>
                <View style={estilos.inputBloqueadoContainer}>
                  <Text style={estilos.textoInputBloqueado}>{email}</Text>
                  <Feather name="lock" size={16} color="#999" />
                </View>

                <Text style={estilos.labelInput}>Nome Completo</Text>
                <InputCustomizado
                  placeholder="Seu nome"
                  valor={nome}
                  aoMudarTexto={setNome}
                />

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.labelInput}>CPF</Text>
                    <InputCustomizado
                      placeholder="000.000.000-00"
                      valor={cpf}
                      aoMudarTexto={setCpf}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.labelInput}>Nascimento</Text>
                    <InputCustomizado
                      placeholder="DD/MM/AAAA"
                      valor={nascimento}
                      aoMudarTexto={setNascimento}
                    />
                  </View>
                </View>

                <BotaoCustomizado
                  text="Atualizar Dados"
                  aoClicar={atualizarDadosPessoais}
                  carregando={salvandoPessoal}
                />
              </View>
            )}
          </View>

          {/* ACORDEÃO 2: SEGURANÇA */}
          <View style={estilos.cartaoAcordeao}>
            <TouchableOpacity
              style={estilos.cabecalhoAcordeao}
              onPress={() => setExpandirSeguranca(!expandirSeguranca)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Feather name="shield" size={20} color="#D35400" />
                <Text style={estilos.tituloSessao}>Segurança e Acesso</Text>
              </View>
              <Feather
                name={expandirSeguranca ? "chevron-up" : "chevron-down"}
                size={22}
                color="#999"
              />
            </TouchableOpacity>

            {expandirSeguranca && (
              <View style={estilos.conteudoAcordeao}>
                <Text style={estilos.labelInput}>Senha Atual</Text>
                <InputCustomizado
                  placeholder="Digite sua senha atual"
                  valor={senhaAtual}
                  aoMudarTexto={setSenhaAtual}
                  seguro
                  mostrarSenha={mostrarSenha}
                  aoAlternarSenha={() => setMostrarSenha(!mostrarSenha)}
                />
                <Text style={estilos.labelInput}>Nova Senha</Text>
                <InputCustomizado
                  placeholder="Digite a nova senha"
                  valor={novaSenha}
                  aoMudarTexto={setNovaSenha}
                  seguro
                  mostrarSenha={mostrarSenha}
                  aoAlternarSenha={() => setMostrarSenha(!mostrarSenha)}
                />
                <Text style={estilos.labelInput}>Confirme a Nova Senha</Text>
                <InputCustomizado
                  placeholder="Repita a nova senha"
                  valor={confirmarSenha}
                  aoMudarTexto={setConfirmarSenha}
                  seguro
                  mostrarSenha={mostrarSenha}
                  aoAlternarSenha={() => setMostrarSenha(!mostrarSenha)}
                />

                <BotaoCustomizado
                  text="Alterar Senha"
                  aoClicar={processarTrocaSenha}
                  carregando={salvandoSenha}
                />
              </View>
            )}
          </View>

          {/* SEGMENTED CONTROL: Chaveador Premium Aluno/Professor */}
          <View style={estilos.segmentedControl}>
            <TouchableOpacity
              style={[
                estilos.segmentTab,
                perfilAtivo === "Aluno" && estilos.segmentTabAtiva,
              ]}
              onPress={() => alternarPerfilGlobal("Aluno")}
            >
              <Text
                style={[
                  estilos.segmentTexto,
                  perfilAtivo === "Aluno" && estilos.segmentTextoAtivo,
                ]}
              >
                Área do Aluno
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                estilos.segmentTab,
                perfilAtivo === "Professor" && estilos.segmentTabAtiva,
              ]}
              onPress={() => alternarPerfilGlobal("Professor")}
            >
              <Text
                style={[
                  estilos.segmentTexto,
                  perfilAtivo === "Professor" && estilos.segmentTextoAtivo,
                ]}
              >
                Área do Professor
              </Text>
            </TouchableOpacity>
          </View>

          {/* ========================================== */}
          {/* PEÇA 2: CONFIGURAÇÕES DO ALUNO             */}
          {/* ========================================== */}
          {perfilAtivo === "Aluno" && (
            <View style={estilos.blocoConfiguracoes}>
              <Text style={estilos.tituloConfig}>
                Apresentação Pública (Bio)
              </Text>
              <Text style={estilos.subtituloConfig}>
                Escreva sobre seus objetivos de estudo e o que busca nos
                mentores.
              </Text>

              <View style={estilos.textAreaContainer}>
                <TextInput
                  value={bioAluno}
                  onChangeText={setBioAluno}
                  multiline
                  style={estilos.textArea}
                  placeholder="Ex: Sou estudante de exatas buscando ajuda em cálculo..."
                />
              </View>

              <Text style={[estilos.tituloConfig, { marginTop: 24 }]}>
                Disciplinas de Interesse
              </Text>
              <View style={estilos.buscaContainer}>
                <Feather name="search" size={20} color="#999" />
                <TextInput
                  value={buscaSaber}
                  onChangeText={setBuscaSaber}
                  style={estilos.inputBuscaAptidao}
                  placeholder="Pesquise para adicionar..."
                />
              </View>

              {buscaSaber.length > 0 && (
                <View style={estilos.listaResultados}>
                  {catalogoSaberesBD
                    .filter((s) =>
                      s.nome.toLowerCase().includes(buscaSaber.toLowerCase()),
                    )
                    .map((saber, i) => (
                      <TouchableOpacity
                        key={i}
                        style={estilos.itemResultado}
                        onPress={() => adicionarInteresse(saber)}
                      >
                        <Text style={estilos.textoResultado}>{saber.nome}</Text>
                        <Feather name="plus-circle" size={18} color="#008A46" />
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              <View style={estilos.containerTags}>
                {interesses.map((item, i) => (
                  <View key={i} style={estilos.chipTag}>
                    <Text style={estilos.textoChip}>
                      {item.saber?.nome || item.nome}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        removerInteresse(item.saber?.id || item.id)
                      }
                    >
                      <Feather
                        name="x"
                        size={14}
                        color="#FFF"
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <BotaoCustomizado
                text="Salvar Perfil de Aluno"
                aoClicar={salvarPerfilAluno}
                carregando={salvandoAluno}
              />
            </View>
          )}

          {/* ========================================== */}
          {/* PEÇA 3: CONFIGURAÇÕES DO PROFESSOR         */}
          {/* ========================================== */}
          {perfilAtivo === "Professor" && (
            <View style={estilos.blocoConfiguracoes}>
              {/* BIO */}
              <Text style={estilos.tituloConfig}>
                Metodologia e Experiência
              </Text>
              <Text style={estilos.subtituloConfig}>
                Os alunos verão este texto no seu perfil ao agendar aulas.
              </Text>
              <View style={estilos.textAreaContainer}>
                <TextInput
                  value={bioProfessor}
                  onChangeText={setBioProfessor}
                  multiline
                  style={estilos.textArea}
                  placeholder="Fale sobre sua carreira, método de ensino..."
                />
              </View>

              {/* ESPECIALIDADES - BLOCO DE ADIÇÃO */}
              <Text style={[estilos.tituloConfig, { marginTop: 30 }]}>
                Adicionar Nova Disciplina
              </Text>
              <Text style={estilos.subtituloConfig}>
                Pesquise a matéria e defina o valor da sua hora/aula para ela.
              </Text>

              <View style={estilos.buscaContainer}>
                <Feather name="search" size={20} color="#999" />
                <TextInput
                  value={buscaSaberProf}
                  onChangeText={setBuscaSaberProf}
                  style={estilos.inputBuscaAptidao}
                  placeholder="Pesquise a matéria..."
                />
              </View>

              {buscaSaberProf.length > 0 && (
                <View style={estilos.listaResultados}>
                  {catalogoSaberesBD
                    .filter((s) =>
                      s.nome
                        .toLowerCase()
                        .includes(buscaSaberProf.toLowerCase()),
                    )
                    .map((saber, i) => (
                      <TouchableOpacity
                        key={i}
                        style={estilos.itemResultado}
                        onPress={() => prepararAptidao(saber)}
                      >
                        <Text style={estilos.textoResultado}>{saber.nome}</Text>
                        <Feather name="arrow-right" size={18} color="#FF6B1A" />
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* MINI FORMULÁRIO DE ADIÇÃO */}
              {saberProfSelecionado && (
                <View style={estilos.miniFormAptidao}>
                  <Text style={estilos.textoDestaqueAptidao}>
                    Configurando: {saberProfSelecionado.nome}
                  </Text>

                  <Text style={estilos.labelInput}>Nível de Domínio</Text>
                  <View style={estilos.botoesNivel}>
                    {["Iniciante", "Intermediário", "Avançado"].map((nivel) => (
                      <TouchableOpacity
                        key={nivel}
                        style={[
                          estilos.botaoNivel,
                          nivelProf === nivel && estilos.botaoNivelAtivo,
                        ]}
                        onPress={() => setNivelProf(nivel)}
                      >
                        <Text
                          style={[
                            estilos.textoNivel,
                            nivelProf === nivel && estilos.textoNivelAtivo,
                          ]}
                        >
                          {nivel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={estilos.labelInput}>Valor Hora/Aula (R$)</Text>
                  <InputCustomizado
                    placeholder="Ex: 60,00"
                    valor={precoProf}
                    aoMudarTexto={setPrecoProf}
                    keyboardType="numeric"
                  />

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
                    <TouchableOpacity
                      style={estilos.botaoCancelarAptidao}
                      onPress={cancelarAdicaoAptidao}
                    >
                      <Text style={estilos.textoCancelarAptidao}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={estilos.botaoAcaoRapida}
                      onPress={confirmarAdicaoAptidao}
                    >
                      <Text style={estilos.textoAcaoRapida}>
                        Confirmar Adição
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {aptidoes.length > 0 && (
                <View style={estilos.blocoSeparador}>
                  <Text style={estilos.tituloConfig}>Matérias Adicionadas</Text>
                  <Text style={estilos.subtituloConfig}>
                    Seu catálogo de disciplinas ativas.
                  </Text>

                  {aptidoes.map((item, i) => (
                    <View key={i} style={estilos.cardItemAdicionado}>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.tituloItemAdicionado}>
                          {item.nomeExibicao || item.saber?.nome}
                        </Text>
                        <Text style={estilos.subtituloItemAdicionado}>
                          Nível: {item.nivelDominio} • R${" "}
                          {item.precoHora.toFixed(2)}/h
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          removerAptidao(item.saber?.id || item.saberId)
                        }
                        style={estilos.botaoRemoverIco}
                      >
                        <Feather name="trash-2" size={18} color="#D93838" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* ========================================== */}
              {/* GRADE DE DISPONIBILIDADE                   */}
              {/* ========================================== */}
              <Text style={[estilos.tituloConfig, { marginTop: 30 }]}>
                Adicionar Horário Livre
              </Text>
              <Text style={estilos.subtituloConfig}>
                Selecione os dias da semana e os intervalos de horários que você
                atende.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginVertical: 12 }}
              >
                {diasDaSemanaDisponiveis.map((dia) => (
                  <TouchableOpacity
                    key={dia}
                    style={[
                      estilos.tagDia,
                      diaSelecionado === dia && estilos.tagDiaAtiva,
                    ]}
                    onPress={() => setDiaSelecionado(dia)}
                  >
                    <Text
                      style={[
                        estilos.textoDia,
                        diaSelecionado === dia && estilos.textoDiaAtivo,
                      ]}
                    >
                      {dia}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Seletores Visuais de Horário */}
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 15 }}>
                <TouchableOpacity
                  style={estilos.seletorTempo}
                  onPress={() => {
                    setTipoHorario("inicio");
                    setModalHorarioVisivel(true);
                  }}
                >
                  <Text style={estilos.labelTempo}>Das</Text>

                  <Text
                    style={
                      horaInicio ? estilos.valorTempo : estilos.placeholderTempo
                    }
                  >
                    {horaInicio || "--:--"}
                  </Text>
                  <Feather name="clock" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={estilos.seletorTempo}
                  onPress={() => {
                    setTipoHorario("fim");
                    setModalHorarioVisivel(true);
                  }}
                >
                  <Text style={estilos.labelTempo}>Até</Text>

                  <Text
                    style={
                      horaFim ? estilos.valorTempo : estilos.placeholderTempo
                    }
                  >
                    {horaFim || "--:--"}
                  </Text>
                  <Feather name="clock" size={16} color="#999" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={estilos.botaoAcaoSecundaria}
                onPress={adicionarDisponibilidade}
              >
                <Feather
                  name="plus-circle"
                  size={16}
                  color="#0057B8"
                  style={{ marginRight: 6 }}
                />
                <Text style={estilos.textoAcaoSecundaria}>
                  Adicionar Horário na Agenda
                </Text>
              </TouchableOpacity>

              {disponibilidades.length > 0 && (
                <View style={estilos.blocoSeparador}>
                  <Text style={estilos.tituloConfig}>Horários Salvos</Text>
                  <Text style={estilos.subtituloConfig}>
                    Os alunos poderão agendar aulas nestes intervalos.
                  </Text>

                  {disponibilidades.map((disp, i) => (
                    <View key={i} style={estilos.cardItemAdicionado}>
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View style={estilos.bulletCalendario}>
                          <Feather name="calendar" size={14} color="#FF6B1A" />
                        </View>
                        <View>
                          <Text style={estilos.tituloItemAdicionado}>
                            {disp.diaSemana}
                          </Text>
                          <Text style={estilos.subtituloItemAdicionado}>
                            {disp.horaInicio.substring(0, 5)} às{" "}
                            {disp.horaFim.substring(0, 5)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => removerDisponibilidade(i)}
                        style={estilos.botaoRemoverIco}
                      >
                        <Feather name="trash-2" size={18} color="#D93838" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ marginTop: 10 }}>
                <BotaoCustomizado
                  text="Salvar Perfil de Professor"
                  aoClicar={salvarPerfilProfessor}
                  carregando={salvandoProf}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* MODAL TIME PICKER (SELEÇÃO DE HORAS) */}
        <Modal transparent visible={modalHorarioVisivel} animationType="slide">
          <View style={estilos.modalOverlay}>
            <View
              style={[estilos.modalCard, { padding: 0, paddingBottom: 20 }]}
            >
              <View style={estilos.modalHeaderHorario}>
                <Text style={estilos.modalTituloHorario}>
                  {tipoHorario === "inicio"
                    ? "Selecione o início"
                    : "Selecione o término"}
                </Text>
                <TouchableOpacity onPress={() => setModalHorarioVisivel(false)}>
                  <Feather name="x" size={24} color="#111" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300, width: "100%" }}>
                {HORARIOS_LISTA.map((hora) => (
                  <TouchableOpacity
                    key={hora}
                    style={estilos.itemListaHorario}
                    onPress={() => processarSelecaoHorario(hora)}
                  >
                    <Text style={estilos.textoItemListaHorario}>{hora}</Text>
                    <Feather name="chevron-right" size={16} color="#CCC" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL DE LOGOUT SEGURO */}
        <Modal transparent visible={mostrarConfirmLogout} animationType="fade">
          <View style={estilos.modalOverlay}>
            <View style={estilos.modalCard}>
              <Text style={estilos.modalTituloLogout}>Sair da Conta</Text>
              <Text style={estilos.modalTextoLogout}>
                Tem certeza de que deseja encerrar a sua sessão neste
                dispositivo?
              </Text>
              <View style={estilos.modalBotoes}>
                <TouchableOpacity
                  style={[estilos.modalBotao, estilos.modalBotaoCancelar]}
                  onPress={() => setMostrarConfirmLogout(false)}
                >
                  <Text style={estilos.modalTextoBotaoCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[estilos.modalBotao, estilos.modalBotaoConfirmar]}
                  onPress={handleLogout}
                >
                  <Text style={estilos.modalTextoBotaoSair}>Sim, Sair</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==========================================
// 5. ESTILOS LOCAIS (STYLESHEET PREMIUM)
// ==========================================
const estilos = StyleSheet.create({
  telaCarregamento: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  telaGeral: { flex: 1, backgroundColor: "#FFF" },

  headerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tituloHeader: { fontSize: 18, fontWeight: "bold", color: "#111" },

  conteudoScroll: { padding: 20, paddingBottom: 60 },

  // Avatar e Identidade
  containerIdentidade: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10,
  },
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatarCirculo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E1F0FF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  avatarLetra: { fontSize: 36, fontWeight: "bold", color: "#0057B8" },
  iconeEdicaoFoto: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B1A",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  nomeDestaque: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.5,
  },
  emailDestaque: { fontSize: 14, color: "#666", marginTop: 4 },

  // Acordeões
  cartaoAcordeao: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  cabecalhoAcordeao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    backgroundColor: "#F8F9FA",
  },
  tituloSessao: { fontSize: 16, fontWeight: "700", color: "#111" },
  conteudoAcordeao: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  labelInput: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
    marginLeft: 4,
  },

  inputBloqueadoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6F7",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  textoInputBloqueado: { flex: 1, fontSize: 15, color: "#777" },

  // Segmented Control
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  segmentTabAtiva: {
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentTexto: { fontSize: 14, fontWeight: "600", color: "#777" },
  segmentTextoAtivo: { color: "#111", fontWeight: "700" },

  // Blocos
  blocoConfiguracoes: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  blocoSeparador: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  }, // 🟢 Novo bloco para isolar listagens

  tituloConfig: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 4,
  },
  subtituloConfig: { fontSize: 13, color: "#666", marginBottom: 16 },

  textAreaContainer: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
  },
  textArea: { fontSize: 15, color: "#333", textAlignVertical: "top", flex: 1 },

  // Buscas
  buscaContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputBuscaAptidao: { flex: 1, fontSize: 15, marginLeft: 10, color: "#111" },
  listaResultados: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -4,
    elevation: 2,
    zIndex: 10,
  },
  itemResultado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  textoResultado: { fontSize: 14, fontWeight: "500", color: "#333" },

  containerTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 15,
    marginBottom: 10,
  },
  chipTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B1A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  textoChip: { color: "#FFF", fontSize: 13, fontWeight: "bold" },

  miniFormAptidao: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    marginTop: 15,
    marginBottom: 10,
  },
  textoDestaqueAptidao: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0057B8",
    marginBottom: 14,
  },
  botoesNivel: { flexDirection: "row", gap: 8, marginBottom: 16 },
  botaoNivel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  botaoNivelAtivo: { backgroundColor: "#0057B8", borderColor: "#0057B8" },
  textoNivel: { fontSize: 12, fontWeight: "600", color: "#555" },
  textoNivelAtivo: { color: "#FFF" },

  botaoAcaoRapida: {
    backgroundColor: "#008A46",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  textoAcaoRapida: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  botaoCancelarAptidao: {
    backgroundColor: "#EAEAEA",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  textoCancelarAptidao: { color: "#555", fontWeight: "bold", fontSize: 14 },

  botaoAcaoSecundaria: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 15,
  },
  textoAcaoSecundaria: { color: "#0057B8", fontWeight: "bold", fontSize: 14 },

  cardItemAdicionado: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  tituloItemAdicionado: { fontSize: 15, fontWeight: "700", color: "#111" },
  subtituloItemAdicionado: { fontSize: 13, color: "#666", marginTop: 2 },
  botaoRemoverIco: { padding: 8, backgroundColor: "#FFF0F0", borderRadius: 8 },
  bulletCalendario: { padding: 8, backgroundColor: "#FFF0E7", borderRadius: 8 },

  tagDia: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  tagDiaAtiva: { backgroundColor: "#0057B8", borderColor: "#0057B8" },
  textoDia: { fontWeight: "600", color: "#555" },
  textoDiaAtivo: { color: "#FFF" },

  // Seletor de Tempo
  seletorTempo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  labelTempo: { fontSize: 12, color: "#888", marginRight: 8 },
  valorTempo: { flex: 1, fontSize: 15, color: "#111", fontWeight: "600" },
  placeholderTempo: { flex: 1, fontSize: 15, color: "#A6ACAF" },

  // Modal Time Picker
  modalHeaderHorario: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    width: "100%",
  },
  modalTituloHorario: { fontSize: 18, fontWeight: "bold", color: "#111" },
  itemListaHorario: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
    width: "100%",
  },
  textoItemListaHorario: { fontSize: 16, fontWeight: "500", color: "#333" },

  // Modal Logout Seguro
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 10,
  },
  modalTituloLogout: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 10,
  },
  modalTextoLogout: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalBotoes: { flexDirection: "row", gap: 12, width: "100%" },
  modalBotao: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBotaoCancelar: { backgroundColor: "#F0F0F0" },
  modalBotaoConfirmar: { backgroundColor: "#D93838" },
  modalTextoBotaoCancelar: { color: "#444", fontWeight: "700", fontSize: 15 },
  modalTextoBotaoSair: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
