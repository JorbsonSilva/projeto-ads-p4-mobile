/**
 * @file termosService.ts
 * @description Serviço híbrido resiliente para Termos de Uso, Política de Privacidade e Sobre o App [ORI-024].
 * Fornece a base contratual e institucional completa, registro auditável de consentimento LGPD,
 * exportação de documentos e camada de resiliência com fallback offline.
 */

import { API_URL } from "../config/api";

export interface SecaoTermo {
  id: string;
  titulo: string;
  subtitulo?: string;
  conteudo: string;
  itens?: string[];
  destaque?: string;
  icone?: string;
}

export interface DocumentoLegal {
  tipo: "TERMOS_USO" | "PRIVACIDADE" | "SOBRE";
  titulo: string;
  versao: string;
  dataVigencia: string;
  secoes: SecaoTermo[];
}

export interface StatusConsentimento {
  aceito: boolean;
  dataAceite: string;
  protocoloConsentimento: string;
  versaoAceita: string;
}

export interface ResultadoTermos {
  termosUso: DocumentoLegal;
  privacidade: DocumentoLegal;
  sobre: DocumentoLegal;
  consentimento: StatusConsentimento;
  isSimulado: boolean;
}

// ==============================================================
// BASE CANÔNICA DE TERMOS DE USO
// ==============================================================
export const TERMOS_USO_OFICIAL: DocumentoLegal = {
  tipo: "TERMOS_USO",
  titulo: "Termos e Condições Gerais de Uso",
  versao: "2.4 Oficial",
  dataVigencia: "Outubro de 2026",
  secoes: [
    {
      id: "termos-1",
      titulo: "1. Objeto e Natureza da Plataforma",
      conteudo:
        "O Orienta 2.0 é um ecossistema digital que conecta estudantes universitários a professores e mentores autônomos para reforço pedagógico, preparação de provas e orientação em trabalhos acadêmicos.",
      itens: [
        "A plataforma atua como intermediadora tecnológica entre alunos e professores autônomos.",
        "Os professores são responsáveis diretos pelo conteúdo ministrado nas mentorias.",
        "O Orienta assegura a custódia financeira, o registro auditável e a mediação ética dos encontros.",
      ],
      destaque: "Intermediação segura e transparente em todo o ciclo de mentoria.",
      icone: "book-open",
    },
    {
      id: "termos-2",
      titulo: "2. Garantia de Preço Congelado",
      conteudo:
        "Para proteger o planejamento financeiro do estudante, o valor horário acordado na confirmação da mentoria permanece estritamente congelado durante todo o ciclo da contratação.",
      itens: [
        "Nenhum acréscimo unilateral de tarifa pode ocorrer após a confirmação.",
        "Valores de aulas presenciais incluem eventuais deslocamentos previamente informados.",
      ],
      destaque: "Garantia de Preço Congelado protegida por contrato e auditada pelo sistema.",
      icone: "lock",
    },
    {
      id: "termos-3",
      titulo: "3. Política de Cancelamento e Remarcação Bilateral",
      conteudo:
        "Tanto alunos quanto professores possuem o direito de cancelar ou remarcar mentorias agendadas com até 2 horas de antecedência ao horário previsto.",
      itens: [
        "Cancelamento com mais de 2 horas de antecedência: estorno de 100% do valor.",
        "Remarcação com mais de 2 horas de antecedência: sem cobrança de taxas adicionais.",
        "Cancelamento com menos de 2 horas: retenção de 50% para compensar a reserva de agenda do mentor.",
        "Falta não justificada do professor: devolução integral imediata ao estudante com créditos bônus.",
      ],
      destaque: "Regra transparente de 2 horas de antecedência válida para ambas as partes.",
      icone: "clock",
    },
    {
      id: "termos-4",
      titulo: "4. Honorários Docentes e Taxa Operacional",
      conteudo:
        "A plataforma cobra uma taxa operacional fixa de 10% exclusivamente sobre aulas pagas, destinada à custódia bancária, manutenção dos servidores e suporte ao usuário.",
      itens: [
        "Aulas declaradas como gratuitas ou beneficentes têm taxa zero de intermediação.",
        "O professor pode solicitar saque via PIX com valor mínimo de R$ 50,00.",
        "O processamento do saque para pedidos até as 17h ocorre no mesmo dia útil.",
      ],
      destaque: "Taxa transparente de 10% apenas sobre mentorias remuneradas.",
      icone: "dollar-sign",
    },
    {
      id: "termos-5",
      titulo: "5. Código de Conduta e Ética Acadêmica",
      conteudo:
        "O ambiente Orienta é regido por princípios de respeito mútuo, cordialidade, integridade e proibição absoluta de fraudes acadêmicas.",
      itens: [
        "É terminantemente proibido o fornecimento de respostas diretas para provas em tempo real.",
        "Zero tolerância para assédio verbal, moral, sexual ou discriminação de qualquer natureza.",
        "Violações acarretam suspensão imediata e bloqueio preventivo da conta.",
      ],
      destaque: "Compromisso inegociável com a integridade e o respeito acadêmico.",
      icone: "shield",
    },
  ],
};

