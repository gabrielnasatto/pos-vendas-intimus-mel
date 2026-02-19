'use client';

import { useState } from 'react';

/**
 * Hook para gerenciar formatação e validação de data de nascimento
 * Consolidado de função duplicada que existia em 4 páginas diferentes
 */
export function useDataNascimento() {
  const [dataNascimento, setDataNascimento] = useState<string>('');

  // Formatar data para DD/MM/YYYY enquanto o usuário digita
  const formatarDataNascimento = (valor: string): string => {
    let v = valor.replace(/\D/g, ''); // Remove tudo que não é dígito

    if (v.length >= 2) {
      v = v.substring(0, 2) + '/' + v.substring(2);
    }
    if (v.length >= 5) {
      v = v.substring(0, 5) + '/' + v.substring(5, 9);
    }

    return v;
  };

  // Handler para mudanças no campo de data
  const handleDataNascimentoChange = (novoValor: string): void => {
    const dataFormatada = formatarDataNascimento(novoValor);
    setDataNascimento(dataFormatada);
  };

  return {
    dataNascimento,
    setDataNascimento,
    handleDataNascimentoChange,
    formatarDataNascimento,
  };
}
