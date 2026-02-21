'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClientes } from '@/hooks/useClientes';
import { useDataNascimento } from '@/hooks/useDataNascimento';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Produto, Cliente } from '@/types';
import toast from 'react-hot-toast';
import { validarTelefone, validarDataNascimento } from '@/lib/utils';

export default function NovaVendaPage() {
  const router = useRouter();
  const { clientes } = useClientes();
  const { dataNascimento, handleDataNascimentoChange, setDataNascimento } = useDataNascimento();
  const [loading, setLoading] = useState(false);

  // Dados do cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [mostrarSugestoesTelefone, setMostrarSugestoesTelefone] = useState(false);

  // Dados da venda
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novoProduto, setNovoProduto] = useState({ nome: '', valor: 0 });
  const [valorInputProduto, setValorInputProduto] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [provou, setProva] = useState(false);

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(nome.toLowerCase())
  );

  const telefoneSomenteDigitos = telefone.replace(/\D/g, '');
  const clientesFiltradosPorTelefone =
    telefoneSomenteDigitos.length >= 4
      ? clientes.filter((c) => c.telefone.replace(/\D/g, '').includes(telefoneSomenteDigitos))
      : [];

  const selecionarCliente = (cliente: Cliente) => {
    setClienteExistente(cliente);
    setNome(cliente.nome);
    setTelefone(cliente.telefone);
    setDataNascimento(cliente.dataNascimento || '');
    setMostrarSugestoes(false);
    setMostrarSugestoesTelefone(false);
  };

  const handleNomeChange = (value: string) => {
    setNome(value);
    setClienteExistente(null);
    setMostrarSugestoes(true);
  };

  const handleTelefoneChange = (value: string) => {
    const soNumeros = value.replace(/\D/g, '');
    setTelefone(soNumeros);
    setClienteExistente(null);
    setMostrarSugestoesTelefone(true);
  };

  const adicionarProduto = () => {
    if (novoProduto.nome && novoProduto.valor > 0) {
      setProdutos([...produtos, novoProduto]);
      setNovoProduto({ nome: '', valor: 0 });
      setValorInputProduto('');
    }
  };

  const handleValorProdutoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.replace(/[^\d,]/g, '');
    setValorInputProduto(filtered);
  };

  const handleBlurValor = () => {
    let valor = valorInputProduto.trim();
    if (!valor) {
      setNovoProduto({ ...novoProduto, valor: 0 });
      setValorInputProduto('');
      return;
    }
    valor = valor.replace(/[^\d.,]/g, '').replace(/,/g, '.');
    const partes = valor.split('.');
    if (partes.length > 2) {
      valor = partes[0] + '.' + partes.slice(1).join('');
    }
    const numeroValor = valor ? Number(valor) : 0;
    setNovoProduto({ ...novoProduto, valor: numeroValor });
    if (numeroValor > 0) {
      setValorInputProduto(numeroValor.toFixed(2).replace('.', ','));
    } else {
      setValorInputProduto('');
    }
  };

  const handleKeyDownProduto = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (valorInputProduto) handleBlurValor();
      setTimeout(() => adicionarProduto(), 0);
    }
  };

  const removerProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error('Nome do cliente é obrigatório!');
      return;
    }
    if (!telefone.trim() || !validarTelefone(telefone)) {
      toast.error('Telefone inválido! Use formato: 47991234567');
      return;
    }
    if (dataNascimento && !validarDataNascimento(dataNascimento)) {
      toast.error('Data de nascimento inválida! Use formato: DD/MM/AAAA');
      return;
    }

    try {
      setLoading(true);

      let clienteId: string;

      if (!clienteExistente) {
        // Verificar duplicidade de telefone
        const telefoneDigitos = telefone.trim().replace(/\D/g, '');
        const clienteComMesmoTelefone = clientes.find(
          (c) => c.telefone.replace(/\D/g, '') === telefoneDigitos
        );
        if (clienteComMesmoTelefone) {
          toast.error(
            `Número já cadastrado para ${clienteComMesmoTelefone.nome}. Selecione o cliente existente ou use outro número.`
          );
          setLoading(false);
          return;
        }

        // Criar novo cliente
        const clienteRes = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome.trim(),
            telefone: telefone.trim(),
            dataNascimento: dataNascimento || undefined,
            provou: false,
          }),
        });
        const clienteData = await clienteRes.json();
        if (!clienteData.success) throw new Error(clienteData.error);
        clienteId = clienteData.clienteId;
        toast.success('Novo cliente cadastrado!');
      } else {
        clienteId = clienteExistente.id;
      }

      // Criar venda
      const valorTotal = produtos.reduce((sum, p) => sum + p.valor, 0);
      const vendaRes = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          valorTotal,
          produtos,
          observacoes,
          provou,
          vendedora: 'Sistema',
        }),
      });
      const vendaData = await vendaRes.json();
      if (!vendaData.success) throw new Error(vendaData.error);

      toast.success('Venda registrada com sucesso!');
      router.push('/vendas');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar venda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/vendas">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Nova Venda
        </h1>
        <p className="text-gray-400 mt-2 text-sm sm:text-base">Registre uma nova venda</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="relative">
              <Input
                label="Nome Completo"
                value={nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                onFocus={() => setMostrarSugestoes(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                placeholder="Digite o nome do cliente..."
                required
              />
              {mostrarSugestoes && nome && clientesFiltrados.length > 0 && !clienteExistente && (
                <div className="absolute z-10 w-full mt-2 glass-dark border border-dark-700 rounded-xl shadow-2xl max-h-60 overflow-auto">
                  {clientesFiltrados.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => selecionarCliente(cliente)}
                      className="w-full px-4 py-3 text-left hover:bg-dark-800/50 transition-colors border-b border-dark-700/50 last:border-0"
                    >
                      <p className="font-medium text-white">{cliente.nome}</p>
                      <p className="text-sm text-gray-400">{cliente.telefone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {clienteExistente && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 font-medium">✓ Cliente existente selecionado</p>
                <button
                  type="button"
                  onClick={() => {
                    setClienteExistente(null);
                    setNome('');
                    setTelefone('');
                    setDataNascimento('');
                  }}
                  className="text-sm text-green-400 hover:text-green-300 mt-2 underline"
                >
                  Cadastrar novo cliente
                </button>
              </div>
            )}

            <div className="relative">
              <Input
                label="Telefone (com DDD)"
                value={telefone}
                onChange={(e) => handleTelefoneChange(e.target.value)}
                onFocus={() => setMostrarSugestoesTelefone(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoesTelefone(false), 200)}
                placeholder="47991234567"
                required
                inputMode="numeric"
                maxLength={11}
                helperText="Apenas números, com DDD. Ex: 47991234567"
                disabled={clienteExistente !== null}
              />
              {mostrarSugestoesTelefone &&
                !clienteExistente &&
                clientesFiltradosPorTelefone.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 glass-dark border border-dark-700 rounded-xl shadow-2xl max-h-60 overflow-auto">
                    {clientesFiltradosPorTelefone.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => selecionarCliente(cliente)}
                        className="w-full px-4 py-3 text-left hover:bg-dark-800/50 transition-colors border-b border-dark-700/50 last:border-0"
                      >
                        <p className="font-medium text-white">{cliente.nome}</p>
                        <p className="text-sm text-gray-400">{cliente.telefone}</p>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <Input
              label="Data de Nascimento"
              value={dataNascimento}
              onChange={(e) => handleDataNascimentoChange(e.target.value)}
              placeholder="DD/MM/AAAA"
              maxLength={10}
              helperText="Formato: DD/MM/AAAA (opcional)"
              disabled={clienteExistente !== null}
            />

            <div>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={provou}
                  onChange={(e) => setProva(e.target.checked)}
                  className="w-5 h-5 text-primary-600 bg-dark-800 border-dark-700 rounded focus:ring-primary-500 focus:ring-offset-dark-950"
                />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  Cliente provou na loja?
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Produtos (Opcional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Nome do produto"
                value={novoProduto.nome}
                onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                onKeyDown={handleKeyDownProduto}
                className="flex-1"
              />
              <div className="flex gap-3">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="10,50"
                  value={valorInputProduto}
                  onChange={handleValorProdutoChange}
                  onBlur={handleBlurValor}
                  onKeyDown={handleKeyDownProduto}
                  className="flex-1 sm:w-32 sm:flex-none"
                />
                <Button type="button" onClick={adicionarProduto} size="sm" className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {produtos.length > 0 && (
              <div className="space-y-3">
                {produtos.map((produto, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-dark-700/50"
                  >
                    <span className="text-sm text-white">
                      {produto.nome} -{' '}
                      <span className="text-green-400 font-semibold">
                        R$ {produto.valor.toFixed(2)}
                      </span>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Ex: Cliente gostou muito da blusa azul..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" loading={loading} disabled={loading} className="sm:w-auto">
            Registrar Venda
          </Button>
          <Link href="/vendas" className="sm:w-auto">
            <Button type="button" variant="secondary" disabled={loading} className="w-full">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
