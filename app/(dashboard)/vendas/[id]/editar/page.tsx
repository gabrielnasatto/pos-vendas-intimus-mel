'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useClientes } from '@/hooks/useClientes';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Plus, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Produto, Cliente } from '@/types';
import toast from 'react-hot-toast';
import { validarTelefone, validarDataNascimento } from '@/lib/utils';

export default function EditarVendaPage() {
  const router = useRouter();
  const params = useParams();
  const { clientes } = useClientes();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Cliente
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [clienteIdOriginal, setClienteIdOriginal] = useState('');
  
  // Estados para cadastro de novo cliente
  const [mostrarFormNovoCliente, setMostrarFormNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [novoClienteDataNascimento, setNovoClienteDataNascimento] = useState('');
  
  // Venda
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novoProduto, setNovoProduto] = useState({ nome: '', valor: 0 });
  const [observacoes, setObservacoes] = useState('');
  const [provou, setProva] = useState(false);

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  useEffect(() => {
    if (params?.id) {
      fetchVenda(params?.id as string);
    }
  }, [params?.id]);

  const fetchVenda = async (id: string) => {
    try {
      const vendaDoc = await getDoc(doc(db, 'vendas', id));
      if (vendaDoc.exists()) {
        const data = vendaDoc.data();
        setProdutos(data.produtos || []);
        setObservacoes(data.observacoes || '');
        setProva(data.provou || false);
        setClienteIdOriginal(data.clienteId || '');

        // Buscar cliente atual
        if (data.clienteId) {
          const clienteDoc = await getDoc(doc(db, 'clientes', data.clienteId));
          if (clienteDoc.exists()) {
            const clienteData = { id: clienteDoc.id, ...clienteDoc.data() } as Cliente;
            setClienteSelecionado(clienteData);
            setBusca(clienteData.nome);
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

  const selecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setBusca(cliente.nome);
    setMostrarSugestoes(false);
  };

  const handleBuscaChange = (value: string) => {
    setBusca(value);
    setMostrarSugestoes(true);
    if (clienteSelecionado && clienteSelecionado.nome !== value) {
      setClienteSelecionado(null);
    }
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
    setNovoClienteDataNascimento(formatted);
  };

  const cadastrarNovoCliente = async () => {
    if (!novoClienteNome.trim() || !novoClienteTelefone.trim()) {
      toast.error('Preencha nome e telefone!');
      return;
    }

    try {
      setLoading(true);
      const agora = Timestamp.now();

      const clienteData: any = {
        dataCadastro: agora,
        nome: novoClienteNome.trim(),
        telefone: novoClienteTelefone.trim(),
        provou: false,
        status: 'pendente',
        createdAt: agora,
        updatedAt: agora,
      };

      if (novoClienteDataNascimento) {
        clienteData.dataNascimento = novoClienteDataNascimento;
      }

      const clienteRef = await addDoc(collection(db, 'clientes'), clienteData);
      
      const novoCliente: Cliente = {
        id: clienteRef.id,
        ...clienteData,
      };

      setClienteSelecionado(novoCliente);
      setBusca(novoCliente.nome);
      setMostrarFormNovoCliente(false);
      setNovoClienteNome('');
      setNovoClienteTelefone('');
      setNovoClienteDataNascimento('');
      
      toast.success('Novo cliente cadastrado!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
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

    if (!clienteSelecionado) {
      toast.error('Selecione um cliente!');
      return;
    }

    try {
      setLoading(true);

      const valorTotal = produtos.reduce((sum, p) => sum + p.valor, 0);

      await updateDoc(doc(db, 'vendas', params?.id as string), {
        clienteId: clienteSelecionado.id,
        valorTotal,
        produtos,
        observacoes,
        provou,
        updatedAt: Timestamp.now(),
      });

      // Se mudou o cliente, atualizar o status dos clientes
      if (clienteSelecionado.id !== clienteIdOriginal) {
        // Atualizar novo cliente
        await updateDoc(doc(db, 'clientes', clienteSelecionado.id), {
          status: 'pendente',
          vendaId: params?.id,
          provou,
          updatedAt: Timestamp.now(),
        });

        // Remover referência do cliente antigo (se existir)
        if (clienteIdOriginal) {
          await updateDoc(doc(db, 'clientes', clienteIdOriginal), {
            vendaId: null,
            updatedAt: Timestamp.now(),
          });
        }
      }

      toast.success('Venda atualizada com sucesso!');
      router.push(`/vendas/${params?.id}`);
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
        <Link href={`/vendas/${params?.id}`}>
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
          <CardContent className="space-y-5">
            {!mostrarFormNovoCliente ? (
              <>
                <div className="relative">
                  <Input
                    label="Buscar Cliente"
                    value={busca}
                    onChange={(e) => handleBuscaChange(e.target.value)}
                    onFocus={() => setMostrarSugestoes(true)}
                    onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                    placeholder="Digite o nome do cliente..."
                    required
                  />

                  {mostrarSugestoes && busca && clientesFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 glass-dark border border-burgundy-800 rounded-xl shadow-2xl max-h-60 overflow-auto">
                      {clientesFiltrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => selecionarCliente(cliente)}
                          className="w-full px-4 py-3 text-left hover:bg-burgundy-900/50 transition-colors border-b border-burgundy-800/30 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-white">{cliente.nome}</p>
                            <p className="text-sm text-gray-400">{cliente.telefone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {mostrarSugestoes && busca && clientesFiltrados.length === 0 && (
                    <div className="absolute z-10 w-full mt-2 glass-dark border border-burgundy-800 rounded-xl shadow-2xl p-4">
                      <p className="text-gray-400 mb-3">Cliente não encontrado</p>
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => setMostrarFormNovoCliente(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Cadastrar Novo Cliente
                      </Button>
                    </div>
                  )}
                </div>

                {clienteSelecionado && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <p className="text-green-400 font-medium">✓ Cliente selecionado: {clienteSelecionado.nome}</p>
                    {clienteSelecionado.id !== clienteIdOriginal && (
                      <p className="text-yellow-400 text-sm mt-1">⚠️ Você está alterando o cliente desta venda</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSelecionado(null);
                        setBusca('');
                      }}
                      className="text-sm text-green-400 hover:text-green-300 mt-2 underline"
                    >
                      Trocar cliente
                    </button>
                  </div>
                )}

                {!clienteSelecionado && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setMostrarFormNovoCliente(true)}
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Cadastrar Novo Cliente
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 mb-4">
                  <p className="text-primary-400 font-medium">📝 Cadastrar Novo Cliente</p>
                </div>

                <Input
                  label="Nome Completo"
                  value={novoClienteNome}
                  onChange={(e) => setNovoClienteNome(e.target.value)}
                  placeholder="Maria Silva"
                  required
                />

                <Input
                  label="Telefone (com DDD)"
                  value={novoClienteTelefone}
                  onChange={(e) => setNovoClienteTelefone(e.target.value)}
                  placeholder="47991234567"
                  required
                  helperText="Apenas números, com DDD. Ex: 47991234567"
                />

                <Input
                  label="Data de Nascimento"
                  value={novoClienteDataNascimento}
                  onChange={handleDataNascimentoChange}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  helperText="Formato: DD/MM/AAAA (opcional)"
                />

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    onClick={cadastrarNovoCliente}
                    disabled={loading}
                    className="flex-1"
                  >
                    Salvar Cliente
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => {
                      setMostrarFormNovoCliente(false);
                      setNovoClienteNome('');
                      setNovoClienteTelefone('');
                      setNovoClienteDataNascimento('');
                    }}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            )}
            
            <div>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={provou}
                  onChange={(e) => setProva(e.target.checked)}
                  className="w-5 h-5 text-primary-600 bg-burgundy-900 border-burgundy-800 rounded focus:ring-primary-500 focus:ring-offset-burgundy-950"
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
          <Link href={`/vendas/${params?.id}`}>
            <Button type="button" variant="secondary" disabled={loading}>
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}