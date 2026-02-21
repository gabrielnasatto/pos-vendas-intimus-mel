'use client';

import { useState, useEffect } from 'react';
import { Cliente, ClienteFormData, FiltrosClientes } from '@/types';
import toast from 'react-hot-toast';

// Converte uma string ISO (retornada pela API) para um objeto compatível com Timestamp
function toFakeTimestamp(dateStr: string | null | undefined): any {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return {
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  };
}

function parseCliente(raw: any): Cliente {
  return {
    ...raw,
    dataCadastro: toFakeTimestamp(raw.dataCadastro),
    dataEnvio: raw.dataEnvio ? toFakeTimestamp(raw.dataEnvio) : undefined,
    createdAt: toFakeTimestamp(raw.createdAt),
    updatedAt: toFakeTimestamp(raw.updatedAt),
  } as Cliente;
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientes = async (filtros?: FiltrosClientes) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filtros?.status) params.set('status', filtros.status);

      const url = `/api/clientes${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Erro ao buscar clientes');

      setClientes((data.clientes as any[]).map(parseCliente));
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const getCliente = async (id: string): Promise<Cliente | null> => {
    try {
      const res = await fetch(`/api/clientes/${id}`);
      const data = await res.json();

      if (!data.success) return null;

      return parseCliente(data.cliente);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      toast.error('Erro ao carregar cliente');
      return null;
    }
  };

  const criarCliente = async (formData: ClienteFormData): Promise<string | undefined> => {
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          telefone: formData.telefone,
          dataNascimento: formData.dataNascimento,
          provou: formData.provou,
          valorTotal: formData.valorTotal,
          produtos: formData.produtos,
          observacoes: formData.observacoes,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao criar cliente');

      toast.success('Cliente cadastrado com sucesso!');
      fetchClientes();

      return data.clienteId;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao cadastrar cliente');
      throw error;
    }
  };

  const atualizarCliente = async (id: string, fields: Partial<Cliente>) => {
    try {
      const res = await fetch('/api/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: id, ...fields }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao atualizar cliente');

      toast.success('Cliente atualizado com sucesso!');
      fetchClientes();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
      throw error;
    }
  };

  const deletarCliente = async (id: string) => {
    try {
      const res = await fetch(`/api/clientes?clienteId=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao deletar cliente');

      toast.success('Cliente deletado com sucesso!');
      fetchClientes();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      toast.error('Erro ao deletar cliente');
      throw error;
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return {
    clientes,
    loading,
    fetchClientes,
    getCliente,
    criarCliente,
    atualizarCliente,
    deletarCliente,
  };
}
