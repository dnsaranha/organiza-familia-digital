import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { LogOut } from "lucide-react";

export default function Settings() {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [carryOverBalance, setCarryOverBalance] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setNewAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    async function getProfileAndPreferences() {
      if (!user) return;
      setLoadingProfile(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(`full_name, avatar_url`)
          .eq("id", user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        if (profileData) {
          setFullName(profileData.full_name || "");
          setAvatarUrl(profileData.avatar_url || "");
        }

        const { data: preferencesData, error: preferencesError } = await supabase
          .from('user_preferences')
          .select('month_start_day, carry_over_balance')
          .eq('user_id', user.id)
          .single();

        if (preferencesError && preferencesError.code !== 'PGRST116') throw preferencesError;
        if (preferencesData) {
          setMonthStartDay(preferencesData.month_start_day);
          setCarryOverBalance(preferencesData.carry_over_balance);
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar dados",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoadingProfile(false);
      }
    }
    getProfileAndPreferences();
  }, [user, toast]);

  async function updateProfileAndPreferences(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      let newAvatarUrl = avatarUrl;
      if (newAvatar) {
        const fileExt = newAvatar.name.split('.').pop();
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, newAvatar);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = publicUrl;
      }

      const profileUpdates = { id: user.id, full_name: fullName, avatar_url: newAvatarUrl, updated_at: new Date().toISOString() };
      const { error: profileError } = await supabase.from("profiles").upsert(profileUpdates);
      if (profileError) throw profileError;

      const preferencesUpdates = { user_id: user.id, month_start_day: monthStartDay, carry_over_balance: carryOverBalance, updated_at: new Date().toISOString() };
      const { error: preferencesError } = await supabase.from("user_preferences").upsert(preferencesUpdates);
      if (preferencesError) throw preferencesError;

      toast({
        title: "Sucesso!",
        description: "Suas informações foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
            Gerencie suas informações de perfil, preferências e assinatura.
            </p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Perfil e Preferências</CardTitle>
                <CardDescription>Atualize seus dados pessoais e preferências financeiras.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={updateProfileAndPreferences} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="text" value={user?.email || ""} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nome Completo</Label>
                        <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Avatar</Label>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={avatarPreview || avatarUrl} alt={fullName} />
                                <AvatarFallback>{fullName?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <Input id="avatarFile" type="file" accept="image/*" onChange={handleAvatarChange} className="max-w-xs" />
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Preferências Financeiras</h3>
                        <div className="space-y-2">
                            <Label htmlFor="monthStartDay">Dia de Início do Mês</Label>
                            <Input id="monthStartDay" type="number" min="1" max="28" value={monthStartDay} onChange={(e) => setMonthStartDay(parseInt(e.target.value, 10))} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label>Transportar Saldo Anterior</Label>
                            <Switch checked={carryOverBalance} onCheckedChange={setCarryOverBalance} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        <SubscriptionStatus />

        <Card>
            <CardHeader>
                <CardTitle>Sessão</CardTitle>
            </CardHeader>
            <CardContent>
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair da sua conta
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
