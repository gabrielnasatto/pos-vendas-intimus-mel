'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Produto } from '@/types';
import toast from 'react-hot-toast';

export default function EditarVendaPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const [nomeCliente, setNomeCliente] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novoProduto, setNovoProduto] = useState({ nome: '', valor: 0 });
  const [observacoes, setObservacoes] = useState('');
  const [provou, setProva] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchVenda(params.id as string);
    }
  }, [params.id]);

  const fetchVenda = async (id: string) => {
    try {
      const vendaDoc = await getDoc(doc(db, 'vendas', id));
      if (vendaDoc.exists()) {
        const data = vendaDoc.data();
        setProdutos(data.produtos || []);
        setObservacoes(data.observacoes || '');
        setProva(data.provou || false);

        // Buscar nome do cliente
        if (data.clienteId) {
          const clienteDoc = await getDoc(doc(db, 'clientes', data.clienteId));
          if (clienteDoc.exists()) {
            setNomeCliente(clienteDoc.data().nome);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar venda:', error);
      toast.error('Erro ao carregar dados da venda');
    } finally {
      setLoadingData(false);
    }
  };

  const adicionarProduto = () => {
    if (novoProduto.nome && novoProduto.valor > 0) {
      setProdutos([...produtos, novoProduto]);
      setNovoProduto({ nome: '', valor: 0 });
    }
  };

  const removerProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const valorTotal = produtos.reduce((sum, p) => sum + p.valor, 0);

      await updateDoc(doc(db, 'vendas', params.id as string), {
        valorTotal,
        produtos,
        observacoes,
        provou,
        updatedAt: Timestamp.now(),
      });

      toast.success('Venda atualizada com sucesso!');
      router.push(`/vendas/${params.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar venda');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <Link href={`/vendas/${params.id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Editar Venda
        </h1>
        <p className="text-gray-400 mt-2">Atualize os dados da venda</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-burgundy-900/30 border border-burgundy-800/30 rounded-xl p-4">
              <p className="text-white font-medium">{nomeCliente}</p>
              <p className="text-sm text-gray-400 mt-1">O cliente não pode ser alterado</p>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={provou}
                  onChange={(e) => setProva(e.target.checked)}
                  className="w-5 h-5 text-primary-600 bg-burgundy-900 border-burgundy-800 rounded focus:ring-primary-500 focus:ring-offset-burgundy-950"
                />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  Cliente provou mas não comprou?
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex gap-3">
              <Input
                placeholder="Nome do produto"
                value={novoProduto.nome}
                onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Valor"
                value={novoProduto.valor || ''}
                onChange={(e) => setNovoProduto({ ...novoProduto, valor: Number(e.target.value) })}
                className="w-32"
              />
              <Button type="button" onClick={adicionarProduto} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {produtos.length > 0 && (
              <div className="space-y-3">
                {produtos.map((produto, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-burgundy-900/30 rounded-xl border border-burgundy-800/30">
                    <span className="text-sm text-white">
                      {produto.nome} - <span className="text-green-400 font-semibold">R$ {produto.valor.toFixed(2)}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerProduto(index)}
                      className="hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="text-right p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/30">
                  <span className="text-sm text-gray-400 mr-2">Total:</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                    R$ {produtos.reduce((sum, p) => sum + p.valor, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Observações
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-4 py-3 bg-burgundy-900/50 border border-burgundy-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Ex: Cliente gostou muito da blusa azul..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={loading} disabled={loading}>
            Salvar Alterações
          </Button>
          <Link href={`/vendas/${params.id}`}>
            <Button type="button" variant="secondary" disabled={loading}>
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}