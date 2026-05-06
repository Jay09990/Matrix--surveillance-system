import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { nvrSchema, type NVRFormData } from '../../schemas/nvr.schema';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useStations } from '../stations/useStations';

export const AddNVRForm = () => {
  const navigate = useNavigate();
  const { data: stations, isLoading: stationsLoading } = useStations();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<NVRFormData>({
    resolver: zodResolver(nvrSchema),
    defaultValues: {
      httpPort: 80,
      rtspPort: 554,
      type: 'HIKVISION',
    }
  });

  const handleTestConnection = async () => {
    const values = getValues();
    if (!values.ipAddress || !values.httpPort || !values.rtspPort || !values.username || !values.password) {
      setTestStatus('error');
      setTestMessage('Please fill all connection fields first');
      return;
    }

    setTestStatus('testing');
    try {
      await api.post('/nvrs/test', {
        ipAddress: values.ipAddress,
        httpPort: values.httpPort,
        rtspPort: values.rtspPort,
        username: values.username,
        password: values.password,
        type: values.type,
      });
      setTestStatus('success');
      setTestMessage('Connection successful');
    } catch (error: any) {
      setTestStatus('error');
      setTestMessage(error.response?.data?.message || 'Connection failed');
    }
  };

  const onSubmit: SubmitHandler<NVRFormData> = async (data) => {
    try {
      await api.post('/nvrs', data);
      toast.success('NVR added successfully');
      navigate('/stations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add NVR');
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
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">NVR Name</label>
          <input
            {...register('name')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
            placeholder="e.g. Building A Main"
          />
          {errors.name && <p className="text-[#ffb4ab] text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">IP Address</label>
          <input
            {...register('ipAddress')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px] font-mono"
            placeholder="192.168.1.100"
          />
          {errors.ipAddress && <p className="text-[#ffb4ab] text-xs mt-1">{errors.ipAddress.message}</p>}
        </div>

        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase block">NVR Type</label>
          <div className="flex p-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-[2px] w-full max-w-[400px]">
            <label className="flex-1 text-center cursor-pointer relative">
              <input type="radio" value="HIKVISION" {...register('type')} className="peer sr-only" />
              <div className="text-sm font-semibold py-2 px-4 transition-colors peer-checked:bg-[#2563eb] peer-checked:text-white text-[#8d90a0] hover:text-[#e5e2e1] rounded-sm">
                HIKVISION
              </div>
            </label>
            <label className="flex-1 text-center cursor-pointer relative">
              <input type="radio" value="HIFOCUS" {...register('type')} className="peer sr-only" />
              <div className="text-sm font-semibold py-2 px-4 transition-colors peer-checked:bg-[#2563eb] peer-checked:text-white text-[#8d90a0] hover:text-[#e5e2e1] rounded-sm">
                HIFOCUS
              </div>
            </label>
          </div>
          {errors.type && <p className="text-[#ffb4ab] text-xs mt-1">{errors.type.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">HTTP Port</label>
          <input
            {...register('httpPort', { valueAsNumber: true })}
            type="number"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px] font-mono"
          />
          {errors.httpPort && <p className="text-[#ffb4ab] text-xs mt-1">{errors.httpPort.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">RTSP Port</label>
          <input
            {...register('rtspPort', { valueAsNumber: true })}
            type="number"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px] font-mono"
          />
          {errors.rtspPort && <p className="text-[#ffb4ab] text-xs mt-1">{errors.rtspPort.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-[#8d90a0] uppercase">Username</label>
          <input
            {...register('username')}
            type="text"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[2px]"
          />
          {errors.username && <p className="text-[#ffb4ab] text-xs mt-1">{errors.username.message}</p>}
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
      </div>

      <div className="flex flex-col items-start gap-4 pt-4 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-4 w-full">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#e5e2e1] border border-[#2a2a2a] font-semibold py-2 px-4 rounded-[2px] transition-colors disabled:opacity-50 flex items-center h-10"
          >
            {testStatus === 'testing' ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
            ) : 'Test Connection'}
          </button>

          {testStatus === 'success' && (
            <div className="flex items-center text-[#16a34a] text-sm font-semibold bg-[#16a34a]/10 px-3 py-2 rounded-[2px] border border-[#16a34a]/30">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {testMessage}
            </div>
          )}
          
          {testStatus === 'error' && (
            <div className="flex items-center text-[#e03e3e] text-sm font-semibold bg-[#e03e3e]/10 px-3 py-2 rounded-[2px] border border-[#e03e3e]/30">
              <XCircle className="w-4 h-4 mr-2" />
              {testMessage}
            </div>
          )}
        </div>

        <div className="flex justify-end w-full gap-4 mt-4">
          <button
            type="button"
            onClick={() => navigate('/stations')}
            className="text-[#8d90a0] hover:text-white px-4 py-2 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || testStatus === 'testing'}
            className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-semibold py-2 px-8 rounded-[2px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-10 min-w-[120px]"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save NVR'}
          </button>
        </div>
      </div>
    </form>
  );
};
