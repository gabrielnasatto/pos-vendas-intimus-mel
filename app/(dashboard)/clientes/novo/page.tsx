'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useClientes } from '@/hooks/useClientes';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PhoneInputField from '@/components/ui/PhoneInputField';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { validarDataNascimento, normalizarParaE164 } from '@/lib/utils';
import { useDataNascimento } from '@/hooks/useDataNascimento';
import toast from 'react-hot-toast';

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  telefone: z
    .string()
    .min(1, 'Telefone é obrigatório')
    .refine(
      (val) => {
        try { return isValidPhoneNumber(val); } catch { return false; }
      },
      'Número de telefone inválido'
    ),
  dataNascimento: z.string().optional().refine(
    (val) => !val || validarDataNascimento(val),
    'Data inválida (use DD/MM/AAAA)'
  ),
});

type FormData = z.infer<typeof schema>;

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { clientes } = useClientes();
  const { dataNascimento, handleDataNascimentoChange } = useDataNascimento();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { telefone: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const telefoneDigitos = data.telefone.replace(/\D/g, '');
      const clienteExiste = clientes.find(
        (c) => c.telefone.replace(/\D/g, '') === telefoneDigitos
      );

      if (clienteExiste) {
        toast.error('Cliente com este telefone já está cadastrado!');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: data.nome,
          telefone: data.telefone, // já em E.164 via PhoneInput
          dataNascimento: data.dataNascimento || undefined,
          provou: false,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      toast.success('Cliente cadastrado com sucesso!');
      router.push('/clientes');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/clientes">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Cadastrar Cliente
        </h1>
        <p className="text-gray-400 mt-2 text-sm sm:text-base">Dados básicos do cliente</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Nome Completo"
              {...register('nome')}
              error={errors.nome?.message}
              placeholder="Maria Silva"
              required
            />

            <Controller
              name="telefone"
              control={control}
              render={({ field }) => (
                <PhoneInputField
                  label="Telefone"
                  value={field.value}
                  onChange={(val) => field.onChange(val ?? '')}
                  error={errors.telefone?.message}
                  helperText="Selecione o país e digite o número com DDD"
                  required
                />
              )}
            />

            <Input
              label="Data de Nascimento"
              value={dataNascimento}
              onChange={(e) => {
                handleDataNascimentoChange(e.target.value);
                setValue('dataNascimento', e.target.value);
              }}
              error={errors.dataNascimento?.message}
              placeholder="DD/MM/AAAA"
              maxLength={10}
              helperText="Formato: DD/MM/AAAA (opcional)"
            />

            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
              <p className="text-sm text-primary-400">
                💡 <strong>Dica:</strong> Após cadastrar o cliente, vá em "Vendas" → "Nova Venda" para registrar suas vendas.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" loading={loading} disabled={loading} className="sm:w-auto">
            Cadastrar Cliente
          </Button>
          <Link href="/clientes" className="sm:w-auto">
            <Button type="button" variant="secondary" disabled={loading} className="w-full">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
