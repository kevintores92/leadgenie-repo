/**
 * API Integration Helper for Dashboard-Dark
 * 
 * This file contains ready-to-use API call patterns for all features.
 * Copy/paste these into the respective page components.
 */

import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== CAMPAIGNS ====================

export const useCampaigns = () => {
  return useQuery({
    queryKey: ['/campaigns'],
    queryFn: getQueryFn({ on401: 'throw' })
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; template: string }) => {
      const response = await apiRequest('POST', '/campaigns', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/campaigns'] });
    }
  });
};

export const useStartCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, batchSize = 50, intervalMinutes = 30 }: { id: string; batchSize?: number; intervalMinutes?: number }) => {
      const response = await apiRequest('POST', `/campaigns/${id}/start`, {
        batchSize,
        intervalMinutes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/campaigns'] });
    }
  });
};

export const usePauseCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/campaigns/${id}/pause`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/campaigns'] });
    }
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/campaigns/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/campaigns'] });
    }
  });
};

// ==================== CONTACTS ====================

export const useContacts = () => {
  return useQuery({
    queryKey: ['/contacts'],
    queryFn: getQueryFn({ on401: 'throw' })
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const response = await apiRequest('PUT', `/contacts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/contacts'] });
    }
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest('POST', '/contacts', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/contacts'] });
    }
  });
};

// ==================== MESSAGES ====================

export const useMessages = () => {
  return useQuery({
    queryKey: ['/messages'],
    queryFn: getQueryFn({ on401: 'throw' })
  });
};

export const useMarkMessageVerified = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest('POST', `/messages/${messageId}/mark-verified`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/messages'] });
    }
  });
};

export const useMarkMessageWrongNumber = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest('POST', `/messages/${messageId}/mark-wrong-number`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/messages'] });
    }
  });
};

export const useMarkMessageDNC = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest('POST', `/messages/${messageId}/mark-dnc`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/messages'] });
    }
  });
};

// ==================== DRIPS ====================

export const useDrips = () => {
  return useQuery({
    queryKey: ['/drips'],
    queryFn: getQueryFn({ on401: 'throw' })
  });
};

export const useCreateDrip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest('POST', '/drips', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/drips'] });
    }
  });
};

export const useToggleDripActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await apiRequest('PATCH', `/drips/${id}`, { active });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/drips'] });
    }
  });
};

export const useDeleteDrip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/drips/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/drips'] });
    }
  });
};

// ==================== STATUS TRACKING ====================

export const useMessageStatus = (status?: string) => {
  const queryKey = status ? ['/messages', { status }] : ['/messages'];
  return useQuery({
    queryKey,
    queryFn: getQueryFn({ on401: 'throw' })
  });
};

// ==================== USAGE EXAMPLES ====================

/**
 * CAMPAIGNS EXAMPLE:
 * 
 * const { data: campaigns } = useCampaigns();
 * const createCampaign = useCreateCampaign();
 * const startCampaign = useStartCampaign();
 * 
 * const handleCreate = async (data) => {
 *   await createCampaign.mutateAsync(data);
 * };
 * 
 * const handleStart = async (id) => {
 *   await startCampaign.mutateAsync({ id });
 * };
 */

/**
 * CONTACTS EXAMPLE:
 * 
 * const { data: contacts } = useContacts();
 * const updateContact = useUpdateContact();
 * 
 * const handleUpdate = async (id, data) => {
 *   await updateContact.mutateAsync({ id, data });
 * };
 */

/**
 * MESSAGE ACTIONS EXAMPLE:
 * 
 * const markVerified = useMarkMessageVerified();
 * const markWrongNumber = useMarkMessageWrongNumber();
 * const markDNC = useMarkMessageDNC();
 * 
 * const handleVerified = async (messageId) => {
 *   await markVerified.mutateAsync(messageId);
 * };
 */
