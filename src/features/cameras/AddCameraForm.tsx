import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cameraSchema, type CameraFormData } from '../../schemas/camera.schema';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useStations } from '../stations/useStations';
import { useNVRs } from '../nvrs/useNVRs';

export const AddCameraForm = () => {
  const navigate = useNavigate();
  const { data: stations, isLoading: stationsLoading } = useStations();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CameraFormData>({
    resolver: zodResolver(cameraSchema),
    defaultValues: {
      channel: 1,
    }
  });

  const selectedStationId = watch('stationId');
  const { data: nvrs, isLoading: nvrsLoading } = useNVRs(selectedStationId);

  const onSubmit: SubmitHandler<CameraFormData> = async (data) => {
    try {
      await api.post('/cameras', data);
      toast.success('Camera saved successfully');
      navigate('/stations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save camera');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Station</label>
          <select
            {...register('stationId')}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
            disabled={stationsLoading}
          >
            <option value="">Select a station...</option>
            {stations?.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} ({station.location})
              </option>
            ))}
          </select>
          {errors.stationId && <p className="text-[#ffb4ab] text-xs mt-1">{errors.stationId.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">NVR</label>
          <select
            {...register('nvrId')}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px] disabled:opacity-50"
            disabled={!selectedStationId || nvrsLoading}
          >
            <option value="">Select an NVR...</option>
            {nvrs?.map((nvr) => (
              <option key={nvr.id} value={nvr.id}>
                {nvr.name} ({nvr.ipAddress})
              </option>
            ))}
          </select>
          {errors.nvrId && <p className="text-[#ffb4ab] text-xs mt-1">{errors.nvrId.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Camera Name</label>
          <input
            {...register('name')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
            placeholder="e.g. Lobby Entrance"
          />
          {errors.name && <p className="text-[#ffb4ab] text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="space-y-2 relative">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Channel (1-32)</label>
          <input
            {...register('channel', { valueAsNumber: true })}
            type="number"
            min="1"
            max="32"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px] font-mono"
          />
          {errors.channel && <p className="text-[#ffb4ab] text-xs mt-1">{errors.channel.message}</p>}
        </div>

        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Area Tag</label>
          <input
            {...register('areaTag')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
            placeholder="e.g. cafeteria, parking, entrance"
          />
          {errors.areaTag && <p className="text-[#ffb4ab] text-xs mt-1">{errors.areaTag.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-[#2a2a2a] gap-4">
        <button
          type="button"
          onClick={() => navigate('/stations')}
          className="text-[#8d90a0] hover:text-white px-4 py-2 transition-colors font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-semibold py-2 px-8 rounded-[2px] transition-colors disabled:opacity-50 flex items-center justify-center h-10 min-w-[140px]"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Camera'}
        </button>
      </div>
    </form>
  );
};
