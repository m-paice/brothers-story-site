// Perfil do cliente e endereços

export interface Profile {
  id: string;
  role: 'customer' | 'admin';
  nome: string | null;
  telefone: string | null;
  cpf: string | null;
}

export interface Address {
  id: string;
  label: string | null;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  is_default: boolean;
}

// Campos editáveis de um endereço (sem id/flag)
export type AddressInput = Omit<Address, 'id' | 'is_default'>;
