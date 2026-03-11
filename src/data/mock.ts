export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
  serviceDescription: string;
}

export interface Professional {
  id: string;
  name: string;
  photo: string;
  categoryId: string;
  category: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  premium: boolean;
  description: string;
  experience: string;
  phone: string;
  reviews: Review[];
}

export const AVAILABLE_CITIES = [
  "Porto Alegre",
  "Gravataí",
  "Canoas",
  "Cachoeirinha",
  "Viamão",
  "Alvorada",
];

export const categories: Category[] = [
  { id: "montador", name: "Montador de Móveis", icon: "Hammer", count: 84 },
  { id: "eletricista", name: "Eletricista", icon: "Zap", count: 127 },
  { id: "encanador", name: "Encanador", icon: "Droplets", count: 95 },
  { id: "diarista", name: "Diarista", icon: "SprayCan", count: 203 },
  { id: "chaveiro", name: "Chaveiro", icon: "Key", count: 56 },
  { id: "ar-condicionado", name: "Técnico de Ar Condicionado", icon: "Wind", count: 71 },
];

export const professionals: Professional[] = [
  {
    id: "1",
    name: "Carlos Silva",
    photo: "",
    categoryId: "montador",
    category: "Montador de Móveis",
    city: "Porto Alegre",
    state: "RS",
    rating: 4.8,
    reviewCount: 142,
    verified: true,
    premium: true,
    description: "Montador profissional com 12 anos de experiência. Trabalho com todas as marcas: MDF, MDP, madeira maciça. Pontualidade e limpeza garantidas.",
    experience: "12 anos",
    phone: "(51) 99999-0001",
    reviews: [
      { id: "r1", clientName: "Maria Souza", rating: 5, comment: "Montou o guarda-roupa em 3 horas. Trabalho impecável, sem nenhum defeito. Recomendo muito.", date: "2026-03-01", serviceDescription: "Montagem de guarda-roupa planejado" },
      { id: "r2", clientName: "João Lima", rating: 5, comment: "Muito profissional, chegou no horário e deixou tudo limpo.", date: "2026-02-20", serviceDescription: "Montagem de cozinha completa" },
      { id: "r3", clientName: "Ana Costa", rating: 4, comment: "Bom trabalho, mas demorou um pouco mais do que o previsto.", date: "2026-02-10", serviceDescription: "Montagem de estante" },
    ],
  },
  {
    id: "2",
    name: "Roberto Almeida",
    photo: "",
    categoryId: "eletricista",
    category: "Eletricista",
    city: "Canoas",
    state: "RS",
    rating: 4.9,
    reviewCount: 89,
    verified: true,
    premium: false,
    description: "Eletricista certificado NR-10. Instalações, manutenções e reparos residenciais e comerciais. Orçamento sem compromisso.",
    experience: "8 anos",
    phone: "(51) 99999-0002",
    reviews: [
      { id: "r4", clientName: "Paulo Santos", rating: 5, comment: "Resolveu um problema elétrico que outros não conseguiram. Excelente profissional.", date: "2026-03-05", serviceDescription: "Reparo de curto-circuito" },
      { id: "r5", clientName: "Carla Mendes", rating: 5, comment: "Instalou todos os pontos de iluminação da casa nova. Trabalho limpo e rápido.", date: "2026-02-28", serviceDescription: "Instalação elétrica completa" },
    ],
  },
  {
    id: "3",
    name: "Marcos Oliveira",
    photo: "",
    categoryId: "encanador",
    category: "Encanador",
    city: "Gravataí",
    state: "RS",
    rating: 4.6,
    reviewCount: 67,
    verified: true,
    premium: false,
    description: "Encanador com experiência em instalações hidráulicas, desentupimentos e reparos. Atendo toda a região metropolitana.",
    experience: "15 anos",
    phone: "(51) 99999-0003",
    reviews: [
      { id: "r6", clientName: "Fernanda Dias", rating: 5, comment: "Desentupiu o encanamento rapidamente e com preço justo.", date: "2026-03-02", serviceDescription: "Desentupimento de pia" },
    ],
  },
  {
    id: "4",
    name: "Luciana Ferreira",
    photo: "",
    categoryId: "diarista",
    category: "Diarista",
    city: "Porto Alegre",
    state: "RS",
    rating: 4.7,
    reviewCount: 198,
    verified: true,
    premium: true,
    description: "Diarista profissional, organizada e pontual. Limpeza pesada e leve, passadoria. Trabalho com amor e dedicação há 10 anos.",
    experience: "10 anos",
    phone: "(51) 99999-0004",
    reviews: [
      { id: "r7", clientName: "Teresa Ramos", rating: 5, comment: "A Luciana é incrível. A casa ficou brilhando. Super pontual.", date: "2026-03-08", serviceDescription: "Limpeza pesada de apartamento" },
      { id: "r8", clientName: "Ricardo Nunes", rating: 5, comment: "Muito cuidadosa com os móveis e detalhista na limpeza.", date: "2026-02-25", serviceDescription: "Faxina semanal" },
    ],
  },
  {
    id: "5",
    name: "Antônio Pereira",
    photo: "",
    categoryId: "chaveiro",
    category: "Chaveiro",
    city: "Cachoeirinha",
    state: "RS",
    rating: 4.5,
    reviewCount: 43,
    verified: false,
    premium: false,
    description: "Chaveiro 24 horas. Abertura de portas, troca de segredo, cópias de chaves. Atendimento rápido.",
    experience: "6 anos",
    phone: "(51) 99999-0005",
    reviews: [
      { id: "r9", clientName: "Juliana Martins", rating: 4, comment: "Veio rápido e resolveu o problema. Preço ok.", date: "2026-02-15", serviceDescription: "Abertura de porta residencial" },
    ],
  },
  {
    id: "6",
    name: "Eduardo Santos",
    photo: "",
    categoryId: "ar-condicionado",
    category: "Técnico de Ar Condicionado",
    city: "Viamão",
    state: "RS",
    rating: 4.8,
    reviewCount: 76,
    verified: true,
    premium: false,
    description: "Técnico certificado em manutenção e instalação de ar condicionado split e multi-split. Todas as marcas.",
    experience: "9 anos",
    phone: "(51) 99999-0006",
    reviews: [
      { id: "r10", clientName: "Marcos Vieira", rating: 5, comment: "Instalou o split rapidamente e deixou tudo funcionando perfeitamente.", date: "2026-03-04", serviceDescription: "Instalação de ar condicionado split" },
      { id: "r11", clientName: "Patrícia Gomes", rating: 5, comment: "Fez a manutenção preventiva de 3 aparelhos. Muito profissional.", date: "2026-02-18", serviceDescription: "Manutenção preventiva" },
    ],
  },
];
