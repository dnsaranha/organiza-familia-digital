import { useState, useEffect } from 'react';
import { useBudgetScope } from '@/contexts/BudgetScopeContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FamilyGroup {
  id: string;
  name: string;
}

export const BudgetScopeSwitcher = () => {
  const { user } = useAuth();
  const { scope, setScope } = useBudgetScope();
  const [groups, setGroups] = useState<FamilyGroup[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_user_groups');
      if (error) {
        console.error("Erro ao buscar grupos para o seletor:", error);
      } else {
        setGroups(data || []);
      }
    };
    fetchGroups();
  }, [user]);

  return (
    <Select value={scope} onValueChange={setScope}>
      <SelectTrigger className="w-full md:w-[180px]">
        <SelectValue placeholder="Selecionar Orçamento" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="personal">Pessoal</SelectItem>
        {groups.map(group => (
          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
