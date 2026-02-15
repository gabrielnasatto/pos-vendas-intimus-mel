'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Venda, VendaCompleta } from '@/types';
import toast from 'react-hot-toast';

export function useVendas() {
  const [vendas, setVendas] = useState<VendaCompleta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVendas = async () => {
    try {
      setLoading(true);
      
      const q = query(
        collection(db, 'vendas'),
        orderBy('dataVenda', 'desc')
      );

      const snapshot = await getDocs(q);
      
      const vendasPromises = snapshot.docs.map(async (vendaDoc) => {
        const vendaData = { id: vendaDoc.id, ...vendaDoc.data() } as Venda;
        
        if (vendaData.clienteId) {
          try {
            const clienteDoc = await getDoc(doc(db, 'clientes', vendaData.clienteId));
            if (clienteDoc.exists()) {
              return {
                ...vendaData,
                nomeCliente: clienteDoc.data().nome,
              } as VendaCompleta;
            }
          } catch (error) {
            console.error('Erro ao buscar cliente:', error);
          }
        }
        
        return vendaData as VendaCompleta;
      });

      const vendasData = await Promise.all(vendasPromises);
      setVendas(vendasData);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOVO: Deletar venda
  const deletarVenda = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'vendas', id));
      toast.success('Venda deletada com sucesso!');
      fetchVendas(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao deletar venda:', error);
      toast.error('Erro ao deletar venda');
      throw error;
    }
  };

  // ✅ NOVO: Atualizar status da venda
  const atualizarStatusVenda = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'vendas', id), {
        status,
      });
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
  };
}