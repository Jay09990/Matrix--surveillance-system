import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { stationSchema, type StationFormData } from '../../schemas/station.schema';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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

export const AddStationForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<StationFormData>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      city: '',
      state: '',
    },
  });

  const onSubmit = async (data: StationFormData) => {
    try {
      await api.post('/stations', data);
      await queryClient.invalidateQueries({ queryKey: ['stations'] });
      toast.success('Station added successfully');
      navigate('/stations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add station');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">Station Name</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" placeholder="e.g. New Delhi HQ" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">City</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" placeholder="e.g. New Delhi" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#8d90a0] text-xs uppercase font-bold">State</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-[#0d0d0d] border-[#2a2a2a] focus-visible:ring-[#2563eb]" placeholder="e.g. Delhi" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-6 border-t border-[#2a2a2a] gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="text-[#8d90a0] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-[#2563eb] hover:bg-[#2563eb]/90 px-8"
          >
            {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Station'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
