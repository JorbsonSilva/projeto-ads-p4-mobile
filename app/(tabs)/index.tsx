/**
 * @file index.tsx
 * @description Controlador Principal da Tela Home (Hub Central de Navegação).
 * Gerencia o estado de autenticação inicial e chaveia dinamicamente a renderização
 * entre a Dashboard do Professor e a Linha do Tempo/Feed do Aluno.
 * 🟢 AJUSTE: A seção de aulas do professor agora funciona como "Agenda do Dia", exibindo
 * estritamente as mentorias confirmadas para a data atual, otimizando o foco operacional.
 */

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Importações de Configurações Globais e Contexto de Sessão
import BannerCallToAction from "../../components/BannerCallToAction";
import BarraBusca from "../../components/BarraBusca";
import BotaoRapido from "../../components/BotaoRapido";
import CabecalhoBoasVindas from "../../components/CabecalhoBoasVindas";
import CardAula from "../../components/CardAula";
import CardCategoria from "../../components/CardCategoria";
import CardProfessor from "../../components/CardProfessor";
import ResumoProfessor from "../../components/ResumoProfessor";
import SectionTitle from "../../components/SectionTitle";
import { API_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

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
  fotoUrl?: string;
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
  data: string; // Formato do banco: YYYY-MM-DD
  hora: string; // Formato do banco: HH:MM:SS
  status: string; // PENDENTE, CONFIRMADO, CANCELADO
  aluno?: AlunoVinculado;
}

// ==========================================
// 2. COMPONENTE PRINCIPAL (HUB CHAVEADOR)
// ==========================================

export default function Index() {
  const { perfilAtivo, nomeUsuario, carregandoAuth } = useAuth() as any;

  if (carregandoAuth) {
    return (
      <View style={estilos.telaCarregamento}>
        <ActivityIndicator size="large" color="#FF6B1A" />
      </View>
    );
  }

  return perfilAtivo === "Professor" ? (
    <HomeProfessor nome={nomeUsuario} />
  ) : (
    <HomeAluno nome={nomeUsuario} />
  );
}

// ==========================================
// 3. SUBVISÃO: DASHBOARD DO ALUNO
// ==========================================

