export const LOCALIZACOES_PRESENCIAIS = [
  {
    cidade: "Caruaru",
    estado: "PE",
    latitude: -8.2839,
    longitude: -35.9761,
    regioes: [
      { nome: "Centro", latitude: -8.2839, longitude: -35.9761 },
      { nome: "Maurício de Nassau", latitude: -8.275, longitude: -35.973 },
      { nome: "Indianópolis", latitude: -8.303, longitude: -35.967 },
      { nome: "Boa Vista", latitude: -8.29, longitude: -35.963 },
      { nome: "Salgado", latitude: -8.3, longitude: -35.98 },
    ],
  },
  {
    cidade: "Recife",
    estado: "PE",
    latitude: -8.0476,
    longitude: -34.877,
    regioes: [
      { nome: "Boa Viagem", latitude: -8.1189, longitude: -34.8988 },
      { nome: "Casa Forte", latitude: -8.0267, longitude: -34.9197 },
      { nome: "Graças", latitude: -8.0416, longitude: -34.8974 },
      { nome: "Madalena", latitude: -8.056, longitude: -34.911 },
      { nome: "Várzea", latitude: -8.0539, longitude: -34.9511 },
    ],
  },
  {
    cidade: "Campina Grande",
    estado: "PB",
    latitude: -7.2307,
    longitude: -35.8817,
    regioes: [
      { nome: "Centro", latitude: -7.2307, longitude: -35.8817 },
      { nome: "Catolé", latitude: -7.239, longitude: -35.876 },
      { nome: "Bodocongó", latitude: -7.218, longitude: -35.91 },
      { nome: "Liberdade", latitude: -7.239, longitude: -35.891 },
      { nome: "Prata", latitude: -7.224, longitude: -35.89 },
    ],
  },
  {
    cidade: "João Pessoa",
    estado: "PB",
    latitude: -7.1195,
    longitude: -34.845,
    regioes: [
      { nome: "Centro", latitude: -7.1195, longitude: -34.845 },
      { nome: "Manaíra", latitude: -7.104, longitude: -34.834 },
      { nome: "Bessa", latitude: -7.074, longitude: -34.834 },
      { nome: "Tambaú", latitude: -7.116, longitude: -34.824 },
      { nome: "Bancários", latitude: -7.155, longitude: -34.83 },
    ],
  },
] as const;

export type CidadeAtendimento = (typeof LOCALIZACOES_PRESENCIAIS)[number]["cidade"];
