'use client';

import { useState, useEffect } from 'react';
import { VendaCompleta } from '@/types';
import toast from 'react-hot-toast';

function toFakeTimestamp(dateStr: string | null | undefined): any {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return {
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  };
}

function parseVenda(raw: any): VendaCompleta {
  return {
    ...raw,
    dataVenda: toFakeTimestamp(raw.dataVenda),
    dataEnvio: raw.dataEnvio ? toFakeTimestamp(raw.dataEnvio) : undefined,
    createdAt: toFakeTimestamp(raw.createdAt),
  } as VendaCompleta;
}

export function useVendas() {
  const [vendas, setVendas] = useState<VendaCompleta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVendas = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/vendas');
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Erro ao buscar vendas');

      setVendas((data.vendas as any[]).map(parseVenda));
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletarVenda = async (id: string) => {
    try {
      const res = await fetch(`/api/vendas?vendaId=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao deletar venda');

      toast.success('Venda deletada com sucesso!');
      fetchVendas();
    } catch (error) {
      console.error('Erro ao deletar venda:', error);
      toast.error('Erro ao deletar venda');
      throw error;
    }
  };

  const resetarErros = async (): Promise<number> => {
    try {
      const res = await fetch('/api/vendas/resetar-erros', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao resetar vendas');

      toast.success(`${data.total} venda(s) recolocada(s) na fila!`);
      await fetchVendas();
      return data.total;
    } catch (error) {
      console.error('Erro ao resetar vendas com erro:', error);
      toast.error('Erro ao reenviar mensagens');
      throw error;
    }
  };

  const atualizarStatusVenda = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/vendas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendaId: id, status }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao atualizar status');

      toast.success('Status atualizado!');
      fetchVendas();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
      throw error;
    }
  };

  useEffect(() => {
    fetchVendas();
  }, []);

  return {
    vendas,
    loading,
    fetchVendas,
    deletarVenda,
    atualizarStatusVenda,
    resetarErros,
  };
}
