'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Cliente, Venda } from '@/types';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Phone, Calendar, ShoppingBag, Plus, Edit } from 'lucide-react';
import { formatarData, formatarTelefone, calcularIdade, formatarMoeda } from '@/lib/utils';
import toast from 'react-hot-toast';

function toFakeTimestamp(dateStr: string | null | undefined): any {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return { toDate: () => date };
}

export default function ClienteDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchCliente(params.id as string);
      fetchVendasDoCliente(params.id as string);
    }
  }, [params?.id]);

  const fetchCliente = async (id: string) => {
    try {
      const res = await fetch(`/api/clientes/${id}`);
      const data = await res.json();
      if (data.success) {
        const raw = data.cliente;
        setCliente({
          ...raw,
          dataCadastro: toFakeTimestamp(raw.dataCadastro),
          dataEnvio: raw.dataEnvio ? toFakeTimestamp(raw.dataEnvio) : undefined,
          createdAt: toFakeTimestamp(raw.createdAt),
          updatedAt: toFakeTimestamp(raw.updatedAt),
        } as Cliente);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendasDoCliente = async (clienteId: string) => {
    try {
      const res = await fetch(`/api/vendas?clienteId=${clienteId}`);
      const data = await res.json();
      if (data.success) {
        setVendas(
          (data.vendas as any[]).map((v: any) => ({
            ...v,
            dataVenda: toFakeTimestamp(v.dataVenda),
            createdAt: toFakeTimestamp(v.createdAt),
            dataEnvio: v.dataEnvio ? toFakeTimestamp(v.dataEnvio) : undefined,
          })) as Venda[]
        );
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    }
  };

  const handleDelete = async () => {
    if (!cliente) return;

    if (
      confirm(
        `Tem certeza que deseja deletar o cliente "${cliente.nome}"?\n\nAtenção: Todas as vendas vinculadas também serão removidas!`
      )
    ) {
      try {
        setDeleting(true);

        const res = await fetch(`/api/clientes?clienteId=${cliente.id}`, { method: 'DELETE' });
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        toast.success('Cliente e vendas deletados com sucesso!');
        router.push('/clientes');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao deletar cliente');
      } finally {
        setDeleting(false);
      }
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Cliente não encontrado</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              {cliente.nome}
            </h1>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">Detalhes e histórico do cliente</p>
          </div>
          <Link href={`/clientes/${cliente.id}/editar`} className="self-start sm:self-auto">
            <Button variant="secondary">
              <Edit className="w-4 h-4 mr-2" />
              Editar
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
                <p className="text-sm text-gray-400">Telefone</p>
                <p className="font-medium text-white">{formatarTelefone(cliente.telefone)}</p>
              </div>
            </div>

            {cliente.dataNascimento && (
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-400">Data de Nascimento</p>
                  <p className="font-medium text-white">
                    {cliente.dataNascimento} ({calcularIdade(cliente.dataNascimento)} anos)
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <ShoppingBag className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-400">Cadastrado em</p>
                <p className="font-medium text-white">{formatarData(cliente.dataCadastro)}</p>
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
              <p className="text-sm text-gray-400">Total de Vendas</p>
              <p className="text-3xl font-bold text-white">{vendas.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Gasto</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                {formatarMoeda(totalGasto)}
              </p>
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
              loading={deleting}
              disabled={deleting}
              className="w-full"
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
              <p className="text-gray-400 mb-4">Nenhuma venda registrada ainda</p>
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
                <div
                  key={venda.id}
                  className="border border-burgundy-800/30 rounded-xl p-4 hover:bg-burgundy-900/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">{formatarData(venda.dataVenda)}</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                      {formatarMoeda(venda.valorTotal)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <strong>Produtos:</strong>{' '}
                    {venda.produtos.length > 0
                      ? venda.produtos.map((p) => p.nome).join(', ')
                      : 'Sem produtos'}
                  </div>
                  {venda.observacoes && (
                    <div className="text-sm text-gray-400 mt-2">
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
