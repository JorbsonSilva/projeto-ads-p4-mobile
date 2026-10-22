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

  /**
   * Efeito colateral inicializador que roda automaticamente ao abrir o aplicativo.
   * Verifica se há resíduos de sessão persistidos no armazenamento do celular.
   */
  useEffect(() => {
    const carregarSessaoPersistida = async () => {
      try {
        const [idSalvo, perfilSalvo, nomeSalvo, tokenSalvo, refreshSalvo] =
          await Promise.all([
            AsyncStorage.getItem("@orienta_usuario_id"),
            AsyncStorage.getItem("@orienta_perfil"),
            AsyncStorage.getItem("@orienta_nome_usuario"),
            AsyncStorage.getItem("@orienta_token"),
            AsyncStorage.getItem("@orienta_refresh_token"),
          ]);

        if (idSalvo) setUsuarioId(idSalvo);
        if (perfilSalvo) setPerfilAtivo(perfilSalvo);
        if (nomeSalvo) setNomeUsuario(nomeSalvo);
        if (tokenSalvo) setToken(tokenSalvo);
        if (refreshSalvo) setRefreshToken(refreshSalvo);
      } catch (error) {
        console.error(
          "Erro ao ler dados do AsyncStorage no bootstrap do app:",
          error
        );
      } finally {
        setCarregandoAuth(false);
      }
    };

    carregarSessaoPersistida();
  }, []);

  /**
   * Altera instantaneamente a persona do usuário logado (Chaveador Aluno x Professor).
   * @param {string} novoPerfil - O nome do novo perfil ("Aluno" ou "Professor")
   */
  const _alternarPerfilGlobal = async (novoPerfil: string) => {
    setPerfilAtivo(novoPerfil);
    await AsyncStorage.setItem("@orienta_perfil", novoPerfil);
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
