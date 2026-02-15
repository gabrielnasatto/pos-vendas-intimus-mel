'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Cliente, Venda } from '@/types';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Phone, Calendar, ShoppingBag, Plus } from 'lucide-react';
import { formatarData, formatarTelefone, calcularIdade, formatarMoeda } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ClienteDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchCliente(params.id as string);
      fetchVendasDoCliente(params.id as string);
    }
  }, [params.id]);

  const fetchCliente = async (id: string) => {
    try {
      const clienteDoc = await getDoc(doc(db, 'clientes', id));
      if (clienteDoc.exists()) {
        setCliente({ id: clienteDoc.id, ...clienteDoc.data() } as Cliente);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendasDoCliente = async (clienteId: string) => {
    try {
      const q = query(
        collection(db, 'vendas'),
        where('clienteId', '==', clienteId)
      );
      const snapshot = await getDocs(q);
      const vendasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Venda[];
      setVendas(vendasData);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    }
  };

  const handleDelete = async () => {
    if (!cliente) return;
    
    if (confirm(`Tem certeza que deseja deletar o cliente "${cliente.nome}"?\n\nAtenção: Todas as vendas vinculadas também serão removidas!`)) {
      try {
        setLoading(true);
        
        // ✅ Buscar e deletar TODAS as vendas do cliente
        const vendasRef = collection(db, 'vendas');
        const q = query(vendasRef, where('clienteId', '==', cliente.id));
        const vendasSnapshot = await getDocs(q);
        
        // Deletar cada venda encontrada
        const deletePromises = vendasSnapshot.docs.map(vendaDoc => 
          deleteDoc(doc(db, 'vendas', vendaDoc.id))
        );
        
        await Promise.all(deletePromises);
        
        // Deletar cliente
        await deleteDoc(doc(db, 'clientes', cliente.id));
        
        toast.success('Cliente e vendas deletados com sucesso!');
        router.push('/clientes');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao deletar cliente');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Cliente não encontrado</p>
        <Link href="/clientes">
          <Button>Voltar para Clientes</Button>
        </Link>
      </div>
    );
  }

  const totalGasto = vendas.reduce((sum, v) => sum + v.valorTotal, 0);

  return (
    <div>
      <div className="mb-8">
        <Link href="/clientes">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">{cliente.nome}</h1>
            <p className="text-gray-600 mt-2">Detalhes e histórico do cliente</p>
          </div>
          <Link href="/vendas/nova">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Phone className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="font-medium">{formatarTelefone(cliente.telefone)}</p>
              </div>
            </div>

            {cliente.dataNascimento && (
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Data de Nascimento</p>
                  <p className="font-medium">
                    {cliente.dataNascimento} ({calcularIdade(cliente.dataNascimento)} anos)
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <ShoppingBag className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Cadastrado em</p>
                <p className="font-medium">{formatarData(cliente.dataCadastro)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Total de Vendas</p>
              <p className="text-3xl font-bold">{vendas.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Gasto</p>
              <p className="text-2xl font-bold text-green-600">{formatarMoeda(totalGasto)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/vendas/nova">
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Nova Venda
              </Button>
            </Link>
            <Button 
              variant="danger" 
              onClick={handleDelete}
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              Deletar Cliente
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {vendas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Nenhuma venda registrada ainda</p>
              <Link href="/vendas/nova">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primeira Venda
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {vendas.map((venda) => (
                <div key={venda.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-200">{formatarData(venda.dataVenda)}</span>
                    <span className="text-lg font-bold">{formatarMoeda(venda.valorTotal)}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <strong>Produtos:</strong> {venda.produtos.map(p => p.nome).join(', ')}
                  </div>
                  {venda.observacoes && (
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Obs:</strong> {venda.observacoes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}