// Dados dos Produtos do Catálogo Xukuru do Ororubá
const XUKURU_PRODUCTS = [
  {
    id: 1,
    title: "Vaso Cerâmico Ororubá com Grafismos Sagrados",
    category: "ceramica",
    categoryName: "Cerâmica & Barro",
    price: 165.00,
    featured: true,
    rating: 5.0,
    reviewsCount: 28,
    artisan: "Mestra Damiana Xukuru",
    village: "Aldeia Pedra D'Água - Serra do Ororubá",
    image: "assets/images/vaso_ororuba.jpg",
    gallery: [
      "assets/images/vaso_ororuba.jpg",
      "assets/images/hero.jpg",
      "assets/images/prato_barro.jpg"
    ],
    materials: "Argila vermelha coletada nas encostas da Serra do Ororubá, pigmentos minerais naturais de tauá e carvão, queima tradicional em forno de lenha.",
    description: "Vaso modelado integralmente à mão pela técnica ancestral do rolinho (acordelado). Possui incisões geométricas que representam as veredas d'água e a serpente sagrada protetora das matas do Ororubá. Peça única com acabamento acetinado obtido através de brunimento com sementes lisas.",
    dimensions: "24cm altura x 18cm diâmetro",
    weight: "1.4 kg",
    stock: 7
  },
  {
    id: 2,
    title: "Cesto Balaio Tradicional em Palha de Ouricuri",
    category: "trancados",
    categoryName: "Trançados & Fibras",
    price: 120.00,
    featured: true,
    rating: 4.9,
    reviewsCount: 34,
    artisan: "Maria da Penha Xukuru",
    village: "Aldeia Cimbres - Pesqueira (PE)",
    image: "assets/images/cesto_ouricuri.jpg",
    gallery: [
      "assets/images/cesto_ouricuri.jpg",
      "assets/images/bolsa_fibra.jpg",
      "assets/images/hero.jpg"
    ],
    materials: "Palha nobre de palmeira Ouricuri coletada de forma sustentável, fibras naturais e tingimento com folhas de aroeira.",
    description: "Balaio de trançado fechado com borda reforçada e franjas rústicas naturais. Utilizado historicamente na colheita e guarda de sementes crioulas. O trançado em losango remete ao olho do gavião, símbolo de vigilância e proteção espiritual.",
    dimensions: "32cm diâmetro x 16cm profundidade",
    weight: "450 g",
    stock: 12
  },
  {
    id: 3,
    title: "Colar Sagrado em Sementes de Tento e Açaí",
    category: "biojoias",
    categoryName: "Biojoias",
    price: 75.00,
    featured: true,
    rating: 4.8,
    reviewsCount: 42,
    artisan: "Coletivo de Jovens da Aldeia Canabrava",
    village: "Aldeia Canabrava - Pesqueira (PE)",
    image: "assets/images/colar_sementes.jpg",
    gallery: [
      "assets/images/colar_sementes.jpg",
      "assets/images/hero.jpg"
    ],
    materials: "Sementes de tento-vermelho, contas de açaí silvestre desidratado, murici e cordão de algodão cru torcido à mão.",
    description: "Biojoia artesanal que une a força das sementes da Caatinga e da Mata Atlântica pernambucana. O tento vermelho é reconhecido pelas rezadeiras Xukuru como um poderoso amuleto contra energias densas, trazendo força e enraizamento.",
    dimensions: "Comprimento ajustável de 45cm a 65cm",
    weight: "80 g",
    stock: 25
  },
  {
    id: 4,
    title: "Maracá Cerimonial do Toré Xukuru",
    category: "maracas",
    categoryName: "Maracás & Rituais",
    price: 145.00,
    featured: true,
    rating: 5.0,
    reviewsCount: 19,
    artisan: "Pajé Zé de Viana",
    village: "Aldeia Santana - Serra do Ororubá",
    image: "assets/images/maraca_artesanal.jpg",
    gallery: [
      "assets/images/maraca_artesanal.jpg",
      "assets/images/hero.jpg"
    ],
    materials: "Cabaça nativa curada, cabo de madeira de poda, sementes sagradas de jurubeba e tentos para ressonância, cordão de algodão cru.",
    description: "Instrumento sonoro e ritualístico sagrado do povo Xukuru, utilizado no Toré para conexão com os Encantados da Serra. Cada maracá é afinado individualmente pelo som das sementes internas e entalhado com os grafismos de identidade da aldeia.",
    dimensions: "30cm comprimento x 12cm diâmetro da cabaça",
    weight: "220 g",
    stock: 9
  },
  {
    id: 5,
    title: "Prato Cerâmico Xukuru com Pigmentação Natural",
    category: "ceramica",
    categoryName: "Cerâmica & Barro",
    price: 95.00,
    featured: true,
    rating: 4.9,
    reviewsCount: 15,
    artisan: "Luzia Xukuru",
    village: "Aldeia São José - Pesqueira (PE)",
    image: "assets/images/prato_barro.jpg",
    gallery: [
      "assets/images/prato_barro.jpg",
      "assets/images/vaso_ororuba.jpg"
    ],
    materials: "Barro vermelho do agreste, engobe mineral claro, queima lenta.",
    description: "Prato cerâmico decorativo e utilitário, com bordas suavemente onduladas que lembram o relevo da Serra do Ororubá. Grafismos pintados com pigmentos de plantas da Caatinga e terra rica em óxido de ferro.",
    dimensions: "26cm diâmetro x 4cm altura",
    weight: "900 g",
    stock: 14
  },
  {
    id: 6,
    title: "Bolsa Artesanal em Fibras de Caroá e Ouricuri",
    category: "trancados",
    categoryName: "Trançados & Fibras",
    price: 110.00,
    featured: true,
    rating: 4.7,
    reviewsCount: 22,
    artisan: "Grupo de Mulheres Artesãs Xukuru",
    village: "Aldeia Ipanema - Pesqueira (PE)",
    image: "assets/images/bolsa_fibra.jpg",
    gallery: [
      "assets/images/bolsa_fibra.jpg",
      "assets/images/cesto_ouricuri.jpg"
    ],
    materials: "Fibra resistente de caroá nativo, alça em algodão trançado e fecho em semente de jequitibá.",
    description: "Bolsa tiracolo sustentável e extremamente durável. As fibras são batidas, lavadas no riacho comunitário e tecidas pacientemente em tear manual, unindo sofisticação rústica e resistência secular.",
    dimensions: "28cm largura x 22cm altura (alça com 105cm)",
    weight: "310 g",
    stock: 8
  },
  {
    id: 7,
    title: "Escultura Guardião da Mata em Madeira de Reuso",
    category: "esculturas",
    categoryName: "Esculturas",
    price: 230.00,
    featured: false,
    rating: 5.0,
    reviewsCount: 11,
    artisan: "Entalhador Marcos Xukuru",
    village: "Aldeia Brejinho - Pesqueira (PE)",
    image: "assets/images/escultura_sagrada.jpg",
    gallery: [
      "assets/images/escultura_sagrada.jpg",
      "assets/images/hero.jpg"
    ],
    materials: "Madeira nobre reaproveitada de podas naturais da serra, cera de abelha tiúba para impermeabilização.",
    description: "Escultura entalhada à goiva representando a comunhão entre o guerreiro Xukuru e a flora nativa. Cada entalhe reverencia a memória do Cacique Chicão e a luta pela reconquista do território sagrado.",
    dimensions: "38cm altura x 14cm largura",
    weight: "1.8 kg",
    stock: 4
  },
  {
    id: 8,
    title: "Pulseira de Tento Vermelho e Fibras Trançadas",
    category: "biojoias",
    categoryName: "Biojoias",
    price: 45.00,
    featured: false,
    rating: 4.8,
    reviewsCount: 50,
    artisan: "Coletivo Jovem Xukuru",
    village: "Aldeia Mascarenhas - Serra do Ororubá",
    image: "assets/images/colar_sementes.jpg",
    gallery: [
      "assets/images/colar_sementes.jpg"
    ],
    materials: "Sementes selecionadas de tento da caatinga e linha de algodão encerado.",
    description: "Pulseira regulável de uso diário, símbolo de pertencimento, coragem e proteção ancestral dos povos indígenas do Agreste Pernambucano.",
    dimensions: "Ajustável para pulsos de 15cm a 22cm",
    weight: "35 g",
    stock: 30
  }
];

// Dados dos Correios para Simulação de CEP
const FRETE_CONFIG = {
  origem: "55200-000", // Pesqueira - PE
  cidadeOrigem: "Pesqueira - PE (Serra do Ororubá)",
  opcoes: [
    {
      id: "pac",
      nome: "Correios PAC (Econômico)",
      prazoBase: 6, // dias úteis
      precoBase: 24.90
    },
    {
      id: "sedex",
      nome: "Correios SEDEX (Expresso)",
      prazoBase: 2, // dias úteis
      precoBase: 42.50
    }
  ]
};
