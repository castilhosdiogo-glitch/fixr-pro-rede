// Tipos compartilhados entre componentes — dados reais vêm do Supabase
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
  plan_name?: string;
  nivel_curadoria?: string;
  fixr_score?: number;
}

export const AVAILABLE_CITIES = [
  "Porto Alegre",
  "Gravataí",
  "Canoas",
  "Cachoeirinha",
  "Viamão",
  "Alvorada",
];
