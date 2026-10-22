/**
 * @file AuthContext.tsx
 * @description Provedor de Contexto Global de Autenticação e Sessão (AuthContext).
 * Gerencia a sincronização simultânea entre a memória de curto prazo (RAM) e o armazenamento local persistente (AsyncStorage).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

/** Definindo a tipagem estrita para o formato dos dados que o contexto distribuirá globalmente */
interface AuthContextData {
  usuarioId: string | null;
  perfilAtivo: string;
  nomeUsuario: string;
  carregandoAuth: boolean;
  alternarPerfilGlobal: (novoPerfil: string) => Promise<void>;
  loginGlobal: (id: string, perfil: string, nome: string) => Promise<void>;
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
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(true);

  /**
   * Efeito colateral inicializer que roda automaticamente ao abrir o aplicativo.
   * Verifica se há resíduos de sessão persistidos no armazenamento do celular.
   */
  useEffect(() => {
    const carregarSessaoPersistida = async () => {
      try {
        const [idSalvo, perfilSalvo, nomeSalvo] = await Promise.all([
          AsyncStorage.getItem("@orienta_usuario_id"),
          AsyncStorage.getItem("@orienta_perfil"),
          AsyncStorage.getItem("@orienta_nome_usuario"),
        ]);

        if (idSalvo) setUsuarioId(idSalvo);
        if (perfilSalvo) setPerfilAtivo(perfilSalvo);
        if (nomeSalvo) setNomeUsuario(nomeSalvo);
      } catch (error) {
        console.error(
          "Erro ao ler dados do AsyncStorage no bootstrap do app:",
          error,
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
   * @param {string} id - Chave primária do usuário vinda do banco de dados.
   * @param {string} perfil - Perfil selecionado na tela de login.
   * @param {string} nome - Nome do usuário retornado pelo servidor.
   */
  const _loginGlobal = async (id: string, perfil: string, nome: string) => {
    setUsuarioId(id);
    setPerfilAtivo(perfil);
    setNomeUsuario(nome);

    await Promise.all([
      AsyncStorage.setItem("@orienta_usuario_id", id),
      AsyncStorage.setItem("@orienta_perfil", perfil),
      AsyncStorage.setItem("@orienta_nome_usuario", nome),
    ]);
  };

  /**
   * Executa a amnésia completa do aplicativo, limpando resíduos de sessão do estado e do disco.
   */
  const _logoutGlobal = async () => {
    setUsuarioId(null);
    setPerfilAtivo("Aluno");
    setNomeUsuario("");

    await AsyncStorage.multiRemove([
      "@orienta_usuario_id",
      "@orienta_perfil",
      "@orienta_nome_usuario",
    ]);
  };

  return (
    <AuthContext.Provider
      value={{
        usuarioId,
        perfilAtivo,
        nomeUsuario,
        carregandoAuth,
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
