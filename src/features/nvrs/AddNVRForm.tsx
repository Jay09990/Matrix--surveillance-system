import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { api } from '../../lib/axios';
import { useStations } from '../stations/useStations';
import { stationSchema, type StationFormData } from '../../schemas/station.schema';
import { nvrSchema, type NVRFormData } from '../../schemas/nvr.schema';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

type FormMode = 'new' | 'existing';

export const AddNVRForm = () => {
  const { stationId: paramStationId, nvrId } = useParams<{ stationId: string, nvrId: string }>();
  const isEdit = !!nvrId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: stations, isLoading: stationsLoading } = useStations();
  
  const [mode, setMode] = useState<FormMode>('new');
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [stationId, setStationId] = useState<string | null>(paramStationId || null);
  const [isSubmittingStation, setIsSubmittingStation] = useState(false);

  // Fetch NVR list for the station and find the specific NVR
  const { data: existingNvr, isLoading: nvrLoading } = useQuery({
    queryKey: ['nvr-lookup', paramStationId, nvrId],
    queryFn: async () => {
      if (!nvrId) return null;
      
      // If we have stationId, use the direct endpoint
      if (paramStationId) {
        const res = await api.get(`/stations/${paramStationId}/nvrs`);
        return res.data.find((n: any) => n.id === nvrId);
      }
      
      // Fallback: search across all stations to find this NVR
      // This handles cases where the URL might be old or missing stationId
      const stationsRes = await api.get('/stations');
      const allStations = stationsRes.data;
      
      for (const station of allStations) {
        const nvrsRes = await api.get(`/stations/${station.id}/nvrs`);
        const found = nvrsRes.data.find((n: any) => n.id === nvrId);
        if (found) return found;
      }
      
      return null;
    },
    enabled: isEdit,
  });

  // Step 1 Form (New Station)
  const stationForm = useForm<StationFormData>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      city: '',
      state: '',
    },
  });

  // Step 2 Form (NVR Details)
  const nvrForm = useForm<NVRFormData>({
    resolver: zodResolver(nvrSchema),
    defaultValues: {
      name: '',
      ip: '',
      type: 'HIFOCUS',
      username: 'admin',
      password: '',
      totalChannel: 32,
    },
  });

  // Update form when existingNvr is loaded
  useEffect(() => {
    if (existingNvr) {
      nvrForm.reset({
        name: existingNvr.name,
        ip: existingNvr.ip,
        type: existingNvr.type,
        username: existingNvr.username,
        password: existingNvr.password || '', // Password might not be returned
        totalChannel: existingNvr.totalChannel,
      });
      setStationId(existingNvr.stationId);
    }
  }, [existingNvr, nvrForm]);

  const handleNext = async (data: StationFormData) => {
    setIsSubmittingStation(true);
    try {
      const response = await api.post('/stations', data);
      await queryClient.invalidateQueries({ queryKey: ['stations'] });
      setStationId(response.data.id);
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create station');
    } finally {
      setIsSubmittingStation(false);
    }
  };

  const handleExistingStation = (id: string) => {
    setStationId(id);
    setStep(2);
  };

  const onNVRSubmit = async (data: NVRFormData) => {
    if (!stationId) return;
    try {
      if (isEdit) {
        await api.put(`/stations/${stationId}/nvrs/${nvrId}`, data);
        toast.success('NVR updated successfully');
      } else {
        await api.post(`/stations/${stationId}/nvrs`, data);
        toast.success('NVR added successfully');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['nvrs', stationId] });
      await queryClient.invalidateQueries({ queryKey: ['stations'] });
      if (isEdit) {
        await queryClient.invalidateQueries({ queryKey: ['nvr', nvrId] });
      }
      
      navigate('/stations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'add'} NVR`);
    }
  };

  if (nvrLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8d90a0]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2563eb]" />
        <p className="text-xs uppercase tracking-widest font-bold">Loading NVR Details</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Step Indicator - Hide if editing */}
      {!isEdit && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${step === 1 ? 'border-[#2563eb] bg-[#2563eb]/10 text-[#2563eb]' : 'border-[#2a2a2a] text-[#8d90a0]'}`}>
              1
            </div>
            <div className="h-px w-8 bg-[#2a2a2a]" />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${step === 2 ? 'border-[#2563eb] bg-[#2563eb]/10 text-[#2563eb]' : 'border-[#2a2a2a] text-[#8d90a0]'}`}>
              2
            </div>
          </div>
          <span className="text-xs font-mono text-[#8d90a0] uppercase tracking-widest">
            Step {step} of 2
          </span>
        </div>
      )}

      {step === 1 && !isEdit && (
        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex p-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-[2px] w-full">
            <button
              onClick={() => setMode('new')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors rounded-sm ${mode === 'new' ? 'bg-[#2563eb] text-white' : 'text-[#8d90a0] hover:text-[#e5e2e1]'}`}
            >
              Create New Station
            </button>
            <button
              onClick={() => setMode('existing')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors rounded-sm ${mode === 'existing' ? 'bg-[#2563eb] text-white' : 'text-[#8d90a0] hover:text-[#e5e2e1]'}`}
            >
              Use Existing Station
            </button>
          </div>

          {mode === 'new' ? (
            <Form {...stationForm}>
              <form onSubmit={stationForm.handleSubmit(handleNext)} className="space-y-4">
                <FormField
                  control={stationForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Station Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" placeholder="e.g. Mumbai Central" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={stationForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">City</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" placeholder="e.g. Mumbai" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={stationForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">State</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" placeholder="e.g. Maharashtra" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="ghost" onClick={() => navigate('/admin')} className="text-[#8d90a0]">Cancel</Button>
                  <Button type="submit" disabled={isSubmittingStation} className="bg-[#2563eb] hover:bg-[#2563eb]/90 px-8">
                    {isSubmittingStation ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[#8d90a0] text-xs uppercase font-bold">Select Station</label>
                <Select onValueChange={handleExistingStation}>
                  <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#e5e2e1]">
                    <SelectValue placeholder={stationsLoading ? "Loading stations..." : "Choose a station"} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131313] border-[#2a2a2a] text-[#e5e2e1]">
                    {stations?.map((station) => (
                      <SelectItem key={station.id} value={station.id} className="focus:bg-[#2563eb] focus:text-white">
                        {station.name} ({station.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="ghost" onClick={() => navigate('/admin')} className="text-[#8d90a0]">Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <Form {...nvrForm}>
          <form onSubmit={nvrForm.handleSubmit(onNVRSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={nvrForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Custom Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" placeholder="e.g. NVR 01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={nvrForm.control}
                name="ip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">IP Address</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb] font-mono" placeholder="192.168.1.10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={nvrForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">NVR Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#e5e2e1]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#131313] border-[#2a2a2a] text-[#e5e2e1]">
                        <SelectItem value="HIFOCUS" className="focus:bg-[#2563eb] focus:text-white">HIFOCUS</SelectItem>
                        <SelectItem value="HIKVISION" className="focus:bg-[#2563eb] focus:text-white">HIKVISION</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={nvrForm.control}
                name="totalChannel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Total Channels</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value))}
                        className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={nvrForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Username</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={nvrForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-[#2a2a2a]">
              {!isEdit && (
                <Button type="button" variant="ghost" onClick={() => setStep(1)} className="text-[#8d90a0]">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              <div className={`flex gap-4 ${isEdit ? 'w-full justify-end' : ''}`}>
                <Button type="button" variant="ghost" onClick={() => navigate('/admin')} className="text-[#8d90a0]">Cancel</Button>
                <Button type="submit" disabled={nvrForm.formState.isSubmitting} className="bg-[#2563eb] hover:bg-[#2563eb]/90 px-8">
                  {nvrForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Update NVR' : 'Save NVR'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};
