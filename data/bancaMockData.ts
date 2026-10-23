// ==============================================================================
// Dados de Contingência Offline para a Banca (Fase 10)
// Utilizados automaticamente se a rede da faculdade oscilar
// ==============================================================================
export const BANCA_CONTINGENCY_DATA = {
  aluno: {
    id: 1001,
    nome: 'Gabriel Aluno (Banca)',
    email: 'aluno.banca@orienta.edu.br',
    papel: 'ALUNO',
    tokenFicticio: 'banca-mock-jwt-token'
  },
  professoresDestaque: [
    {
      id: 1002,
      nome: 'Prof. Dr. Carlos Eduardo',
      titulo: 'Doutor em Ciência da Computação',
      disciplina: 'Banco de Dados',
      valorHora: 70.00,
      avaliacao: 4.9,
      totalAvaliacoes: 38,
      bairro: 'Centro / Bela Vista',
      distanciaKm: 2.4,
      modalidades: ['ONLINE', 'PRESENCIAL']
    },
    {
      id: 1003,
      nome: 'Profa. Ma. Juliana Oliveira',
      titulo: 'Mestre em Matemática Pura',
      disciplina: 'Cálculo I',
      valorHora: 55.00,
      avaliacao: 5.0,
      totalAvaliacoes: 45,
      bairro: 'Zona Sul / Moema',
      distanciaKm: 5.1,
      modalidades: ['ONLINE']
    }
  ],
  aulasBanca: [
    {
      id: 301,
      professorNome: 'Prof. Dr. Carlos Eduardo',
      disciplina: 'Banco de Dados',
      data: 'Concluída há 3 dias',
      status: 'CONCLUIDA',
      valor: 70.00,
      nota: 5
    },
    {
      id: 302,
      professorNome: 'Profa. Ma. Juliana Oliveira',
      disciplina: 'Cálculo I',
      data: 'Hoje às 15:00',
      status: 'CONFIRMADA',
      valor: 55.00
    }
  ]
};
