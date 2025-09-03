import { useState, useEffect, useCallback } from 'react';
import { Activity, ProcessedActivity } from '../types/activity';
import { supabase } from '../lib/supabase';

export interface UseActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  addActivity: (processedActivity: ProcessedActivity) => Promise<void>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  refreshActivities: () => Promise<void>;
}

export function useActivities(): UseActivitiesReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setActivities([]);
        return;
      }

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .or(`user_id.eq.${user.id},is_shared.eq.true`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, []);

  const addActivity = useCallback(async (processedActivity: ProcessedActivity) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const activityData: Omit<Activity, 'id' | 'created_at' | 'updated_at'> = {
        title: processedActivity.title,
        description: processedActivity.description,
        location: processedActivity.location,
        categories: processedActivity.categories,
        date: processedActivity.date,
        time: processedActivity.time,
        estimated_duration: processedActivity.estimated_duration,
        cost_estimate: processedActivity.cost_estimate,
        age_appropriate: processedActivity.age_appropriate,
        weather_dependent: processedActivity.weather_dependent || false,
        user_id: user.id,
        is_shared: false,
        shared_with: [],
        status: 'idea',
        priority: 'medium',
        notes: undefined,
        url: undefined,
        image_url: undefined
      };

      const { data, error } = await supabase
        .from('activities')
        .insert([activityData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setActivities(prev => [data, ...prev]);
    } catch (err) {
      console.error('Error adding activity:', err);
      throw err;
    }
  }, []);

  const updateActivity = useCallback(async (id: string, updates: Partial<Activity>) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setActivities(prev => 
        prev.map(activity => 
          activity.id === id ? { ...activity, ...data } : activity
        )
      );
    } catch (err) {
      console.error('Error updating activity:', err);
      throw err;
    }
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setActivities(prev => prev.filter(activity => activity.id !== id));
    } catch (err) {
      console.error('Error deleting activity:', err);
      throw err;
    }
  }, []);

  const refreshActivities = useCallback(async () => {
    await fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    addActivity,
    updateActivity,
    deleteActivity,
    refreshActivities
  };
}
