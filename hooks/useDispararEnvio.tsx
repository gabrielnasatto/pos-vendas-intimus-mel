'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface ResultadoDisparo {
  sucesso: boolean;
  mensagem: string;
  horarioAtualizado?: string;
  dia?: string;
  hora?: string;
  podeExecutar?: boolean;
  motivo?: string;
}

export function useDispararEnvio() {
  const [loading, setLoading] = useState(false);

  const dispararEnvio = async (): Promise<ResultadoDisparo | null> => {
    try {
      setLoading(true);

      const resposta = await fetch('/api/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!resposta.ok) {
        const dados = await resposta.json();
        const mensagemErro = dados.mensagem || 'Erro ao executar envio';

        console.error('❌ Erro ao disparar:', {
          status: resposta.status,
          dados,
        });

        toast.error(mensagemErro, {
          duration: 5000,
          icon: '⚠️',
        });

        return dados;
      }

      const dados: ResultadoDisparo = await resposta.json();

      toast.success(dados.mensagem || 'Envio iniciado com sucesso!', {
        duration: 3000,
        icon: '✅',
      });

      console.log('✅ Fluxo disparado:', dados);
      return dados;
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Erro ao conectar com o servidor';
      
      console.error('❌ Erro:', erro, {
        mensagem,
        stack: erro instanceof Error ? erro.stack : '',
      });

      toast.error(mensagem, {
        duration: 5000,
        icon: '❌',
      });

      return null;
    } finally {
      setLoading(false);
    }
  };

  const verificarDisponibilidade = async (): Promise<ResultadoDisparo | null> => {
    try {
      const resposta = await fetch('/api/n8n', {
        method: 'GET',
      });

      if (!resposta.ok) {
        console.error('❌ Erro ao verificar disponibilidade. Status:', resposta.status);
        return null;
      }

      const dados = await resposta.json();

      console.log('📋 Status de disponibilidade:', dados);

      return dados;
    } catch (erro) {
      console.error('❌ Erro ao verificar disponibilidade:', erro);
      return null;
    }
  };

  return {
    dispararEnvio,
    verificarDisponibilidade,
    loading,
  };
}
