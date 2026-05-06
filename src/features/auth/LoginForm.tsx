import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../../schemas/auth.schema';
import { useLogin } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const LoginForm = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data);
      navigate('/stations');
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError('root', { message: 'Invalid credentials' });
      } else {
        setError('root', { message: 'An unexpected error occurred' });
      }
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-[#131313] border border-[#2a2a2a] rounded-[0px]">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-white mb-2">System Login</h1>
        <p className="text-[#8d90a0] text-sm">Enter your credentials to access the VMS.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
            placeholder="operator@matrix.vms"
          />
          {errors.email && <p className="text-[#ffb4ab] text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Password</label>
          <input
            {...register('password')}
            type="password"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
          />
          {errors.password && <p className="text-[#ffb4ab] text-xs mt-1">{errors.password.message}</p>}
        </div>

        {errors.root && (
          <div className="p-3 border border-[#93000a] bg-[#93000a]/10">
            <p className="text-[#ffb4ab] text-sm">{errors.root.message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-semibold py-2 px-4 rounded-[2px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-10"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate'}
        </button>
      </form>
    </div>
  );
};
