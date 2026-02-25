'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
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
  dataNascimento: z
    .string()
    .optional()
    .refine((val) => !val || validarDataNascimento(val), 'Data inválida (use DD/MM/AAAA)'),
});

type FormData = z.infer<typeof schema>;

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { dataNascimento, handleDataNascimentoChange, setDataNascimento } = useDataNascimento();

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

  useEffect(() => {
    if (params?.id) {
      fetchCliente(params.id as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const fetchCliente = async (id: string) => {
    try {
      const res = await fetch(`/api/clientes/${id}`);
      const data = await res.json();

      if (data.success) {
        const c = data.cliente;
        setValue('nome', c.nome);
        // Normaliza o telefone para E.164 ao carregar dados existentes
        setValue('telefone', normalizarParaE164(c.telefone));
        if (c.dataNascimento) {
          setValue('dataNascimento', c.dataNascimento);
          setDataNascimento(c.dataNascimento);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      toast.error('Erro ao carregar dados do cliente');
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const body: Record<string, unknown> = {
        clienteId: params?.id as string,
        nome: data.nome,
        telefone: data.telefone, // já em E.164
      };

      if (data.dataNascimento) {
        body.dataNascimento = data.dataNascimento;
      }

      const res = await fetch('/api/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      toast.success('Cliente atualizado com sucesso!');
      router.push(`/clientes/${params?.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar cliente');
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
        <Link href={`/clientes/${params?.id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Editar Cliente
        </h1>
        <p className="text-gray-400 mt-2 text-sm sm:text-base">Atualize os dados do cliente</p>
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
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" loading={loading} disabled={loading} className="sm:w-auto">
            Salvar Alterações
          </Button>
          <Link href={`/clientes/${params?.id}`} className="sm:w-auto">
            <Button type="button" variant="secondary" disabled={loading} className="w-full">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
