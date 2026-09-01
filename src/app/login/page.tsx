import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar — HH Gestão de Consórcio" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            HH
          </span>
          <div className="text-sm font-semibold leading-tight">
            Gestão de Consórcio
          </div>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