function HomeAluno({ nome }: { nome: string }) {
  const { usuarioId } = useAuth() as any;
  const [categorias, setCategorias] = useState<Saber[]>([]);
  const [interessesAluno, setInteressesAluno] = useState<Saber[]>([]);
  const [professoresDestaque, setProfessoresDestaque] = useState<
    ProfessorDestaque[]
  >([]);
  const [carregandoDados, setCarregandoDados] = useState(false);

  const buscarDadosAluno = useCallback(async () => {
    if (!usuarioId) return;
    setCarregandoDados(true);

    try {
      const resAluno = await fetch(`${API_URL}/api/usuarios/${usuarioId}`);
      if (resAluno.ok) {
        const dadosAluno: DadosAluno = await resAluno.json();
        if (dadosAluno.interesses && dadosAluno.interesses.length > 0) {
          const saberesExtraidos = dadosAluno.interesses.map(
            (item) => item.saber,
          );
          setInteressesAluno(saberesExtraidos);
        } else {
          setInteressesAluno([]);
        }
      }

      const resSaberes = await fetch(`${API_URL}/api/saberes`);
      if (resSaberes.ok) {
        const dadosSaberes: Saber[] = await resSaberes.json();
        setCategorias(dadosSaberes);
      }

      const resProfs = await fetch(
        `${API_URL}/api/usuarios/professores/destaque/${usuarioId}`,
      );
      if (resProfs.ok) {
        const dadosProfs: ProfessorDestaque[] = await resProfs.json();
        setProfessoresDestaque(dadosProfs);
      }
    } catch (error) {
      console.error(
        "Falha crônica na carga de dados do feed do aluno: ",
        error,
      );
    } finally {
      setCarregandoDados(false);
    }
  }, [usuarioId]);

  useFocusEffect(
    useCallback(() => {
      buscarDadosAluno();
    }, [buscarDadosAluno]),
  );

  const temInteresses = interessesAluno.length > 0;
  const listaExibicaoCategorias = temInteresses
    ? interessesAluno
    : categorias.slice(0, 3);
  const tituloSecaoCategorias = temInteresses
    ? "Seus interesses"
    : "Disciplinas disponíveis";

  return (
    <View style={estilos.telaGeral}>
      <ScrollView
        style={estilos.telaGeral}
        contentContainerStyle={estilos.conteudoScroll}
        showsVerticalScrollIndicator={false}
      >
        <CabecalhoBoasVindas
          nome={nome}
          fraseInicio="Encontre o professor ideal e "
          palavraDestaque="avance"
          fraseFim=" nos seus estudos."
          onNotificationPress={() => console.log("Abriu central de avisos")}
        />

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => router.push("/busca-professores")}
        >
          <View pointerEvents="none">
            <BarraBusca
              valor=""
              aoMudarTexto={() => {}}
              placeholder="Buscar professores ou matérias..."
              exibirFiltro={false}
            />
          </View>
        </TouchableOpacity>

        <BannerCallToAction
          tituloLinha1="Aprenda com quem"
          palavraDestaque="entende do assunto."
          subtitulo="Mentorias personalizadas para te ajudar a chegar mais longe."
          textoBotao="Explorar professores"
          iconeDestaque="school"
          onPress={() => router.push("/busca-professores")}
        />

        <SectionTitle
          titulo={tituloSecaoCategorias}
          onPressLink={() => router.push("/explorar-disciplinas")}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.carrosselInteressesContainer}
        >
          {listaExibicaoCategorias.length > 0 ? (
            listaExibicaoCategorias.map((item) => (
              <CardCategoria
                key={item.id}
                nome={item.nome}
                onPress={() =>
                  router.push({
                    pathname: "/busca-professores",
                    params: { categoria: item.nome },
                  })
                }
              />
            ))
          ) : (
            <Text style={estilos.textoVazio}>
              {carregandoDados
                ? "Sincronizando matérias..."
                : "Nenhuma disciplina listada."}
            </Text>
          )}
        </ScrollView>

        <SectionTitle titulo="Professores em destaque" />

        <View style={{ width: "100%" }}>
          {carregandoDados ? (
            <ActivityIndicator
              size="large"
              color="#FF6B1A"
              style={{ marginTop: 24, marginBottom: 16 }}
            />
          ) : professoresDestaque.length > 0 ? (
            professoresDestaque.slice(0, 5).map((prof) => {
              const primeiraMateria =
                prof.aptidoes && prof.aptidoes.length > 0
                  ? prof.aptidoes[0].saber.nome
                  : "Mentor Disponível";
              const precoHoraDefinido =
                prof.aptidoes && prof.aptidoes.length > 0
                  ? prof.aptidoes[0].precoHora
                  : 0.0;

              return (
                <CardProfessor
                  key={prof.id}
                  nome={prof.nome}
                  materia={primeiraMateria}
                  nota={prof.notaMedia || 5.0}
                  avaliacoes={prof.totalAvaliacoes || 0}
                  precoHora={precoHoraDefinido}
                  fotoUrl={
                    prof.fotoUrl || `https://i.pravatar.cc/150?u=${prof.id}`
                  }
                  onPress={() => router.push(`/professor/${prof.id}`)}
                  onPressFavorito={() =>
                    console.log("Sinalizou favorito para id: ", prof.id)
                  }
                />
              );
            })
          ) : (
            <Text style={estilos.textoVazio}>
              Nenhum mentor encontrado para os filtros selecionados.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ==========================================
// 4. SUBVISÃO: DASHBOARD DO PROFESSOR
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
        const dados: Agendamento[] = await res.json();
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
    }, [buscarAulasProfessor]),
  );

  // =========================================================
  // 🟢 LÓGICA DE NEGÓCIO: AGENDA DO DIA (AULAS CONFIRMADAS HOJE)
  // =========================================================
  const hoje = new Date();
  const anoAtualStr = String(hoje.getFullYear());
  const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, "0");
  const diaAtualStr = String(hoje.getDate()).padStart(2, "0");
  const hojeStr = `${anoAtualStr}-${mesAtualStr}-${diaAtualStr}`;

  // Filtra as aulas garantindo que o status seja CONFIRMADO e a data seja EXATAMENTE HOJE
  const aulasHoje = proximasAulas
    .filter((a) => a.status === "CONFIRMADO" && a.data === hojeStr)
    // Ordena pela hora para a aula mais cedo do dia aparecer primeiro
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const solicitacoesPendentes = proximasAulas.filter(
    (a) => a.status === "PENDENTE",
  );
  // O número do card de métricas vai continuar mostrando todas as confirmadas na vida
  const aulasConfirmadasTotal = proximasAulas.filter(
    (a) => a.status === "CONFIRMADO",
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
        { method: "PUT" },
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
        },
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
        <CabecalhoBoasVindas
          nome={nome}
          fraseInicio={"Gerencie suas aulas,\ninspire e "}
          palavraDestaque="transforme vidas."
          onNotificationPress={() =>
            console.log("Módulo de notificações acessado")
          }
        />

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
              icon="clock"
              titulo="Horas"
              valor="0h"
              fundo="#F5EEFF"
            />
          </View>
        </View>

        <Text style={estilos.tituloSecaoRapida}>Acesso rápido</Text>
        <View style={estilos.containerAcessoRapido}>
          <BotaoRapido
            icon="calendar"
            texto="Minha Agenda"
            onPress={() => router.push("/agenda")}
          />
          <BotaoRapido
            icon="users"
            texto="Alunos"
            onPress={() => router.push("/historico-alunos")}
          />
          <BotaoRapido
            icon="message-square"
            texto="Mentorias"
            onPress={() => router.push("/todas-mentorias")}
          />
          <BotaoRapido
            icon="dollar-sign"
            texto="Ganhos"
            onPress={() => router.push("/painel-ganhos")}
          />
        </View>

        <BannerCallToAction
          tituloLinha1="Defina suas aulas"
          tituloLinha2="como pagas ou"
          palavraDestaque="gratuitas"
          subtitulo="Você decide o valor do seu conhecimento."
          textoBotao="Gerenciar aulas"
          iconeDestaque="school"
          onPress={() => router.push("/perfil")}
        />

        <SectionTitle
          titulo="Aulas de hoje"
          onPressLink={() => router.push("/todas-mentorias")}
        />

        <View style={estilos.listaAulasContainer}>
          {carregandoAulas ? (
            <ActivityIndicator
              size="small"
              color="#FF6B1A"
              style={{ padding: 24 }}
            />
          ) : aulasHoje.length > 0 ? (
            aulasHoje.map((aula) => (
              <CardAula
                key={aula.id}
                id={aula.id}
                nome={aula.aluno?.nome || "Estudante"}
                materia="Mentoria Agendada"
                data={aula.data}
                hora={aula.hora.substring(0, 5)}
                status={aula.status}
                foto={`https://i.pravatar.cc/150?u=${aula.aluno?.id || aula.id}`}
                onAceitar={lidarComAceite}
                onRecusar={lidarComRecusa}
              />
            ))
          ) : (
            <Text style={estilos.textoVazioCentralizado}>
              Você não tem nenhuma aula marcada para hoje. Aproveite o seu dia!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Modal de Alerta de Solicitações (Overlay) */}
      <Modal
        visible={modalSolicitacoesVisivel}
        transparent
        animationType="fade"
      >
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCard}>
            <View style={estilos.modalHeader}>
              <Feather name="bell" size={20} color="#FF6B1A" />
              <Text style={estilos.modalTitulo}>Nova Solicitação de Aula!</Text>
            </View>

            <Text style={estilos.modalSubtitulo}>
              Você tem um novo pedido pendente de resposta na sua fila de
              mentoria:
            </Text>

            {primeiraSolicitacao && (
              <View style={estilos.containerDetalhesSolicitacao}>
                <Image
                  source={{
                    uri: `https://i.pravatar.cc/150?u=${primeiraSolicitacao.aluno?.id}`,
                  }}
                  style={estilos.modalAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.modalAlunoNome}>
                    {primeiraSolicitacao.aluno?.nome}
                  </Text>
                  <Text style={estilos.modalDataTexto}>
                    📅 Data: {formatarDataBR(primeiraSolicitacao.data)}
                  </Text>
                  <Text style={estilos.modalDataTexto}>
                    ⏰ Horário: {primeiraSolicitacao.hora.substring(0, 5)}
                  </Text>
                </View>
              </View>
            )}

            <View style={estilos.modalContainerAcoes}>
              <TouchableOpacity
                style={[estilos.modalBotao, { backgroundColor: "#008A46" }]}
                activeOpacity={0.8}
                onPress={() =>
                  primeiraSolicitacao && lidarComAceite(primeiraSolicitacao.id)
                }
              >
                <Feather
                  name="check"
                  size={16}
                  color="#FFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={estilos.modalTextoBotao}>Aceitar Aula</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.modalBotao, { backgroundColor: "#D93838" }]}
                activeOpacity={0.8}
                onPress={() =>
                  primeiraSolicitacao && lidarComRecusa(primeiraSolicitacao.id)
                }
              >
                <Feather
                  name="x"
                  size={16}
                  color="#FFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={estilos.modalTextoBotao}>Recusar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={estilos.modalBotaoVerDepois}
              onPress={() => setAlertasDescartados(true)}
            >
              <Text style={estilos.modalTextoVerDepois}>
                Decidir mais tarde
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper rápido para formatação de data BR no modal
function formatarDataBR(dataEstrangeira: string) {
  const partes = dataEstrangeira.split("-");
  if (partes.length !== 3) return dataEstrangeira;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ==========================================
// 5. DICIONÁRIO DE ESTILOS LOCAIS (STYLESHEET)
// ==========================================

const estilos = StyleSheet.create({
  telaCarregamento: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  telaGeral: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  conteudoScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  textoVazio: {
    color: "#999",
    fontStyle: "italic",
    paddingVertical: 20,
    paddingLeft: 4,
  },
  textoVazioCentralizado: {
    color: "#999",
    fontStyle: "italic",
    padding: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  cardResumoGeral: {
    marginTop: 22,
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
  carrosselInteressesContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
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
    color: "#FF6B1A",
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
});
