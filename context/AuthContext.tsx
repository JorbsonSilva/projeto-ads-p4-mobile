import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { API_URL, apiFetch } from "../config/api";

interface AuthContextData {
  usuarioId: string | null;
  perfilAtivo: string;
  nomeUsuario: string;
  token: string | null;
  refreshToken: string | null;
  carregandoAuth: boolean;
  isAuthenticated: boolean;
  loginGlobal: (
    id: string,
    perfil: string,
    nome: string,
    token?: string,
    refreshToken?: string
  ) => Promise<void>;
  trocarPerfil: (perfil: string) => Promise<void>;
  logoutGlobal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

function normalizarPerfil(perfil: string): string {
  return perfil.toLowerCase().includes("professor") ? "Professor" : "Aluno";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [perfilAtivo, setPerfilAtivo] = useState<string>("Aluno");
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(true);

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

        if (tokenSalvo && idSalvo) {
          setUsuarioId(idSalvo);
          setPerfilAtivo(perfilSalvo ? normalizarPerfil(perfilSalvo) : "Aluno");
          setNomeUsuario(nomeSalvo || "");
          setToken(tokenSalvo);
          setRefreshToken(refreshSalvo);
        } else {
          await AsyncStorage.multiRemove([
            "@orienta_usuario_id",
            "@orienta_perfil",
            "@orienta_nome_usuario",
            "@orienta_token",
            "@orienta_refresh_token",
          ]);
        }
      } catch (error) {
        console.error("Erro ao restaurar a sessão:", error);
      } finally {
        setCarregandoAuth(false);
      }
    };

    carregarSessaoPersistida();
  }, []);

  const loginGlobal = async (
    id: string,
    perfil: string,
    nome: string,
    novoToken?: string,
    novoRefreshToken?: string
  ) => {
    if (!id || !novoToken) {
      throw new Error("A API não retornou os dados necessários para iniciar a sessão.");
    }

    const perfilNormalizado = normalizarPerfil(perfil);
    setUsuarioId(id);
    setPerfilAtivo(perfilNormalizado);
    setNomeUsuario(nome);
    setToken(novoToken);
    setRefreshToken(novoRefreshToken ?? null);

    const entries: [string, string][] = [
      ["@orienta_usuario_id", id],
      ["@orienta_perfil", perfilNormalizado],
      ["@orienta_nome_usuario", nome],
      ["@orienta_token", novoToken],
    ];
    if (novoRefreshToken) entries.push(["@orienta_refresh_token", novoRefreshToken]);
    await AsyncStorage.multiSet(entries);
  };

  const trocarPerfil = async (perfil: string) => {
    if (!usuarioId) {
      throw new Error("Sua sessão expirou. Entre novamente.");
    }

    const papel = normalizarPerfil(perfil) === "Professor" ? "ROLE_PROFESSOR" : "ROLE_ALUNO";
    const response = await apiFetch(`${API_URL}/api/v1/auth/papel`, {
      method: "POST",
      body: JSON.stringify({ papel }),
    });

    const payload: unknown = await response.json();
    const data =
      payload && typeof payload === "object" && "data" in payload
        ? payload.data
        : null;
    const accessToken =
      data && typeof data === "object" && "token" in data
        ? data.token
        : null;
    const newRefreshToken =
      data && typeof data === "object" && "refreshToken" in data
        ? data.refreshToken
        : null;
    if (typeof accessToken !== "string" || typeof newRefreshToken !== "string") {
      throw new Error("A API não retornou os tokens necessários para trocar de perfil.");
    }

    await loginGlobal(usuarioId, papel, nomeUsuario, accessToken, newRefreshToken);
  };

  const logoutGlobal = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
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
    }
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
        isAuthenticated: !!token && !!usuarioId,
        loginGlobal,
        trocarPerfil,
        logoutGlobal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  return contexto;
};
