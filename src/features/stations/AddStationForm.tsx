import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stationSchema, type StationFormData } from '../../schemas/station.schema';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const AddStationForm = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StationFormData>({
    resolver: zodResolver(stationSchema),
  });

  const onSubmit: SubmitHandler<StationFormData> = async (data) => {
    try {
      await api.post('/stations', data);
      toast.success('Station added successfully');
      navigate('/stations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add station');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Station Name</label>
          <input
            {...register('name')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
            placeholder="e.g. New Delhi HQ"
          />
          {errors.name && <p className="text-[#ffb4ab] text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Subnet Segment</label>
          <input
            {...register('subnet')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px] font-mono"
            placeholder="e.g. 192.168.1"
          />
          {errors.subnet && <p className="text-[#ffb4ab] text-xs mt-1">{errors.subnet.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">City</label>
          <input
            {...register('city')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
            placeholder="e.g. New Delhi"
          />
          {errors.city && <p className="text-[#ffb4ab] text-xs mt-1">{errors.city.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">State</label>
          <input
            {...register('state')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
            placeholder="e.g. Delhi"
          />
          {errors.state && <p className="text-[#ffb4ab] text-xs mt-1">{errors.state.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-[#2a2a2a] gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="text-[#8d90a0] hover:text-white px-4 py-2 transition-colors font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-semibold py-2 px-8 rounded-[2px] transition-colors disabled:opacity-50 flex items-center justify-center h-10 min-w-[140px]"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Station'}
        </button>
      </div>
    </form>
  );
};
