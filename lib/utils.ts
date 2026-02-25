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

// Validar telefone — aceita E.164 (+5553994242183) ou formato brasileiro legado (10/11 dígitos)
export function validarTelefone(telefone: string): boolean {
  if (!telefone) return false;
  if (telefone.startsWith('+')) {
    // Formato E.164: começa com +, entre 8 e 15 dígitos no total
    const digits = telefone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }
  const numero = telefone.replace(/\D/g, '');
  return numero.length === 10 || numero.length === 11;
}

// Normalizar telefone para E.164 (assume Brasil se não houver DDI)
export function normalizarParaE164(telefone: string): string {
  if (!telefone) return '';
  if (telefone.startsWith('+')) return telefone;
  const digits = telefone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return telefone;
}

// Formatar data do Firebase Timestamp
export function formatarData(timestamp: Timestamp | Date | string | null | undefined): string {
  if (!timestamp) return '-';
  let date: Date;

  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = parseISO(timestamp);
  } else if (typeof timestamp === 'object' && 'toDate' in timestamp) {
    date = (timestamp as any).toDate();
  } else {
    date = timestamp as Date;
  }

  if (!date || isNaN(date.getTime())) return '-';
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

// Formatar apenas data (sem hora)
export function formatarDataSimples(timestamp: Timestamp | Date | string | null | undefined): string {
  if (!timestamp) return '-';
  let date: Date;

  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = parseISO(timestamp);
  } else if (typeof timestamp === 'object' && 'toDate' in timestamp) {
    date = (timestamp as any).toDate();
  } else {
    date = timestamp as Date;
  }

  if (!date || isNaN(date.getTime())) return '-';
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

// Formatar moeda brasileira
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

// Validar email
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
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
