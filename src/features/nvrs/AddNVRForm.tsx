import { useState, useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
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

// ── Typed form hook ────────────────────────────────────────────────────────────
// Locks all three generic params (TFieldValues, TContext, TTransformedValues)
// so `form.control` resolves to Control<NVRFormData, any, NVRFormData>.
// The explicit return type hides the zodResolver cast from consumers, so every
// FormField usage in this file gets the same resolved type without a generic leak.
function useNVRForm(): UseFormReturn<NVRFormData> {
  return useForm<NVRFormData, any, NVRFormData>({
    resolver: zodResolver(nvrSchema) as any,
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
}


export function AddNVRForm() {
  const navigate = useNavigate();
  const { nvrId } = useParams<{ nvrId: string }>();
  const isEdit = !!nvrId;
  const queryClient = useQueryClient();

  const { data: existing } = useNVR(nvrId ?? null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useNVRForm();

  useEffect(() => {
    if (existing) {
      form.reset({
        name: existing.name,
        ip: existing.ip,
        type: existing.type,
        rtspPort: existing.rtspPort,
        httpPort: existing.httpPort,
        username: existing.username,
        password: '',
        stationName: existing.station.name,
        stationCity: existing.station.city,
      });
    }
  }, [existing, form]);

  const onSubmit = async (values: NVRFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        rtspPort: values.rtspPort === '' ? undefined : values.rtspPort,
        httpPort: values.httpPort === '' ? undefined : values.httpPort,
        password: values.password === '' ? undefined : values.password,
      };

      if (isEdit) {
        await apiService.nvrs.update(nvrId!, payload);
        toast.success('NVR updated');
      } else {
        await apiService.nvrs.create(payload);
        toast.success('NVR added');
      }

      await queryClient.invalidateQueries({ queryKey: ['nvrs'] });
      navigate('/admin');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save NVR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="HQ-NVR-01" {...field} />
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
                <FormLabel>IP Address</FormLabel>
                <FormControl>
                  <Input placeholder="192.168.1.10" {...field} />
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
                <FormLabel>NVR Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="HIKVISION">Hikvision</SelectItem>
                    <SelectItem value="HIFOCUS">HiFocus</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="admin" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rtspPort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RTSP Port</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="554" {...field} />
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
                <FormLabel>HTTP Port</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="80" {...field} />
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
                <FormLabel>{isEdit ? 'Password (leave blank to keep current)' : 'Password'}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} {...field} />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d90a0] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stationName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Station Name</FormLabel>
                <FormControl>
                  <Input placeholder="New Delhi HQ" {...field} />
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
                <FormLabel>Station City</FormLabel>
                <FormControl>
                  <Input placeholder="New Delhi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
          <Button type="button" variant="outline" onClick={() => navigate('/admin')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add NVR'}
          </Button>
        </div>
      </form>
    </Form>
  );
}