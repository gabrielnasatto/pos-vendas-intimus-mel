import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

// Função para merge de classes CSS (Tailwind)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatar telefone brasileiro
export function formatarTelefone(telefone: string): string {
  const numero = telefone.replace(/\D/g, '');
  
  if (numero.length === 11) {
    return `(${numero.substring(0, 2)}) ${numero.substring(2, 7)}-${numero.substring(7)}`;
  }
  
  if (numero.length === 10) {
    return `(${numero.substring(0, 2)}) ${numero.substring(2, 6)}-${numero.substring(6)}`;
  }
  
  return telefone;
}

// Normalizar telefone para formato padrão
export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

// Validar telefone brasileiro
export function validarTelefone(telefone: string): boolean {
  const numero = telefone.replace(/\D/g, '');
  return numero.length === 10 || numero.length === 11;
}

// Formatar data do Firebase Timestamp
export function formatarData(timestamp: Timestamp | Date | string): string {
  let date: Date;
  
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = parseISO(timestamp);
  } else {
    date = timestamp;
  }
  
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

// Formatar apenas data (sem hora)
export function formatarDataSimples(timestamp: Timestamp | Date | string): string {
  let date: Date;
  
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = parseISO(timestamp);
  } else {
    date = timestamp;
  }
  
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

// Formatar moeda brasileira
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

// Calcular horas desde cadastro
export function calcularHorasDesde(timestamp: Timestamp): number {
  const agora = new Date();
  const dataCadastro = timestamp.toDate();
  const diff = agora.getTime() - dataCadastro.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

// Verificar se passou 24h
export function passou24h(timestamp: Timestamp): boolean {
  return calcularHorasDesde(timestamp) >= 24;
}

// Obter cor do status
export function getCorStatus(status: string): string {
  const cores: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    enviado: 'bg-green-100 text-green-800 border-green-300',
    erro: 'bg-red-100 text-red-800 border-red-300',
    duplicado: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  
  return cores[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

// Obter emoji do status
export function getEmojiStatus(status: string): string {
  const emojis: Record<string, string> = {
    pendente: '🟡',
    enviado: '✅',
    erro: '❌',
    duplicado: '⚪',
  };
  
  return emojis[status] || '⚪';
}

// Obter primeiro nome
export function getPrimeiroNome(nomeCompleto: string): string {
  return nomeCompleto.split(' ')[0];
}

// Validar email
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Gerar ID único simples
export function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Truncar texto
export function truncarTexto(texto: string, tamanho: number = 50): string {
  if (texto.length <= tamanho) return texto;
  return texto.substring(0, tamanho) + '...';
}

// Calcular idade
export function calcularIdade(dataNascimento: string): number {
  const [dia, mes, ano] = dataNascimento.split('/').map(Number);
  const hoje = new Date();
  const nascimento = new Date(ano, mes - 1, dia);
  
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();
  
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
}

// Validar data no formato DD/MM/YYYY
export function validarDataNascimento(data: string): boolean {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = data.match(regex);
  
  if (!match) return false;
  
  const [, dia, mes, ano] = match;
  const d = parseInt(dia);
  const m = parseInt(mes);
  const a = parseInt(ano);
  
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (a < 1900 || a > new Date().getFullYear()) return false;
  
  return true;
}
