export interface Activity {
  id: string;
  title: string;
  description: string;
  location?: string;
  categories: string[];
  date?: string;
  time?: string;
  url?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_shared: boolean;
  shared_with?: string[]; // Array of user IDs or email addresses
  status: 'idea' | 'planned' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  estimated_duration?: number; // in minutes
  cost_estimate?: string;
  age_appropriate?: string;
  weather_dependent?: boolean;
  notes?: string;
}

export interface ActivityInput {
  raw_text: string;
  url?: string;
  user_id: string;
}

export interface ProcessedActivity {
  title: string;
  description: string;
  location?: string;
  categories: string[];
  date?: string;
  time?: string;
  estimated_duration?: number;
  cost_estimate?: string;
  age_appropriate?: string;
  weather_dependent?: boolean;
}

export interface ActivityCardProps {
  activity: Activity;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
  onShare?: (activity: Activity) => void;
  onStatusChange?: (activity: Activity, status: Activity['status']) => void;
}

export interface ActivityFormData {
  title: string;
  description: string;
  location: string;
  categories: string[];
  date: string;
  time: string;
  url: string;
  estimated_duration: number;
  cost_estimate: string;
  age_appropriate: string;
  weather_dependent: boolean;
  notes: string;
  is_shared: boolean;
  shared_with: string[];
}
