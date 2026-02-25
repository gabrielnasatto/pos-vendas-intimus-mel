'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Calendar, User, ShoppingBag, DollarSign, AlertTriangle } from 'lucide-react';
import { formatarData, formatarMoeda } from '@/lib/utils';
import toast from 'react-hot-toast';

function toFakeTimestamp(dateStr: string | null | undefined): any {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return { toDate: () => date };
}

export default function VendaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const [venda, setVenda] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      fetchVenda(params.id as string);
    }
  }, [params?.id]);

  const fetchVenda = async (id: string) => {
    try {
      const res = await fetch(`/api/vendas?vendaId=${id}`);
      const data = await res.json();

      if (data.success) {
        const v = data.venda;
        const vendaFormatada = {
          ...v,
          dataVenda: toFakeTimestamp(v.dataVenda),
          createdAt: toFakeTimestamp(v.createdAt),
          dataEnvio: v.dataEnvio ? toFakeTimestamp(v.dataEnvio) : undefined,
        };
        setVenda(vendaFormatada);

        if (v.clienteId) {
          const clienteRes = await fetch(`/api/clientes/${v.clienteId}`);
          const clienteData = await clienteRes.json();
          if (clienteData.success) {
            setCliente(clienteData.cliente);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar venda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!venda) return;

    if (confirm('Tem certeza que deseja deletar esta venda?')) {
      try {
        const res = await fetch(`/api/vendas?vendaId=${venda.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        toast.success('Venda deletada com sucesso!');
        router.push('/vendas');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao deletar venda');
      }
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!venda) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Venda não encontrada</p>
        <Link href="/vendas">
          <Button>Voltar para Vendas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/vendas">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Detalhes da Venda
            </h1>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">Informações completas</p>
          </div>
          <Badge status={venda.status || 'pendente'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-400">Data da Venda</p>
                <p className="font-medium text-white">{formatarData(venda.dataVenda)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-400">Valor Total</p>
                <p className="font-medium text-white">{formatarMoeda(venda.valorTotal)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <User className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-400">Vendedora</p>
                <p className="font-medium text-white">{venda.vendedora}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {cliente ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Nome</p>
                  <p className="font-medium text-white">{cliente.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Telefone</p>
                  <p className="font-medium text-white">{cliente.telefone}</p>
                </div>
                <Link href={`/clientes/${cliente.id}`}>
                  <Button size="sm" variant="secondary" className="mt-2">
                    Ver Perfil do Cliente
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-gray-400">Cliente não encontrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {venda.produtos && venda.produtos.length > 0 ? (
            <div className="space-y-3">
              {venda.produtos.map((produto: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-burgundy-900/30 rounded-xl border border-burgundy-800/30"
                >
                  <div className="flex items-center">
                    <ShoppingBag className="w-5 h-5 text-primary-500 mr-3" />
                    <span className="text-white font-medium">{produto.nome}</span>
                  </div>
                  <span className="text-primary-400 font-semibold">
                    {formatarMoeda(produto.valor)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Nenhum produto registrado</p>
          )}
        </CardContent>
      </Card>

      {venda.observacoes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">{venda.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {venda.status === 'erro' && (
        <Card className="mb-6 border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Erro no Envio WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-red-300">{venda.erroEnvio || 'Falha no envio via WhatsApp'}</p>
            {venda.erroEm && (
              <p className="text-xs text-gray-500">
                Ocorreu em: {formatarData(venda.erroEm)}
              </p>
            )}
            {venda.tentativas !== undefined && (
              <p className="text-xs text-gray-500">
                Tentativas realizadas: {venda.tentativas}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={`/vendas/${venda.id}/editar`} className="sm:w-auto">
          <Button variant="secondary" className="w-full">Editar Venda</Button>
        </Link>
        <Button variant="danger" onClick={handleDelete} className="sm:w-auto">
          Deletar Venda
        </Button>
      </div>
    </div>
  );
}
