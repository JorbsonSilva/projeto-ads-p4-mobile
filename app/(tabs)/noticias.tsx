import React from "react";
import NotificacoesScreen from "../notificacoes";

/**
 * Rota /(tabs)/noticias redirecionada para a Central de Notificações [ORI-016 / IMG-006]
 * em conformidade com o requisito funcional RN-001 de descarte da aba Notícias
 * e transição para Central de Avisos e Alertas da conta.
 */
export default function Noticias() {
  return <NotificacoesScreen />;
}
