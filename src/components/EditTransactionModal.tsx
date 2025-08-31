import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  date: string;
  group_id?: string | null;
}

interface FamilyGroup {
  id: string;
  name: string;
}

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdated: () => void;
}

export const EditTransactionModal = ({ transaction, isOpen, onClose, onTransactionUpdated }: EditTransactionModalProps) => {
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
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategory(transaction.category);
      setDescription(transaction.description || '');
      setGroupId(transaction.group_id || null);
    }
  }, [transaction]);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !amount || !category) {
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
        .update({
          type,
          amount: parseFloat(amount),
          category,
          description: description || null,
          group_id: groupId,
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: "Transação atualizada! ✨",
        description: "As alterações na sua transação foram salvas.",
      });
      onTransactionUpdated();
      onClose();
    } catch (err) {
      console.error("Erro ao atualizar transação:", err);
      toast({
        title: "Erro ao atualizar transação",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar Transação</SheetTitle>
          <SheetDescription>
            Faça alterações na sua transação aqui. Clique em salvar quando terminar.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleUpdate} className="space-y-4 flex-1 overflow-y-auto p-1">
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
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount-edit">Valor *</Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-muted-foreground">R$</span>
              <Input
                id="amount-edit"
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
            <Label htmlFor="category-edit">Categoria *</Label>
            <Select value={category} onValueChange={setCategory} required disabled={loading}>
              <SelectTrigger id="category-edit">
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
            <Label htmlFor="group-edit">Orçamento</Label>
            <Select value={groupId || 'personal'} onValueChange={(value) => setGroupId(value === 'personal' ? null : value)} disabled={loading || groups.length === 0}>
              <SelectTrigger id="group-edit">
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
            <Label htmlFor="description-edit">Descrição</Label>
            <Textarea
              id="description-edit"
              placeholder="Adicione uma descrição..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              disabled={loading}
            />
          </div>
        </form>
        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            type="submit"
            form="edit-transaction-form"
            className="bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
            disabled={loading}
            onClick={handleUpdate}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
