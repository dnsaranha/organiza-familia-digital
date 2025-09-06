import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFinancialData } from '@/hooks/useFinancialData';
import { useToast } from './ui/use-toast';

const transactionSchema = z.object({
  symbol: z.string().min(3, 'Símbolo deve ter pelo menos 3 caracteres').toUpperCase(),
  quantity: z.coerce.number().positive('Quantidade deve ser positiva'),
  price: z.coerce.number().positive('Preço deve ser positivo'),
  type: z.enum(['buy', 'sell']),
  date: z.date(),
  asset_type: z.enum(['STOCK', 'FII', 'ETF', 'CRYPTO', 'BOND']),
  cost: z.coerce.number().min(0).optional().default(0),
});

interface InvestmentTransactionFormProps {
  onFinished?: () => void;
}

export const InvestmentTransactionForm = ({ onFinished }: InvestmentTransactionFormProps) => {
  const { addTransaction, loading } = useFinancialData();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'buy',
      asset_type: 'STOCK',
      date: new Date(),
      cost: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof transactionSchema>) => {
    try {
      await addTransaction({
        ...values,
        symbol: values.symbol.toUpperCase(),
        date: format(values.date, 'yyyy-MM-dd'),
      });
      toast({
        title: 'Sucesso!',
        description: 'Sua transação foi adicionada.',
      });
      if (onFinished) {
        onFinished();
      }
      form.reset();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a transação.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ativo (Símbolo)</FormLabel>
              <FormControl>
                <Input placeholder="PETR4" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Operação</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="buy">Compra</SelectItem>
                    <SelectItem value="sell">Venda</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="asset_type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Classe do Ativo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione a classe" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="STOCK">Ação</SelectItem>
                        <SelectItem value="FII">FII</SelectItem>
                        <SelectItem value="ETF">ETF</SelectItem>
                        <SelectItem value="CRYPTO">Cripto</SelectItem>
                        <SelectItem value="BOND">Renda Fixa</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço por Unidade</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="30.50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Data da Operação</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        >
                        {field.value ? format(field.value, "PPP") : <span>Escolha uma data</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custos (Opcional)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Adicionando...' : 'Adicionar Transação'}
        </Button>
      </form>
    </Form>
  );
};
