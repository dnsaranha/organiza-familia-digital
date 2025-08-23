import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Copy, UserPlus, Crown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  created_at: string;
  is_owner?: boolean;
  member_count?: number;
}

export const FamilyGroups = () => {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;
    
    try {
      // Get groups where user is owner or member
      const { data: groupsData, error } = await supabase
        .from('family_groups')
        .select(`
          *,
          group_members!inner(user_id)
        `)
        .or(`owner_id.eq.${user.id},group_members.user_id.eq.${user.id}`);

      if (error) throw error;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          return {
            ...group,
            is_owner: group.owner_id === user.id,
            member_count: count || 0,
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os grupos familiares.",
        variant: "destructive",
      });
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    setLoading(true);
    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .insert({
          name: newGroupName.trim(),
          owner_id: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      toast({
        title: "Grupo criado!",
        description: `Grupo "${newGroupName}" foi criado com sucesso.`,
      });

      setNewGroupName("");
      setCreateDialogOpen(false);
      loadGroups();
    } catch (error: any) {
      console.error('Erro ao criar grupo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o grupo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_group', {
        _join_code: joinCode.trim()
      });

      if (error) throw error;

      toast({
        title: "Entrou no grupo!",
        description: "Você entrou no grupo familiar com sucesso.",
      });

      setJoinCode("");
      setJoinDialogOpen(false);
      loadGroups();
    } catch (error: any) {
      console.error('Erro ao entrar no grupo:', error);
      toast({
        title: "Erro",
        description: error.message === 'invalid join code' 
          ? "Código de convite inválido"
          : "Não foi possível entrar no grupo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyJoinCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Código copiado!",
        description: "O código de convite foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código.",
        variant: "destructive",
      });
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Saiu do grupo",
        description: "Você saiu do grupo familiar.",
      });

      loadGroups();
    } catch (error) {
      console.error('Erro ao sair do grupo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível sair do grupo.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <Card className="bg-gradient-card shadow-card border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Grupos Familiares
          </div>
          <div className="flex gap-2">
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Entrar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Entrar em um Grupo</DialogTitle>
                </DialogHeader>
                <form onSubmit={joinGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="join-code">Código de Convite</Label>
                    <Input
                      id="join-code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Digite o código de 8 caracteres"
                      maxLength={8}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Entrando..." : "Entrar no Grupo"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Grupo</DialogTitle>
                </DialogHeader>
                <form onSubmit={createGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">Nome do Grupo</Label>
                    <Input
                      id="group-name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Ex: Família Silva"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Criando..." : "Criar Grupo"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum grupo familiar ainda.</p>
            <p className="text-sm">Crie um grupo ou entre em um existente!</p>
          </div>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="bg-muted/50 border-muted">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{group.name}</h4>
                      {group.is_owner && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Proprietário
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}</span>
                      {group.is_owner && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-background px-2 py-1 rounded">
                            {group.join_code}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyJoinCode(group.join_code)}
                            className="h-6 px-2"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {!group.is_owner && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => leaveGroup(group.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};