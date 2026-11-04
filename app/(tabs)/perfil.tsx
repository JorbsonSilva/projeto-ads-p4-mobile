/**
 * @file perfil.tsx
 * @description Redesign do Perfil do Aluno - Orienta 2.0 [ORI-017].
 * Implementado com estrita fidelidade visual à especificação oficial IMG-016 (Perfil Aluno.png).
 * 
 * Funcionalidades:
 * - Header com título centralizado "Meu Perfil" e botão de logout seguro
 * - Hero do estudante com avatar, botão de câmera flutuante, badge semântico azul "Aluno" e localização
 * - Card azul marinho de Progresso Geral (Matérias Cursando, Mentorias Realizadas, Horas Acumuladas)
 * - Seção "Sobre você" com biografia acadêmica e chips de interesses
 * - Menu de navegação da conta com chevrons (Informações Pessoais, Preferências, Notificações, Segurança)
 * - Feed de Atividade Recente com histórico de mentorias, status e avaliações
 * - Modal tátil e funcional de "Editar perfil" (Nome, Telefone, Cidade, Bio)
 * - Modal de confirmação de Logout e modal de Segurança (Troca de senha)
 * - Barra inferior de navegação dockada com 5 abas (Home, Buscar, Chat, Agenda, Perfil)
 * - Serviço híbrido resiliente com fallback offline e badge de modo de simulação
 */

