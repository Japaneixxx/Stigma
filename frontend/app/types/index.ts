export interface AuthResponse {
  token: string;
  tattooistId: string;
  name: string;
  email: string;
  slug: string;
}

export type LeadStatus =
  | "NOVO" | "APROVADO" | "REJEITADO" | "AGUARDANDO_PAGAMENTO"
  | "CONFIRMADO" | "CONCLUIDO" | "CANCELADO" | "NO_SHOW" | "EXPIRADO";

export interface LeadResponse {
  id: string;
  clientName: string;
  clientWhatsapp: string;
  clientEmail?: string;
  tattooStyle: string;
  bodyPart: string;
  estimatedSizeCm: number;
  description?: string;
  referenceImageUrl?: string;
  quotedPrice?: number;
  // suggested deposit / sinal value (optional)
  depositAmount?: number;
  tattooistNotes?: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

