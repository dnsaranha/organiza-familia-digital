import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TransactionFormProps {
  onTransactionAdded: () => void;
}

interface FamilyGroup {
  id: string;
  name: string;
}

export const TransactionForm = ({ onTransactionAdded }: TransactionFormProps) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_user_groups');
      if (error) {
        console.error("Erro ao buscar grupos:", error);
      } else {
        setGroups(data || []);
      }
    };
    fetchGroups();
  }, [user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !category || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o valor e a categoria.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          group_id: groupId,
          type,
          amount: parseFloat(amount),
          category,
          description: description || null,
          date: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Transação adicionada! 🎉",
        description: `${type === 'income' ? 'Receita' : 'Despesa'} de R$ ${amount} foi registrada com sucesso.`,
      });

      // Reset form
      setAmount('');
      setCategory('');
      setDescription('');
      setGroupId(null);

      // Notify parent component
      onTransactionAdded();

    } catch (err: any) {
      console.error("Erro ao adicionar transação:", err);
      toast({
        title: "Erro ao adicionar transação",
        description: "Não foi possível registrar a transação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
            className={type === 'expense' ? 'bg-gradient-expense text-expense-foreground shadow-expense' : ''}
          >
            <Minus className="h-4 w-4 mr-2" />
            Despesa
          </Button>
          <Button
            type="button"
            variant={type === 'income' ? 'default' : 'ghost'}
            onClick={() => setType('income')}
            disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select value={category} onValueChange={setCategory} required disabled={loading}>
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

          {/* Group Selector */}
          <div className="space-y-2">
            <Label htmlFor="group">Orçamento</Label>
            <Select value={groupId || 'personal'} onValueChange={(value) => setGroupId(value === 'personal' ? null : value)} disabled={loading || groups.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o orçamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Pessoal</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
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
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              "Adicionar Transação"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};