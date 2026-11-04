/**
 * @file demoData.ts
 * @description Dados ilustrativos para o Modo de Visualização do Orienta 2.0.
 * Utilizado estritamente para demonstração visual das telas quando a API Spring Boot
 * estiver offline, evitando telas em branco e erros inesperados.
 * 
 * Todos os dados são explicitamente identificados como de demonstração.
 */

export const IS_DEMO_DATA = true;

export interface DemoSaber {
  id: number;
  nome: string;
}

export interface DemoProfessor {
  id: number;
  nome: string;
  notaMedia: number;
  totalAvaliacoes: number;
  fotoUrl: string;
  oferecePresencial: boolean;
  regiaoAtendimento: string;
  distanciaAproximadaKm: number;
  textoProximidade: string;
  aptidoes: Array<{
    saber: DemoSaber;
    precoHora: number;
  }>;
}

export interface DemoAgendamento {
  id: number;
  data: string;
  hora: string;
  status: 'CONFIRMADO' | 'PENDENTE' | 'REALIZADA' | 'CANCELADO';
  aluno: { id: number; nome: string };
  professor: { id: number; nome: string };
  saber: DemoSaber;
  modalidade: 'ONLINE' | 'PRESENCIAL';
  valor: number;
}

export interface DemoNotificacao {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: 'AULA' | 'MENSAGEM' | 'PAGAMENTO' | 'SISTEMA';
  lida: boolean;
  dataCriacao: string;
}

export const DEMO_SABERES: DemoSaber[] = [
  { id: 1, nome: "Matemática (Demo)" },
  { id: 2, nome: "Programação Java (Demo)" },
  { id: 3, nome: "Física Geral (Demo)" },
  { id: 4, nome: "Química Orgânica (Demo)" },
  { id: 5, nome: "Cálculo Diferencial (Demo)" },
  { id: 6, nome: "Inglês Instrumental (Demo)" },
];

export const DEMO_PROFESSORES: DemoProfessor[] = [
  {
    id: 101,
    nome: "Prof. Lucas Rocha (Demonstração)",
    notaMedia: 4.9,
    totalAvaliacoes: 128,
    fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Campus Central / Online",
    distanciaAproximadaKm: 2.4,
    textoProximidade: "A 2,4 km de você",
    aptidoes: [
      { saber: { id: 1, nome: "Matemática" }, precoHora: 60.0 },
      { saber: { id: 5, nome: "Cálculo Diferencial" }, precoHora: 70.0 },
    ],
  },
  {
    id: 102,
    nome: "Profa. Juliana Santos (Demonstração)",
    notaMedia: 4.8,
    totalAvaliacoes: 96,
    fotoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    oferecePresencial: true,
    regiaoAtendimento: "Zona Sul / Online",
    distanciaAproximadaKm: 4.1,
    textoProximidade: "A 4,1 km de você",
    aptidoes: [
      { saber: { id: 3, nome: "Física Geral" }, precoHora: 55.0 },
    ],
  },
  {
    id: 103,
    nome: "Prof. Rafael Kim (Demonstração)",
    notaMedia: 4.9,
    totalAvaliacoes: 74,
    fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    oferecePresencial: false,
    regiaoAtendimento: "Sala Virtual Exclusiva",
    distanciaAproximadaKm: 0,
    textoProximidade: "Mentoria 100% Online",
    aptidoes: [
      { saber: { id: 2, nome: "Programação Java" }, precoHora: 70.0 },
    ],
  },
];

export const DEMO_AGENDAMENTOS: DemoAgendamento[] = [
  {
    id: 201,
    data: new Date().toISOString().split('T')[0],
    hora: "10:00:00",
    status: "CONFIRMADO",
    aluno: { id: 1, nome: "Jorbson Silva (Aluno)" },
    professor: { id: 101, nome: "Prof. Lucas Rocha" },
    saber: { id: 5, nome: "Cálculo Diferencial" },
    modalidade: "ONLINE",
    valor: 70.0,
  },
  {
    id: 202,
    data: new Date().toISOString().split('T')[0],
    hora: "14:30:00",
    status: "CONFIRMADO",
    aluno: { id: 1, nome: "Jorbson Silva (Aluno)" },
    professor: { id: 103, nome: "Prof. Rafael Kim" },
    saber: { id: 2, nome: "Programação Java" },
    modalidade: "ONLINE",
    valor: 70.0,
  },
  {
    id: 203,
    data: new Date().toISOString().split('T')[0],
    hora: "16:00:00",
    status: "PENDENTE",
    aluno: { id: 1, nome: "Jorbson Silva (Aluno)" },
    professor: { id: 102, nome: "Profa. Juliana Santos" },
    saber: { id: 3, nome: "Física Geral" },
    modalidade: "PRESENCIAL",
    valor: 55.0,
  },
];

export const DEMO_NOTIFICACOES: DemoNotificacao[] = [
  {
    id: 301,
    titulo: "Sua aula foi confirmada! (Demonstração)",
    mensagem: "Prof. Lucas Rocha aceitou sua solicitação para Cálculo Diferencial.",
    tipo: "AULA",
    lida: false,
    dataCriacao: new Date().toISOString(),
  },
  {
    id: 302,
    titulo: "Nova mensagem na mentoria (Demonstração)",
    mensagem: "Prof. Rafael enviou material preparatório no chat.",
    tipo: "MENSAGEM",
    lida: false,
    dataCriacao: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 303,
    titulo: "Sistema Orienta 2.0 (Demonstração)",
    mensagem: "Modo de visualização ativo. Conecte o backend Spring Boot para sincronização em tempo real.",
    tipo: "SISTEMA",
    lida: true,
    dataCriacao: new Date(Date.now() - 86400000).toISOString(),
  },
];
