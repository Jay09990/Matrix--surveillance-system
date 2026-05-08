import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../../services/api';
import { useNVR } from './useNVRs';
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

export const AddNVRForm = () => {
  const { nvrId } = useParams<{ nvrId: string; stationId?: string }>();
  const isEdit = !!nvrId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showPassword, setShowPassword] = useState(false);

  // Fetch existing NVR when in edit mode
  const { data: existingNvr, isLoading: nvrLoading } = useNVR(nvrId ?? null);

  const form = useForm<NVRFormData>({
    resolver: zodResolver(nvrSchema),
    defaultValues: {
      name: '',
      ip: '',
      type: 'HIFOCUS',
      rtspPort: undefined,
      httpPort: undefined,
      username: 'admin',
      password: '',
      stationName: '',
      stationCity: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingNvr) {
      form.reset({
        name: existingNvr.name,
        ip: existingNvr.ip,
        type: existingNvr.type,
        rtspPort: existingNvr.rtspPort,
        httpPort: existingNvr.httpPort,
        username: existingNvr.username,
        password: '',
        stationName: existingNvr.station.name,
        stationCity: existingNvr.station.city,
      });
    }
  }, [existingNvr, form]);

  const onSubmit = async (data: NVRFormData) => {
    try {
      if (isEdit && nvrId) {
        await apiService.nvrs.update(nvrId, data);
        toast.success('NVR updated successfully');
        await queryClient.invalidateQueries({ queryKey: ['nvr', nvrId] });
      } else {
        await apiService.nvrs.create(data);
        toast.success('NVR created successfully');
      }
      await queryClient.invalidateQueries({ queryKey: ['nvrs'] });
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} NVR`);
    }
  };

  if (isEdit && nvrLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8d90a0]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2563eb]" />
        <p className="text-xs uppercase tracking-widest font-bold">Loading NVR Details</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Station Info ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[#2a2a2a]">
            <div className="w-1.5 h-4 bg-[#2563eb] rounded-sm" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Station Info</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="stationName"
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
            <FormField
              control={form.control}
              name="stationCity"
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
          </div>
        </div>

        {/* ── NVR Details ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[#2a2a2a]">
            <div className="w-1.5 h-4 bg-[#2563eb] rounded-sm" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">NVR Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">NVR Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="rtspPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">RTSP Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="554"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb] font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="httpPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">HTTP Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="80"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb] font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* ── Credentials ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-[#2a2a2a]">
            <div className="w-1.5 h-4 bg-[#2563eb] rounded-sm" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Credentials</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
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
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">
                    Password {isEdit && <span className="text-[#383838] normal-case font-normal ml-1">(leave blank to keep current)</span>}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        {...field}
                        className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d90a0] hover:text-[#e5e2e1] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="flex justify-end gap-4 pt-4 border-t border-[#2a2a2a]">
          <Button type="button" variant="ghost" onClick={() => navigate('/admin')} className="text-[#8d90a0]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-[#2563eb] hover:bg-[#2563eb]/90 px-8"
          >
            {form.formState.isSubmitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isEdit ? 'Update NVR' : 'Save NVR'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