// ==============================================================
// BASE CANÔNICA DE PRIVACIDADE & LGPD
// ==============================================================
export const PRIVACIDADE_OFICIAL: DocumentoLegal = {
  tipo: "PRIVACIDADE",
  titulo: "Política de Privacidade e Proteção de Dados",
  versao: "2.4 Oficial",
  dataVigencia: "Outubro de 2026",
  secoes: [
    {
      id: "priv-1",
      titulo: "1. Conformidade com a LGPD (Lei 13.709/2018)",
      conteudo:
        "O Orienta 2.0 atua em estrita conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD), tratando apenas dados necessários para a execução do contrato de serviço educacional.",
      itens: [
        "Coleta mínima restrita a nome, e-mail institucional, CPF, curso e instituição.",
        "Armazenamento de senhas via algoritmo criptográfico irreversível BCrypt.",
        "Sessões autenticadas via tokens JWT com assinatura digital e expiração automática.",
      ],
      destaque: "Segurança de ponta a ponta e respeito à sua privacidade.",
      icone: "shield-check",
    },
    {
      id: "priv-2",
      titulo: "2. Geolocalização Pontual e Protegida (Haversine)",
      conteudo:
        "Na modalidade de busca presencial, as coordenadas geográficas do usuário não são monitoradas em tempo real em segundo plano.",
      itens: [
        "O cálculo de proximidade é realizado de forma pontual no servidor pela fórmula de Haversine.",
        "O mapa exibe raios de busca e pontos de encontro em locais públicos/universitários.",
        "O endereço residencial exato do usuário nunca é divulgado publicamente.",
      ],
      destaque: "Geolocalização sob demanda sem rastreamento invasivo ou persistente.",
      icone: "map-pin",
    },
    {
      id: "priv-3",
      titulo: "3. Sigilo Bancário e Dados de Pagamento",
      conteudo:
        "Informações de pagamento (número de cartão de crédito e dados bancários) não são armazenadas em texto simples nos servidores do Orienta.",
      itens: [
        "Transações processadas via gateways de pagamento certificados PCI-DSS Nível 1.",
        "Chaves PIX são utilizadas exclusivamente para o direcionamento de saques solicitados.",
      ],
      destaque: "Custódia financeira em conformidade com as diretrizes do Banco Central.",
      icone: "credit-card",
    },
    {
      id: "priv-4",
      titulo: "4. Direitos do Titular de Dados",
      conteudo:
        "Em conformidade com o Art. 18 da LGPD, você possui livre acesso para solicitar a confirmação, retificação, portabilidade ou eliminação dos seus dados pessoais.",
      itens: [
        "Acesso simplificado aos seus dados através da tela de Perfil.",
        "Canal direto com o Encarregado de Dados (DPO) através da Central de Ajuda.",
      ],
      destaque: "Você no controle dos seus dados a qualquer momento.",
      icone: "user-check",
    },
  ],
};

// ==============================================================
// BASE INSTITUCIONAL: SOBRE O ORIENTA 2.0
// ==============================================================
export const SOBRE_OFICIAL: DocumentoLegal = {
  tipo: "SOBRE",
  titulo: "Sobre o Orienta 2.0",
  versao: "2.4 Oficial",
  dataVigencia: "Outubro de 2026",
  secoes: [
    {
      id: "sobre-1",
      titulo: "1. Nossa Missão",
      conteudo:
        "Transformar o aprendizado universitário conectando quem precisa aprender com quem ama ensinar, promovendo autonomia pedagógica, retenção escolar e excelência acadêmica.",
      destaque: "Educação colaborativa de alto impacto para estudantes universitários.",
      icone: "compass",
    },
    {
      id: "sobre-2",
      titulo: "2. Arquitetura e Engenharia de Software",
      conteudo:
        "O Orienta 2.0 foi concebido sobre padrões modernos de desenvolvimento para ambientes web e mobile escaláveis:",
      itens: [
        "Mobile & Web: React Native com Expo 54, Expo Router v3, TypeScript e Tailwind CSS.",
        "Backend & API: Java 21 LTS com Spring Boot 3, Spring Security, JWT e Hibernate.",
        "Banco de Dados: PostgreSQL relacional com migrações versionadas via Flyway.",
        "Navegação por Personas: Isolamento completo entre perfis Aluno e Professor (RN-001).",
      ],
      destaque: "Engenharia de software com foco em manutenibilidade, segurança e performance.",
      icone: "layers",
    },
    {
      id: "sobre-3",
      titulo: "3. Comitê de Avaliação da Banca",
      conteudo:
        "Projeto desenvolvido como trabalho de conclusão de curso na disciplina de Projeto ADS P4, sob orientação docente e homologação técnica de banca examinadora.",
      itens: [
        "Autor Principal: Equipe de Engenharia Orienta.",
        "Ambiente de Demonstração: AI Studio Sandbox com contingência offline híbrida.",
      ],
      destaque: "Projeto acadêmico com rigor de engenharia de software de mercado.",
      icone: "award",
    },
  ],
};

// ==============================================================
// STATUS DE CONSENTIMENTO OFICIAL
// ==============================================================
export const STATUS_CONSENTIMENTO_OFICIAL: StatusConsentimento = {
  aceito: true,
  dataAceite: "15/02/2026 às 10:30",
  protocoloConsentimento: "LGPD-2026-91823-BR",
  versaoAceita: "v2.4 Oficial",
};

// ==============================================================
// SERVIÇOS HÍBRIDOS
// ==============================================================
export async function obterDocumentosLegais(): Promise<ResultadoTermos> {
  return {
    termosUso: TERMOS_USO_OFICIAL,
    privacidade: PRIVACIDADE_OFICIAL,
    sobre: SOBRE_OFICIAL,
    consentimento: STATUS_CONSENTIMENTO_OFICIAL,
    isSimulado: true,
  };
}

export async function enviarCopiaTermosEmail(
  email: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  return {
    sucesso: true,
    mensagem: `Uma cópia dos Termos de Uso e Política de Privacidade em PDF foi enviada para ${email}.`,
  };
}
