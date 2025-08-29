import { PiggyBank, Settings, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BudgetScopeSwitcher } from "./BudgetScopeSwitcher";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível sair da conta.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saiu da conta",
        description: "Você foi desconectado com sucesso.",
      });
      navigate("/auth");
    }
  };

  return (
    <header className="border-b border-border bg-gradient-card shadow-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-gradient-primary">
              <PiggyBank className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Organiza</h1>
              <p className="text-sm text-muted-foreground">Gestão Financeira Familiar</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <BudgetScopeSwitcher />
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/pricing")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Planos
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/profile")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Configurações</span>
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-primary"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Sair</span>
                </Button>
              </>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/auth")}
                className="text-muted-foreground hover:text-primary"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};