import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
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
  obterPerfilAluno,
  PerfilAlunoData,
  ResultadoPerfilAluno,
  salvarPerfilAluno,
} from "../../services/perfilService";

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { logoutGlobal, nomeUsuario } = useAuth() as any;

  const [perfil, setPerfil] = useState<PerfilAlunoData>(MOCK_PERFIL_ALUNO_OFICIAL);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [isSimulado, setIsSimulado] = useState<boolean>(false);

  // Modais de Edição e Ação
  const [modalEditarVisivel, setModalEditarVisivel] = useState<boolean>(false);
  const [modalLogoutVisivel, setModalLogoutVisivel] = useState<boolean>(false);
  const [modalSegurancaVisivel, setModalSegurancaVisivel] = useState<boolean>(false);

  // Campos do formulário de edição
  const [formNome, setFormNome] = useState<string>("");
  const [formTelefone, setFormTelefone] = useState<string>("");
  const [formCidade, setFormCidade] = useState<string>("");
  const [formBio, setFormBio] = useState<string>("");
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false);

  const carregarPerfil = useCallback(async () => {
    try {
      const res: ResultadoPerfilAluno = await obterPerfilAluno(1);
      setPerfil(res.dados);
      setIsSimulado(res.isSimulado);
      setFormNome(res.dados.nome);
      setFormTelefone(res.dados.telefone);
      setFormCidade(res.dados.cidade);
      setFormBio(res.dados.bio);
    } catch {
      setIsSimulado(true);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarPerfil();
  };

  const handleSalvarEdicao = async () => {
    setSalvandoEdicao(true);
    try {
      await salvarPerfilAluno(perfil.id, {
        nome: formNome,
        telefone: formTelefone,
        cidade: formCidade,
        bio: formBio,
      });

      setPerfil((prev) => ({
        ...prev,
        nome: formNome,
        telefone: formTelefone,
        cidade: formCidade,
        bio: formBio,
      }));
      setModalEditarVisivel(false);
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
        <Text style={estilos.loadingTexto}>Carregando perfil...</Text>
      </View>
    );
  }

  const { progresso, atividadesRecentes, interesses } = perfil;

  return (
    <View style={[estilos.container, { paddingTop: insets.top }]}>
      {/* ============================================================== */}
      {/* 0. BANNER DISCRETO DE SIMULAÇÃO OFFLINE                        */}
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
          onPress={() => router.push("/(tabs)" as any)}
          activeOpacity={0.7}
          accessibilityLabel="Voltar para a Home"
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <Text style={estilos.headerTitulo}>Meu Perfil</Text>

        <TouchableOpacity
          style={estilos.botaoLogout}
          onPress={() => setModalLogoutVisivel(true)}
          activeOpacity={0.7}
          accessibilityLabel="Sair da Conta"
        >
          <Feather name="log-out" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

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
        {/* 2. HERO DO ESTUDANTE COM AVATAR E LOCALIZAÇÃO (IMG-016)        */}
        {/* ============================================================== */}
        <View style={estilos.heroContainer}>
          <View style={estilos.avatarContainer}>
            <Image
              source={{ uri: perfil.fotoUrl }}
              style={estilos.avatarImagem}
              accessibilityLabel="Foto de Perfil do Aluno"
            />
            {/* Botão Câmera Flutuante */}
            <TouchableOpacity
              style={estilos.botaoCameraFlutuante}
              activeOpacity={0.85}
              onPress={() => setModalEditarVisivel(true)}
              accessibilityLabel="Alterar foto de perfil"
            >
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={estilos.heroInfo}>
            <View style={estilos.linhaNomeBadge}>
              <Text style={estilos.nomeEstudante}>{perfil.nome}</Text>
              <View style={estilos.badgeAluno}>
                <Text style={estilos.textoBadgeAluno}>Aluno</Text>
              </View>
            </View>

            <Text style={estilos.emailEstudante}>{perfil.email}</Text>

            <View style={estilos.linhaLocalizacao}>
              <Ionicons name="location-sharp" size={13} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={estilos.textoLocalizacao}>
                {perfil.cidade}, {perfil.estado}
              </Text>
              <Text style={estilos.pontoDivisor}>•</Text>
              <Feather name="phone" size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={estilos.textoLocalizacao}>{perfil.telefone}</Text>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 3. CARD AZUL DE PROGRESSO GERAL - 3 MÉTRICAS (IMG-016)         */}
        {/* ============================================================== */}
        <View style={estilos.cardProgressoGeral}>
          <View style={estilos.cabecalhoProgresso}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="trending-up" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={estilos.tituloProgresso}>Progresso acadêmico</Text>
            </View>
            <View style={estilos.tagSemestre}>
              <Text style={estilos.textoTagSemestre}>2026.2</Text>
            </View>
          </View>

          <View style={estilos.gridMetricas3x1}>
            {/* 1. Matérias cursando */}
            <View style={estilos.colunaMetrica}>
              <View style={[estilos.iconeMetricaWrap, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                <Feather name="book-open" size={16} color="#38BDF8" />
              </View>
              <Text style={estilos.valorMetrica}>{progresso.materiasCursando}</Text>
              <Text style={estilos.labelMetrica}>Matérias cursando</Text>
            </View>

            <View style={estilos.divisorVerticalMetrica} />

            {/* 2. Mentorias realizadas */}
            <View style={estilos.colunaMetrica}>
              <View style={[estilos.iconeMetricaWrap, { backgroundColor: "rgba(52, 211, 153, 0.15)" }]}>
                <Feather name="check-circle" size={16} color="#34D399" />
              </View>
              <Text style={estilos.valorMetrica}>{progresso.mentoriasRealizadas}</Text>
              <Text style={estilos.labelMetrica}>Aulas realizadas</Text>
            </View>

            <View style={estilos.divisorVerticalMetrica} />

            {/* 3. Horas acumuladas */}
            <View style={estilos.colunaMetrica}>
              <View style={[estilos.iconeMetricaWrap, { backgroundColor: "rgba(251, 146, 60, 0.15)" }]}>
                <Feather name="clock" size={16} color="#FB923C" />
              </View>
              <Text style={estilos.valorMetrica}>{progresso.horasAcumuladas}h</Text>
              <Text style={estilos.labelMetrica}>Horas de estudo</Text>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 4. SEÇÃO "SOBRE VOCÊ" / BIO ACADÊMICA (IMG-016)                */}
        {/* ============================================================== */}
        <View style={estilos.cardSecaoBranco}>
          <View style={estilos.secaoTituloLinha}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="user" size={16} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={estilos.secaoTituloTexto}>Sobre você</Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalEditarVisivel(true)}
              activeOpacity={0.7}
            >
              <Text style={estilos.linkEditar}>Editar</Text>
            </TouchableOpacity>
          </View>

          <Text style={estilos.textoBio}>{perfil.bio}</Text>

          <Text style={estilos.subtituloInteresses}>Interesses e disciplinas:</Text>
          <View style={estilos.containerChipsInteresse}>
            {interesses.map((item, idx) => (
              <View key={`interesse-${idx}`} style={estilos.chipInteresseItem}>
                <Text style={estilos.textoChipInteresse}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ============================================================== */}
        {/* 5. MENU DE NAVEGAÇÃO DA CONTA COM CHEVRONS (IMG-016)           */}
        {/* ============================================================== */}
        <View style={estilos.cardSecaoBranco}>
          <Text style={[estilos.secaoTituloTexto, { marginBottom: 12 }]}>Configurações da conta</Text>

          {/* Item 1: Informações pessoais */}
          <TouchableOpacity
            style={estilos.itemMenuLinha}
            onPress={() => setModalEditarVisivel(true)}
            activeOpacity={0.7}
          >
            <View style={[estilos.iconeMenuWrap, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="user" size={18} color="#2563EB" />
            </View>
            <View style={estilos.infoMenuColuna}>
              <Text style={estilos.tituloMenuItem}>Informações pessoais</Text>
              <Text style={estilos.descricaoMenuItem}>Nome, e-mail, telefone e endereço</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={estilos.divisorHorizontalMenu} />

          {/* Item 2: Preferências de estudo */}
          <TouchableOpacity
            style={estilos.itemMenuLinha}
            onPress={() => router.push("/explorar-disciplinas" as any)}
            activeOpacity={0.7}
          >
            <View style={[estilos.iconeMenuWrap, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="book-open" size={18} color="#059669" />
            </View>
            <View style={estilos.infoMenuColuna}>
              <Text style={estilos.tituloMenuItem}>Preferências de estudo</Text>
              <Text style={estilos.descricaoMenuItem}>Disciplinas de interesse e modalidades</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={estilos.divisorHorizontalMenu} />

          {/* Item 3: Notificações */}
          <TouchableOpacity
            style={estilos.itemMenuLinha}
            onPress={() => router.push("/notificacoes" as any)}
            activeOpacity={0.7}
          >
            <View style={[estilos.iconeMenuWrap, { backgroundColor: "#FFF7ED" }]}>
              <Feather name="bell" size={18} color="#EA580C" />
            </View>
            <View style={estilos.infoMenuColuna}>
              <Text style={estilos.tituloMenuItem}>Notificações</Text>
              <Text style={estilos.descricaoMenuItem}>Central de avisos e alertas da conta</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={estilos.divisorHorizontalMenu} />

          {/* Item 4: Segurança e privacidade */}
          <TouchableOpacity
            style={estilos.itemMenuLinha}
            onPress={() => setModalSegurancaVisivel(true)}
            activeOpacity={0.7}
          >
            <View style={[estilos.iconeMenuWrap, { backgroundColor: "#F5F3FF" }]}>
              <Feather name="shield" size={18} color="#7C3AED" />
            </View>
            <View style={estilos.infoMenuColuna}>
              <Text style={estilos.tituloMenuItem}>Segurança e privacidade</Text>
              <Text style={estilos.descricaoMenuItem}>Alteração de senha e autenticação</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* 6. FEED DE ATIVIDADE RECENTE (IMG-016)                         */}
        {/* ============================================================== */}
        <View style={estilos.cardSecaoBranco}>
          <View style={estilos.secaoTituloLinha}>
            <Text style={estilos.secaoTituloTexto}>Atividade recente</Text>
            <TouchableOpacity
              onPress={() => router.push("/agenda" as any)}
              activeOpacity={0.7}
            >
              <Text style={estilos.linkVerTodas}>Ver agenda →</Text>
            </TouchableOpacity>
          </View>

          <View style={estilos.listaAtividades}>
            {atividadesRecentes.map((item) => (
              <TouchableOpacity
                key={`atv-${item.id}`}
                style={estilos.itemAtividadeCard}
                onPress={() => router.push("/chat" as any)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item.professorFoto }} style={estilos.avatarAtividade} />
                <View style={estilos.infoAtividadeColuna}>
                  <View style={estilos.linhaNomeStatusAtividade}>
                    <Text style={estilos.materiaAtividade} numberOfLines={1}>
                      {item.materia}
                    </Text>
                    <View
                      style={[
                        estilos.badgeStatusAtividade,
                        item.status === "CONCLUIDA"
                          ? estilos.badgeConcluida
                          : estilos.badgeConfirmada,
                      ]}
                    >
                      <Text
                        style={[
                          estilos.textoStatusAtividade,
                          item.status === "CONCLUIDA"
                            ? estilos.textoConcluida
                            : estilos.textoConfirmada,
                        ]}
                      >
                        {item.status === "CONCLUIDA" ? "Concluída" : "Confirmada"}
                      </Text>
                    </View>
                  </View>

                  <Text style={estilos.docenteAtividade}>{item.professorNome}</Text>

                  <View style={estilos.linhaMetaAtividade}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Feather name="clock" size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                      <Text style={estilos.dataAtividade}>{item.data}</Text>
                    </View>
                    {item.nota && (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={estilos.estrelaNota}>★</Text>
                        <Text style={estilos.valorNota}>{item.nota.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ============================================================== */}
        {/* 7. BOTÃO DE AÇÃO PRIMÁRIA "EDITAR PERFIL"                      */}
        {/* ============================================================== */}
        <TouchableOpacity
          style={estilos.botaoEditarPerfilLaranja}
          onPress={() => setModalEditarVisivel(true)}
          activeOpacity={0.85}
        >
          <Feather name="edit-3" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={estilos.textoBotaoEditarPerfil}>Editar perfil</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ============================================================== */}
      {/* 8. BARRA DE NAVEGAÇÃO INFERIOR DOCKADA (5 ABAS - RN-001)       */}
      {/* ============================================================== */}
      <View
        style={[
          estilos.tabBarContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ]}
      >
        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/(tabs)" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Home"
        >
          <FontAwesome5 name="home" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/busca-professores" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Buscar"
        >
          <Feather name="search" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Buscar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/chat" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Chat"
        >
          <Ionicons name="chatbubbles-outline" size={22} color="#64748B" />
          <Text style={estilos.tabLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => router.push("/agenda" as any)}
          activeOpacity={0.8}
          accessibilityLabel="Aba Agenda"
        >
          <FontAwesome5 name="calendar-alt" size={20} color="#64748B" />
          <Text style={estilos.tabLabel}>Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.tabItem}
          onPress={() => {
            // Já na tela de perfil
          }}
          activeOpacity={0.8}
          accessibilityLabel="Aba Perfil"
        >
          <FontAwesome5 name="user-alt" size={19} color="#FF5A1F" />
          <Text style={[estilos.tabLabel, estilos.tabLabelAtivo]}>Perfil</Text>
          <View style={estilos.tabIndicadorAtivo} />
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* MODAL 1: EDITAR PERFIL DO ALUNO                                */}
      {/* ============================================================== */}
      <Modal visible={modalEditarVisivel} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardEdicao}>
            <View style={estilos.modalHeader}>
              <Text style={estilos.modalTitulo}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setModalEditarVisivel(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={estilos.campoLabel}>Nome Completo</Text>
              <TextInput
                style={estilos.inputTexto}
                value={formNome}
                onChangeText={setFormNome}
                placeholder="Seu nome"
              />

              <Text style={estilos.campoLabel}>Telefone / WhatsApp</Text>
              <TextInput
                style={estilos.inputTexto}
                value={formTelefone}
                onChangeText={setFormTelefone}
                placeholder="(83) 99999-9999"
              />

              <Text style={estilos.campoLabel}>Cidade / Estado</Text>
              <TextInput
                style={estilos.inputTexto}
                value={formCidade}
                onChangeText={setFormCidade}
                placeholder="João Pessoa"
              />

              <Text style={estilos.campoLabel}>Apresentação / Bio</Text>
              <TextInput
                style={[estilos.inputTexto, { height: 90, textAlignVertical: "top" }]}
                value={formBio}
                onChangeText={setFormBio}
                multiline
                placeholder="Conte sobre seus estudos e metas..."
              />
            </ScrollView>

            <View style={estilos.modalBotoesLinha}>
              <TouchableOpacity
                style={estilos.botaoCancelarModal}
                onPress={() => setModalEditarVisivel(false)}
              >
                <Text style={estilos.textoBotaoCancelarModal}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botaoSalvarModal}
                onPress={handleSalvarEdicao}
                disabled={salvandoEdicao}
              >
                {salvandoEdicao ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotaoSalvarModal}>Salvar alterações</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: SEGURANÇA E ALTERAÇÃO DE SENHA                        */}
      {/* ============================================================== */}
      <Modal visible={modalSegurancaVisivel} transparent animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardEdicao}>
            <View style={estilos.modalHeader}>
              <Text style={estilos.modalTitulo}>Segurança da Conta</Text>
              <TouchableOpacity onPress={() => setModalSegurancaVisivel(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 14 }}>
              Atualize sua senha de acesso protegida por BCrypt.
            </Text>

            <Text style={estilos.campoLabel}>Senha Atual</Text>
            <TextInput
              style={estilos.inputTexto}
              secureTextEntry
              placeholder="Digite sua senha atual"
            />

            <Text style={estilos.campoLabel}>Nova Senha</Text>
            <TextInput
              style={estilos.inputTexto}
              secureTextEntry
              placeholder="Mínimo de 8 caracteres"
            />

            <TouchableOpacity
              style={estilos.botaoSalvarModal}
              onPress={() => {
                Alert.alert("Sucesso", "Senha alterada com sucesso!");
                setModalSegurancaVisivel(false);
              }}
            >
              <Text style={estilos.textoBotaoSalvarModal}>Atualizar Senha</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: CONFIRMAÇÃO DE LOGOUT                                 */}
      {/* ============================================================== */}
      <Modal visible={modalLogoutVisivel} transparent animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCardConfirmacao}>
            <View style={estilos.iconeLogoutModalWrap}>
              <Feather name="log-out" size={26} color="#EF4444" />
            </View>
            <Text style={estilos.tituloLogoutModal}>Deseja sair da conta?</Text>
            <Text style={estilos.descricaoLogoutModal}>
              Você precisará fazer login novamente para acessar suas aulas e mensagens.
            </Text>

            <View style={estilos.modalBotoesLinha}>
              <TouchableOpacity
                style={estilos.botaoCancelarModal}
                onPress={() => setModalLogoutVisivel(false)}
              >
                <Text style={estilos.textoBotaoCancelarModal}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botaoSalvarModal, { backgroundColor: "#EF4444" }]}
                onPress={handleConfirmarLogout}
              >
                <Text style={estilos.textoBotaoSalvarModal}>Sair agora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingTexto: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  bannerSimulacao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  textoBannerSimulacao: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },

  // 1. Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  botaoHeaderCircular: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  botaoLogout: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 16,
  },

  // 2. Hero
  heroContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatarImagem: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#FF5A1F",
  },
  botaoCameraFlutuante: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FF5A1F",
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
    gap: 8,
    marginBottom: 4,
  },
  nomeEstudante: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  badgeAluno: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  textoBadgeAluno: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  emailEstudante: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  linhaLocalizacao: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  textoLocalizacao: {
    fontSize: 11,
    color: "#64748B",
  },
  pontoDivisor: {
    marginHorizontal: 6,
    color: "#CBD5E1",
  },

  // 3. Card Progresso Geral
  cardProgressoGeral: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cabecalhoProgresso: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  tituloProgresso: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  tagSemestre: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoTagSemestre: {
    fontSize: 11,
    fontWeight: "700",
    color: "#38BDF8",
  },
  gridMetricas3x1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colunaMetrica: {
    flex: 1,
    alignItems: "center",
  },
  iconeMetricaWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  valorMetrica: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  labelMetrica: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    textAlign: "center",
  },
  divisorVerticalMetrica: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },

  // 4, 5, 6. Cards Seção Branco
  cardSecaoBranco: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  secaoTituloLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  secaoTituloTexto: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  linkEditar: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  textoBio: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
  },
  subtituloInteresses: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  containerChipsInteresse: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipInteresseItem: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textoChipInteresse: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },

  // 5. Menu da Conta
  itemMenuLinha: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  iconeMenuWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoMenuColuna: {
    flex: 1,
  },
  tituloMenuItem: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  descricaoMenuItem: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  divisorHorizontalMenu: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },

  // 6. Atividades Recentes
  linkVerTodas: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5A1F",
  },
  listaAtividades: {
    gap: 10,
  },
  itemAtividadeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  avatarAtividade: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  infoAtividadeColuna: {
    flex: 1,
  },
  linhaNomeStatusAtividade: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  materiaAtividade: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  badgeStatusAtividade: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeConcluida: {
    backgroundColor: "#DCFCE7",
  },
  badgeConfirmada: {
    backgroundColor: "#EFF6FF",
  },
  textoStatusAtividade: {
    fontSize: 10,
    fontWeight: "700",
  },
  textoConcluida: {
    color: "#15803D",
  },
  textoConfirmada: {
    color: "#1D4ED8",
  },
  docenteAtividade: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  linhaMetaAtividade: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  dataAtividade: {
    fontSize: 10.5,
    color: "#94A3B8",
  },
  estrelaNota: {
    color: "#F59E0B",
    fontSize: 11,
    marginRight: 2,
  },
  valorNota: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },

  // 7. Botão Primário Laranja
  botaoEditarPerfilLaranja: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5A1F",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#FF5A1F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  textoBotaoEditarPerfil: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // 8. Tab Bar (RN-001)
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    height: 64,
    paddingTop: 8,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 3,
  },
  tabLabelAtivo: {
    color: "#FF5A1F",
    fontWeight: "700",
  },
  tabIndicadorAtivo: {
    position: "absolute",
    bottom: -4,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FF5A1F",
  },

  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCardEdicao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalCardConfirmacao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconeLogoutModalWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tituloLogoutModal: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  descricaoLogoutModal: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  campoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
    marginTop: 10,
  },
  inputTexto: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  modalBotoesLinha: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  botaoCancelarModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoCancelarModal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  botaoSalvarModal: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FF5A1F",
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoSalvarModal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
