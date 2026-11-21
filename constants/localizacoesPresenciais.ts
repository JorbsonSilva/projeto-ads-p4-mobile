export const LOCALIZACOES_PRESENCIAIS = [
  {
    cidade: "Caruaru",
    estado: "PE",
    latitude: -8.2839,
    longitude: -35.9761,
    regioes: [
      "Centro",
      "Maurício de Nassau",
      "Indianópolis",
      "Boa Vista",
      "Salgado",
    ],
  },
  {
    cidade: "Recife",
    estado: "PE",
    latitude: -8.0476,
    longitude: -34.877,
    regioes: [
      "Boa Viagem",
      "Casa Forte",
      "Graças",
      "Madalena",
      "Várzea",
    ],
  },
  {
    cidade: "Campina Grande",
    estado: "PB",
    latitude: -7.2307,
    longitude: -35.8817,
    regioes: [
      "Centro",
      "Catolé",
      "Bodocongó",
      "Liberdade",
      "Prata",
    ],
  },
  {
    cidade: "João Pessoa",
    estado: "PB",
    latitude: -7.1195,
    longitude: -34.845,
    regioes: [
      "Centro",
      "Manaíra",
      "Bessa",
      "Tambaú",
      "Bancários",
    ],
  },
] as const;

export type CidadeAtendimento = (typeof LOCALIZACOES_PRESENCIAIS)[number]["cidade"];
