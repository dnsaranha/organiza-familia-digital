import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const TransactionForm = () => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const incomeCategories = [
    'Salário',
    'Freelance',
    'Investimentos',
    'Presente',
    'Outros'
  ];

  const expenseCategories = [
    'Alimentação',
    'Transporte',
    'Casa',
    'Saúde',
    'Educação',
    'Lazer',
    'Compras',
    'Contas',
    'Outros'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !category) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o valor e a categoria.",
        variant: "destructive"
      });
      return;
    }

    // Aqui será integrado com Supabase
    toast({
      title: "Transação adicionada",
      description: `${type === 'income' ? 'Receita' : 'Despesa'} de R$ ${amount} foi registrada.`,
    });

    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
  };

  return (
    <Card className="bg-gradient-card shadow-card border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'income' ? (
            <Plus className="h-5 w-5 text-success" />
          ) : (
            <Minus className="h-5 w-5 text-expense" />
          )}
          Nova Transação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Type Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={type === 'expense' ? 'default' : 'ghost'}
            onClick={() => setType('expense')}
            className={type === 'expense' ? 'bg-gradient-expense text-expense-foreground shadow-expense' : ''}
          >
            <Minus className="h-4 w-4 mr-2" />
            Despesa
          </Button>
          <Button
            type="button"
            variant={type === 'income' ? 'default' : 'ghost'}
            onClick={() => setType('income')}
            className={type === 'income' ? 'bg-gradient-success text-success-foreground shadow-success' : ''}
          >
            <Plus className="h-4 w-4 mr-2" />
            Receita
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-muted-foreground">R$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {(type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Adicione uma descrição..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
          >
            Adicionar Transação
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};