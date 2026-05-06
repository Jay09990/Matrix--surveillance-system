import { LoginForm } from '../features/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tighter text-white">MATRIX</h1>
        <p className="text-[#8d90a0] font-mono text-xs mt-1 uppercase tracking-widest">Video Management System</p>
      </div>
      <LoginForm />
    </div>
  );
}
