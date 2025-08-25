import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
    async function getProfile() {
      try {
        setLoading(true);
        if (!user) return;

        const { data, error, status } = await supabase
          .from("profiles")
          .select(`full_name, avatar_url`)
          .eq("id", user.id)
          .single();

        if (error && status !== 406) {
          throw error;
        }

        if (data) {
          setFullName(data.full_name || "");
          setAvatarUrl(data.avatar_url || "");
        }
      } catch (error) {
        toast({
          title: "Error loading profile",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      getProfile();
    }
  }, [user, toast]);

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      if (!user) throw new Error("No user");

      let newAvatarUrl = avatarUrl;

      if (newAvatar) {
        const fileExt = newAvatar.name.split('.').pop();
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, newAvatar);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        newAvatarUrl = publicUrl;
      }

      const updates = {
        id: user.id,
        full_name: fullName,
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) {
        throw error;
      }
      toast({
        title: "Perfil atualizado!",
        description: "Seu perfil foi atualizado com sucesso.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Erro ao atualizar o perfil",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header />
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Update your profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateProfile} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="text" value={user?.email || ""} disabled />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName || ""}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarPreview || avatarUrl} alt={fullName || ""} />
                    <AvatarFallback>{fullName?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Input
                    id="avatarFile"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="max-w-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  Voltar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
