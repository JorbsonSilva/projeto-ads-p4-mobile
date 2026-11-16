import { API_URL, apiFetch, ApiRequestError } from "../config/api";

export interface AulaPendenteAvaliacao {
  agendamentoId: number;
  professorNome: string;
  disciplinaNome: string | null;
  assunto: string | null;
  data: string;
  hora: string;
}

export interface AvaliacaoAulaRequest {
  notaGeral: number;
  notaDidatica: number;
  notaPontualidade: number;
  notaDominio: number;
  tagsSelecionadas: string[];
  comentario: string;
}

interface ApiResponse<T> {
  data: T;
}

function isAulaPendenteAvaliacao(value: unknown): value is AulaPendenteAvaliacao {
  if (!value || typeof value !== "object") return false;
  const aula = value as Record<string, unknown>;
  return (
    typeof aula.agendamentoId === "number" &&
    typeof aula.professorNome === "string" &&
    (typeof aula.disciplinaNome === "string" || aula.disciplinaNome === null) &&
    (typeof aula.assunto === "string" || aula.assunto === null) &&
    typeof aula.data === "string" &&
    typeof aula.hora === "string"
  );
}

export async function listarAulasPendentesAvaliacao(): Promise<AulaPendenteAvaliacao[]> {
  const response = await apiFetch(`${API_URL}/api/v1/aulas/pendentes-avaliacao`);
  const resultado = (await response.json()) as ApiResponse<unknown>;
  if (!Array.isArray(resultado.data) || !resultado.data.every(isAulaPendenteAvaliacao)) {
    throw new ApiRequestError("O servidor retornou uma lista de avaliações inválida.");
  }
  return resultado.data;
}

export async function enviarAvaliacaoAula(
  agendamentoId: number,
  avaliacao: AvaliacaoAulaRequest
): Promise<void> {
  await apiFetch(`${API_URL}/api/v1/aulas/${agendamentoId}/avaliar`, {
    method: "POST",
    body: JSON.stringify(avaliacao),
  });
}
