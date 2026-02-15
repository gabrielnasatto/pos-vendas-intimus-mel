'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cliente, ClienteFormData, Venda, FiltrosClientes } from '@/types';
import toast from 'react-hot-toast';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientes = async (filtros?: FiltrosClientes) => {
    try {
      setLoading(true);
      
      let q = query(
        collection(db, 'clientes'),
        orderBy('dataCadastro', 'desc')
      );

      if (filtros?.status) {
        q = query(q, where('status', '==', filtros.status));
      }

      const snapshot = await getDocs(q);
      const clientesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cliente[];

      setClientes(clientesData);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const getCliente = async (id: string): Promise<Cliente | null> => {
    try {
      const clienteDoc = await getDocs(
        query(collection(db, 'clientes'), where('__name__', '==', id))
      );
      
      if (clienteDoc.empty) return null;
      
      const docData = clienteDoc.docs[0];
      return { id: docData.id, ...docData.data() } as Cliente;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      toast.error('Erro ao carregar cliente');
      return null;
    }
  };

  // ✅ NOVO: Buscar cliente por telefone
  const buscarClientePorTelefone = async (telefone: string): Promise<Cliente | null> => {
    try {
      const q = query(
        collection(db, 'clientes'),
        where('telefone', '==', telefone)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() } as Cliente;
    } catch (error) {
      console.error('Erro ao buscar cliente por telefone:', error);
      return null;
    }
  };

  // ✅ NOVO: Adicionar venda para cliente existente
  const adicionarVendaParaCliente = async (clienteId: string, vendaData: Omit<Venda, 'id' | 'clienteId'>) => {
    try {
      const agora = Timestamp.now();
      
      const venda: Omit<Venda, 'id'> = {
        ...vendaData,
        clienteId,
        dataVenda: agora,
        createdAt: agora,
      };
      
      const vendaRef = await addDoc(collection(db, 'vendas'), venda);
      
      // Atualizar cliente para status pendente novamente
      await updateDoc(doc(db, 'clientes', clienteId), {
        status: 'pendente',
        vendaId: vendaRef.id,
        updatedAt: serverTimestamp(),
      });
      
      toast.success('Nova venda registrada para o cliente!');
      fetchClientes();
      
      return vendaRef.id;
    } catch (error) {
      console.error('Erro ao adicionar venda:', error);
      toast.error('Erro ao registrar venda');
      throw error;
    }
  };

  const criarCliente = async (data: ClienteFormData) => {
    try {
      const agora = Timestamp.now();
      
      let vendaId: string | undefined;
      
      if (data.valorTotal && data.produtos && data.produtos.length > 0) {
        const vendaData: any = { // ✅ Mude para any
          dataVenda: agora,
          valorTotal: data.valorTotal,
          produtos: data.produtos,
          vendedora: 'Sistema',
          clienteId: '',
          observacoes: data.observacoes,
          createdAt: agora,
        };
        
        const vendaRef = await addDoc(collection(db, 'vendas'), vendaData);
        vendaId = vendaRef.id;
      }

      const clienteData: any = {
        dataCadastro: agora,
        nome: data.nome,
        telefone: data.telefone,
        provou: data.provou,
        status: 'pendente',
        createdAt: agora,
        updatedAt: agora,
      };

      if (data.dataNascimento) {
        clienteData.dataNascimento = data.dataNascimento;
      }

      if (vendaId) {
        clienteData.vendaId = vendaId;
      }

      const clienteRef = await addDoc(collection(db, 'clientes'), clienteData);

      if (vendaId) {
        await updateDoc(doc(db, 'vendas', vendaId), {
          clienteId: clienteRef.id,
        });
      }

      toast.success('Cliente cadastrado com sucesso!');
      fetchClientes();
      
      return clienteRef.id;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao cadastrar cliente');
      throw error;
    }
  };

  const atualizarCliente = async (id: string, data: Partial<Cliente>) => {
    try {
      await updateDoc(doc(db, 'clientes', id), {
        ...data,
        updatedAt: serverTimestamp(),
      });

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
      await deleteDoc(doc(db, 'clientes', id));
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
    buscarClientePorTelefone,
    adicionarVendaParaCliente,
    criarCliente,
    atualizarCliente,
    deletarCliente,
  };
}