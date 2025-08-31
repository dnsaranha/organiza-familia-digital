import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Loader2, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import ErrorBoundary from "./ErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

type Transaction = Tables<'transactions'>;

interface FamilyGroup {
  id: string;
  name: string;
}

interface TransactionFormProps {
  onSave: () => void;
  onCancel?: () => void;
  transactionToEdit?: Transaction | null;
  groups: FamilyGroup[];
}

export const TransactionForm = ({ onSave, onCancel, transactionToEdit, groups }: TransactionFormProps) => {
  const isEditMode = !!transactionToEdit;

  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isEditMode && transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(String(transactionToEdit.amount));
      setCategory(transactionToEdit.category);
      setDescription(transactionToEdit.description || '');
      setGroupId(transactionToEdit.group_id);
    }
  }, [isEditMode, transactionToEdit]);

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
      const transactionData = {
        user_id: user.id,
        group_id: groupId,
        type,
        amount: parseFloat(amount),
        category,
        description: description || null,
        date: isEditMode ? transactionToEdit.date : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let error;
      if (isEditMode) {
        const { error: updateError } = await (supabase as any)
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await (supabase as any)
          .from('transactions')
          .insert(transactionData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: `Transação ${isEditMode ? 'atualizada' : 'adicionada'}! 🎉`,
        description: `Sua transação foi ${isEditMode ? 'salva' : 'registrada'} com sucesso.`,
      });

      if (!isEditMode) {
        // Reset form only when adding
        setAmount('');
        setCategory('');
        setDescription('');
        setGroupId(null);
      }

      onSave();

    } catch (err: any) {
      console.error(`Erro ao ${isEditMode ? 'atualizar' : 'adicionar'} transação:`, err);
      toast({
        title: `Erro ao ${isEditMode ? 'atualizar' : 'adicionar'} transação`,
        description: `Não foi possível ${isEditMode ? 'salvar as alterações' : 'registrar a transação'}. Tente novamente.`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fallbackUI = (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Erro ao carregar formulário</AlertTitle>
      <AlertDescription>
        Não foi possível carregar o formulário de transação. Tente novamente mais tarde.
      </AlertDescription>
    </Alert>
  );

  return (
    <ErrorBoundary fallback={fallbackUI}>
      <Card className="bg-gradient-card shadow-card border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditMode ? (
              <Pencil className="h-5 w-5 text-primary" />
            ) : type === 'income' ? (
              <Plus className="h-5 w-5 text-success" />
            ) : (
              <Minus className="h-5 w-5 text-expense" />
            )}
            {isEditMode ? 'Editar Transação' : 'Nova Transação'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type Selector */}
          {!isEditMode && (
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
          )}

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

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="submit"
                className="w-full bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Salvando...' : 'Adicionando...'}
                  </>
                ) : (
                  isEditMode ? 'Salvar Alterações' : 'Adicionar Transação'
                )}
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto" disabled={loading}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};