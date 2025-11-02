import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Loader2, Users, AlertTriangle, Pencil, Switch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import ErrorBoundary from "./ErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { investmentMapping } from "@/lib/investment-mapping";

type Transaction = Tables<'transactions'>;

interface TransactionFormProps {
  onSave: () => void;
  onCancel?: () => void;
  transactionToEdit?: Transaction | null;
}

interface FamilyGroup {
  id: string;
  name: string;
}

export const TransactionForm = ({ onSave, onCancel, transactionToEdit }: TransactionFormProps) => {
  const isEditMode = !!transactionToEdit;

  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInvestment, setIsInvestment] = useState(false);
  const [investmentData, setInvestmentData] = useState({
    ticker: "",
    name: "",
    type: "",
    subtype: "",
    transactionType: "buy",
    quantity: "",
    price: "",
  });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Efeito para buscar os grupos do usuário
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await (supabase as any).rpc('get_user_groups');
      if (error) {
        console.error("Erro ao buscar grupos:", error);
      } else {
        setGroups((data as FamilyGroup[]) || []);
      }
    };
    fetchGroups();
  }, [user]);

  // Efeito para popular o formulário ao editar uma transação
  useEffect(() => {
    if (isEditMode && transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(String(transactionToEdit.amount));
      setCategory(transactionToEdit.category);
      setDescription(transactionToEdit.description || '');
      setGroupId(transactionToEdit.group_id);
    } else {
      // Reseta o formulário se não estiver em modo de edição (ex: ao criar uma nova transação)
      setType('expense');
      setAmount('');
      setCategory('');
      setDescription('');
      setGroupId(null);
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
    setIsSubmitting(true);

    try {
      if (isInvestment) {
        // Handle investment transaction
        const totalValue = parseFloat(investmentData.quantity) * parseFloat(investmentData.price);
        
        const { error } = await supabase.from("manual_investments").insert({
          user_id: user?.id,
          group_id: selectedGroupId,
          ticker: investmentData.ticker.toUpperCase(),
          name: investmentData.name,
          type: investmentData.type,
          subtype: investmentData.subtype || null,
          transaction_type: investmentData.transactionType,
          quantity: parseFloat(investmentData.quantity),
          price: parseFloat(investmentData.price),
          total_value: totalValue,
          transaction_date: date,
          notes: description,
        });

        if (error) throw error;

        toast({
          title: "Investimento Registrado",
          description: `${investmentData.transactionType === 'buy' ? 'Compra' : 'Venda'} de ${investmentData.ticker} registrada com sucesso.`,
        });
      } else {
        const { error } = await supabase.from("transactions").insert({
          user_id: user?.id,
          type,
          category,
          amount: parseFloat(amount),
          description,
          date,
          group_id: selectedGroupId,
        });

        if (error) throw error;

        toast({
          title: "Transação Adicionada",
          description: "Sua transação foi registrada com sucesso.",
        });
      }

      // Reset form
      setType("expense");
      setCategory("");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setIsInvestment(false);
      setInvestmentData({
        ticker: "",
        name: "",
        type: "",
        subtype: "",
        transactionType: "buy",
        quantity: "",
        price: "",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao adicionar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
          <CardTitle>
            {isInvestment ? "Registrar Compra/Venda" : "Nova Transação"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Toggle between regular transaction and investment */}
            <div className="flex items-center space-x-2">
              <Switch
                id="investment-mode"
                checked={isInvestment}
                onCheckedChange={setIsInvestment}
              />
              <Label htmlFor="investment-mode">
                Transação de Investimento
              </Label>
            </div>

            {isInvestment ? (
              <>
                {/* Investment Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionType">Tipo de Operação</Label>
                    <Select
                      value={investmentData.transactionType}
                      onValueChange={(value) =>
                        setInvestmentData({ ...investmentData, transactionType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Compra</SelectItem>
                        <SelectItem value="sell">Venda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticker">Ticker/Código</Label>
                    <Input
                      id="ticker"
                      value={investmentData.ticker}
                      onChange={(e) =>
                        setInvestmentData({ ...investmentData, ticker: e.target.value.toUpperCase() })
                      }
                      placeholder="Ex: PETR4, MXRF11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Ativo</Label>
                  <Input
                    id="name"
                    value={investmentData.name}
                    onChange={(e) =>
                      setInvestmentData({ ...investmentData, name: e.target.value })
                    }
                    placeholder="Ex: Petrobras PN"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Categoria</Label>
                    <Select
                      value={investmentData.type}
                      onValueChange={(value) => {
                        setInvestmentData({ ...investmentData, type: value, subtype: "" });
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {investmentMapping.map((item) => (
                          <SelectItem key={item.type} value={item.type}>
                            {item.label_pt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subtype">Subcategoria</Label>
                    <Select
                      value={investmentData.subtype}
                      onValueChange={(value) =>
                        setInvestmentData({ ...investmentData, subtype: value })
                      }
                      disabled={!investmentData.type}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {investmentMapping
                          .find((item) => item.type === investmentData.type)
                          ?.subtypes.map((sub) => (
                            <SelectItem key={sub.subtype} value={sub.subtype}>
                              {sub.label_pt}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.000001"
                      value={investmentData.quantity}
                      onChange={(e) =>
                        setInvestmentData({ ...investmentData, quantity: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Preço Unitário (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={investmentData.price}
                      onChange={(e) =>
                        setInvestmentData({ ...investmentData, price: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {investmentData.quantity && investmentData.price && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      Valor Total: R${" "}
                      {(parseFloat(investmentData.quantity) * parseFloat(investmentData.price)).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="date">Data da Operação</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notas adicionais sobre a operação..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={type} onValueChange={(value: any) => setType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {!isEditMode && (
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
                )}

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
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="submit"
                className="w-full bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isInvestment ? 'Salvando...' : 'Adicionando...'}
                  </>
                ) : (
                  isInvestment ? 'Registrar Operação' : 'Adicionar Transação'
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