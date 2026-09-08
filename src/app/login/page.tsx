import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-[var(--color-text)]">Recintos Deportivos</h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Corporación de Deportes — panel de administración
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
