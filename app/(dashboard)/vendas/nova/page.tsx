'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClientes } from '@/hooks/useClientes';
import { Timestamp, collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  const [loading, setLoading] = useState(false);
  
  // Dados do cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  
  // Dados da venda
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novoProduto, setNovoProduto] = useState({ nome: '', valor: 0 });
  const [observacoes, setObservacoes] = useState('');
  const [provou, setProva] = useState(false);

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(nome.toLowerCase())
  );

  const selecionarCliente = (cliente: Cliente) => {
    setClienteExistente(cliente);
    setNome(cliente.nome);
    setTelefone(cliente.telefone);
    setDataNascimento(cliente.dataNascimento || '');
    setMostrarSugestoes(false);
  };

  const handleNomeChange = (value: string) => {
    setNome(value);
    setClienteExistente(null);
    setMostrarSugestoes(true);
  };

  const formatarDataNascimento = (value: string) => {
    const apenasNumeros = value.replace(/\D/g, '');
    
    if (apenasNumeros.length <= 2) {
      return apenasNumeros;
    } else if (apenasNumeros.length <= 4) {
      return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
    } else {
      return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4, 8)}`;
    }
  };

  const handleDataNascimentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarDataNascimento(e.target.value);
    setDataNascimento(formatted);
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

    // Validações
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
      const agora = Timestamp.now();

      let clienteId: string;

      // Se cliente não existe, criar novo
      if (!clienteExistente) {
        const clienteData: any = {
          dataCadastro: agora,
          nome: nome.trim(),
          telefone: telefone.trim(),
          provou: false,
          status: 'pendente',
          createdAt: agora,
          updatedAt: agora,
        };

        if (dataNascimento) {
          clienteData.dataNascimento = dataNascimento;
        }

        const clienteRef = await addDoc(collection(db, 'clientes'), clienteData);
        clienteId = clienteRef.id;
        toast.success('Novo cliente cadastrado!');
      } else {
        clienteId = clienteExistente.id;
      }

      // Criar venda (mesmo sem produtos)
      const valorTotal = produtos.reduce((sum, p) => sum + p.valor, 0);

      const vendaRef = await addDoc(collection(db, 'vendas'), {
        dataVenda: agora,
        valorTotal,
        produtos,
        vendedora: 'Sistema',
        clienteId,
        observacoes,
        status: 'pendente',
        provou,
        createdAt: agora,
      });

      // Atualizar cliente
      await updateDoc(doc(db, 'clientes', clienteId), {
        status: 'pendente',
        vendaId: vendaRef.id,
        provou,
        updatedAt: agora,
      });

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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Nova Venda
        </h1>
        <p className="text-gray-400 mt-2">Registre uma nova venda</p>
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
                      <div>
                        <p className="font-medium text-white">{cliente.nome}</p>
                        <p className="text-sm text-gray-400">{cliente.telefone}</p>
                      </div>
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

            <Input
              label="Telefone (com DDD)"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="47991234567"
              required
              helperText="Apenas números, com DDD. Ex: 47991234567"
              disabled={clienteExistente !== null}
            />

            <Input
              label="Data de Nascimento"
              value={dataNascimento}
              onChange={handleDataNascimentoChange}
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
                  Cliente provou mas não comprou?
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
                  <div key={index} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
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
                className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Ex: Cliente gostou muito da blusa azul..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={loading} disabled={loading}>
            Registrar Venda
          </Button>
          <Link href="/vendas">
            <Button type="button" variant="secondary" disabled={loading}>
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}