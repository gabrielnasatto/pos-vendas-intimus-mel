import { Timestamp } from 'firebase/firestore';

export type StatusCliente = 'pendente' | 'enviado' | 'erro' | 'duplicado';

export type RoleUsuario = 'admin' | 'vendedora';

export interface Cliente {
  id: string;
  dataCadastro: Timestamp;
  nome: string;
  telefone: string;
  dataNascimento?: string; // DD/MM/YYYY
  provou: boolean;
  status: StatusCliente;
  dataEnvio?: Timestamp;
  erro?: string;
  vendaId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Produto {
  nome: string;
  valor: number;
}

export interface Venda {
  id: string;
  dataVenda: Timestamp;
  valorTotal: number;
  produtos: Produto[];
  vendedora: string;
  clienteId: string;
  observacoes?: string;
  status: StatusCliente; // ✅ ADICIONADO
  provou: boolean; // ✅ ADICIONADO (para n8n saber qual template usar)
  createdAt: Timestamp;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: RoleUsuario;
  ativo: boolean;
  createdAt: Timestamp;
}

// Tipos para formulários
export interface ClienteFormData {
  nome: string;
  telefone: string;
  dataNascimento?: string;
  provou: boolean;
  // Dados da venda (opcional)
  valorTotal?: number;
  produtos?: Produto[];
  observacoes?: string;
}

// Tipo para filtros
export interface FiltrosClientes {
  status?: StatusCliente;
  dataInicio?: Date;
  dataFim?: Date;
  busca?: string;
}

// Tipo para estatísticas
export interface Estatisticas {
  totalClientes: number;
  pendentes: number;
  enviados: number;
  erros: number;
  taxaEnvio: number;
  clientesHoje: number;
}

export interface VendaCompleta extends Venda {
  nomeCliente?: string;
  tentativas?: number;
  erroEnvio?: string | null;
  erroEm?: string | null;
}