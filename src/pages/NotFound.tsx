import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <main className="min-h-screen flex items-center justify-center bg-background px-4">
    <div className="text-center space-y-4">
      <p className="text-5xl font-bold text-primary font-display">404</p>
      <h1 className="text-xl font-semibold text-foreground">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço acessado não existe ou foi movido.</p>
      <Button asChild>
        <Link to="/dashboard">Voltar ao painel</Link>
      </Button>
    </div>
  </main>
);

export default NotFound;
