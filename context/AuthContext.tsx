/**
 * @file AuthContext.tsx
 * @description Provedor de Contexto Global de Autenticação e Sessão (AuthContext).
 * Gerencia a sincronização simultânea entre a memória de curto prazo (RAM) e o armazenamento local persistente (AsyncStorage).
 * Rastreabilidade: Fase 3 (Auth & RBAC) - f3-t11
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../config/api";

/** Definindo a tipagem estrita para o formato dos dados que o contexto distribuirá globalmente */
interface AuthContextData {
  usuarioId: string | null;
  perfilAtivo: string;
  nomeUsuario: string;
  token: string | null;
  refreshToken: string | null;
  carregandoAuth: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  apiDisponivel: boolean;
  ativarModoDemo: () => void;
  alternarPerfilGlobal: (novoPerfil: string) => Promise<void>;
  loginGlobal: (
    id: string,
    perfil: string,
    nome: string,
    token?: string,
    refreshToken?: string
  ) => Promise<void>;
  logoutGlobal: () => Promise<void>;
}

/** Criação do contexto com valor inicial indefinido */
const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [perfilAtivo, setPerfilAtivo] = useState<string>("Aluno");
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [apiDisponivel, setApiDisponivel] = useState<boolean>(true);

  const ativarModoDemo = () => {
    setIsDemoMode(true);
    setUsuarioId("demo-aluno-1");
    setNomeUsuario("Usuário Demonstração");
    setPerfilAtivo("Aluno");
  };

  /**
   * Efeito colateral inicializador que roda automaticamente ao abrir o aplicativo.
   * Verifica se há resíduos de sessão persistidos no armazenamento do celular
   * ou se a tela foi solicitada em modo de demonstração/visualização.
   */
  useEffect(() => {
    const carregarSessaoPersistida = async () => {
      // 1. Detecção não-bloqueante de modo de visualização (URL param ?demo=true ou preview no AI Studio)
      const urlSolicitaDemo =
        typeof window !== "undefined" &&
        (window.location.search.includes("demo=true") ||
          window.location.search.includes("preview=true") ||
          window.location.protocol === "https:");

      // 1.1 Detecção de persona via URL (?persona=professor ou ?perfil=professor)
      const urlParamLower = typeof window !== "undefined" ? window.location.search.toLowerCase() : "";
      const solicitaProfessorUrl =
        urlParamLower.includes("persona=professor") ||
        urlParamLower.includes("perfil=professor");
      const solicitaAlunoUrl =
        urlParamLower.includes("persona=aluno") ||
        urlParamLower.includes("perfil=aluno");

      // 2. Sondagem de integridade da API backend em background não-bloqueante (nunca trava a tela)
      if (typeof window !== "undefined" && window.location.protocol !== "https:") {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          fetch(`${API_URL}/api/v1/health`, { method: "GET", signal: controller.signal })
            .then((res) => {
              clearTimeout(timeoutId);
              setApiDisponivel(res.ok);
            })
            .catch(() => setApiDisponivel(false));
        } catch {
          setApiDisponivel(false);
        }
      } else {
        setApiDisponivel(false);
      }

      try {
        const [idSalvo, perfilSalvo, nomeSalvo, tokenSalvo, refreshSalvo] =
          await Promise.all([
            AsyncStorage.getItem("@orienta_usuario_id"),
            AsyncStorage.getItem("@orienta_perfil"),
            AsyncStorage.getItem("@orienta_nome_usuario"),
            AsyncStorage.getItem("@orienta_token"),
            AsyncStorage.getItem("@orienta_refresh_token"),
          ]);

        if (idSalvo) {
          setUsuarioId(idSalvo);
        } else if (urlSolicitaDemo) {
          // Ativa sessão de demonstração imediata para navegação fluida
          setIsDemoMode(true);
          setUsuarioId("demo-aluno-1");
        }

        // Precedência de perfil: URL explícita > Storage persistido > Padrão Aluno
        if (solicitaProfessorUrl) {
          setPerfilAtivo("Professor");
          setNomeUsuario(nomeSalvo || "Prof. Lucas Rocha");
          await AsyncStorage.setItem("@orienta_perfil", "Professor");
        } else if (solicitaAlunoUrl) {
          setPerfilAtivo("Aluno");
          setNomeUsuario(nomeSalvo || "Jorbson");
          await AsyncStorage.setItem("@orienta_perfil", "Aluno");
        } else if (perfilSalvo) {
          setPerfilAtivo(perfilSalvo);
          if (nomeSalvo) setNomeUsuario(nomeSalvo);
        } else {
          setPerfilAtivo("Aluno");
          setNomeUsuario(nomeSalvo || "Jorbson");
        }

        if (tokenSalvo) setToken(tokenSalvo);
        if (refreshSalvo) setRefreshToken(refreshSalvo);
      } catch (error) {
        console.error("Erro ao ler dados do AsyncStorage no bootstrap:", error);
      } finally {
        setCarregandoAuth(false);
      }
    };

    carregarSessaoPersistida();

    // Listener para troca em tempo real de perfil via postMessage vindo da bancada do preview
    const handleMensagemBancada = (event: MessageEvent) => {
      if (event.data && event.data.type === "ORIENTA_SET_PERFIL" && typeof event.data.perfil === "string") {
        const novoPerfilNormalizado = event.data.perfil.toLowerCase() === "professor" ? "Professor" : "Aluno";
        setPerfilAtivo(novoPerfilNormalizado);
        setNomeUsuario(novoPerfilNormalizado === "Professor" ? "Prof. Lucas Rocha" : "Jorbson");
        AsyncStorage.setItem("@orienta_perfil", novoPerfilNormalizado).catch(() => {});
      }
    };

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("message", handleMensagemBancada);
      return () => window.removeEventListener("message", handleMensagemBancada);
    }
  }, []);

  /**
   * Altera instantaneamente a persona do usuário logado (Chaveador Aluno x Professor).
   * @param {string} novoPerfil - O nome do novo perfil ("Aluno" ou "Professor")
   */
  const _alternarPerfilGlobal = async (novoPerfil: string) => {
    const normalizado = novoPerfil.toLowerCase() === "professor" ? "Professor" : "Aluno";
    setPerfilAtivo(normalizado);
    setNomeUsuario(normalizado === "Professor" ? "Prof. Lucas Rocha" : "Jorbson");
    await AsyncStorage.setItem("@orienta_perfil", normalizado);
  };

  /**
   * Registra a sessão do usuário logado na RAM e no armazenamento físico.
   * Suporta tanto logins legados quanto autenticação JWT com tokens.
   */
  const _loginGlobal = async (
    id: string,
    perfil: string,
    nome: string,
    novoToken?: string,
    novoRefreshToken?: string
  ) => {
    setUsuarioId(id);
    setPerfilAtivo(perfil);
    setNomeUsuario(nome);

    const promises: Promise<void>[] = [
      AsyncStorage.setItem("@orienta_usuario_id", id),
      AsyncStorage.setItem("@orienta_perfil", perfil),
      AsyncStorage.setItem("@orienta_nome_usuario", nome),
    ];

    if (novoToken) {
      setToken(novoToken);
      promises.push(AsyncStorage.setItem("@orienta_token", novoToken));
    }
    if (novoRefreshToken) {
      setRefreshToken(novoRefreshToken);
      promises.push(
        AsyncStorage.setItem("@orienta_refresh_token", novoRefreshToken)
      );
    }

    await Promise.all(promises);
  };

  /**
   * Executa o logout completo, tentando revogar o token no servidor e limpando o armazenamento local.
   */
  const _logoutGlobal = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } catch {
      // Ignora erro de rede em logout
    }

    setUsuarioId(null);
    setPerfilAtivo("Aluno");
    setNomeUsuario("");
    setToken(null);
    setRefreshToken(null);

    await AsyncStorage.multiRemove([
      "@orienta_usuario_id",
      "@orienta_perfil",
      "@orienta_nome_usuario",
      "@orienta_token",
      "@orienta_refresh_token",
    ]);
  };

  return (
    <AuthContext.Provider
      value={{
        usuarioId,
        perfilAtivo,
        nomeUsuario,
        token,
        refreshToken,
        carregandoAuth,
        isAuthenticated: !!token || !!usuarioId,
        isDemoMode,
        apiDisponivel,
        ativarModoDemo,
        alternarPerfilGlobal: _alternarPerfilGlobal,
        loginGlobal: _loginGlobal,
        logoutGlobal: _logoutGlobal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** Hook customizado para simplificar o consumo do Contexto ao longo do projeto */
export const useAuth = () => {
  const contexto = useContext(AuthContext);
  if (!contexto)
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  return contexto;
};
