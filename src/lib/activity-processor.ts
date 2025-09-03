import { ProcessedActivity } from '../types/activity';

export interface ActivityProcessingResult {
  success: boolean;
  activity?: ProcessedActivity;
  error?: string;
}

export async function processActivityInput(
  rawText: string,
  url?: string
): Promise<ActivityProcessingResult> {
  try {
    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      // Fallback to local processing if Supabase is not configured
      const fallbackActivity = processActivityFallback(rawText);
      return {
        success: true,
        activity: fallbackActivity
      };
    }

    // Call Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/process-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        content: rawText,
        url: url 
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        activity: result.activity
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to process activity'
      };
    }
  } catch (error) {
    console.error('Error processing activity:', error);
    // Fallback to local processing on error
    const fallbackActivity = processActivityFallback(rawText);
    return {
      success: true,
      activity: fallbackActivity
    };
  }
}

// Fallback processing for when OpenAI is not available
export function processActivityFallback(rawText: string): ProcessedActivity {
  // Simple fallback that extracts basic information
  const lines = rawText.split('\n').filter(line => line.trim());
  
  let title = lines[0] || 'New Activity';
  let description = lines.slice(1).join(' ') || rawText;
  
  // Try to extract location from common patterns
  let location: string | undefined;
  const locationPatterns = [
    /at\s+([^,.\n]+)/i,
    /in\s+([^,.\n]+)/i,
    /near\s+([^,.\n]+)/i,
    /@\s*([^,.\n]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      location = match[1].trim();
      break;
    }
  }
  
  // Try to extract date/time
  let date: string | undefined;
  let time: string | undefined;
  
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  ];
  
  for (const pattern of datePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      date = match[1];
      break;
    }
  }
  
  const timePatterns = [
    /(\d{1,2}:\d{2}\s*(am|pm)?)/i,
    /(\d{1,2}\s*(am|pm))/i
  ];
  
  for (const pattern of timePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      time = match[1];
      break;
    }
  }
  
  // Basic category detection
  const categories: string[] = [];
  const categoryKeywords = {
    'food': ['restaurant', 'cafe', 'dining', 'food', 'eat', 'lunch', 'dinner', 'breakfast'],
    'entertainment': ['movie', 'theater', 'show', 'concert', 'game', 'sports', 'entertainment'],
    'outdoor': ['park', 'hiking', 'beach', 'outdoor', 'nature', 'walk', 'bike'],
    'culture': ['museum', 'gallery', 'art', 'culture', 'exhibition', 'history'],
    'shopping': ['shop', 'store', 'mall', 'market', 'shopping'],
    'family': ['family', 'kids', 'children', 'playground', 'zoo', 'aquarium'],
    'social': ['party', 'gathering', 'meet', 'social', 'friends', 'group']
  };
  
  const lowerText = rawText.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      categories.push(category);
    }
  }
  
  if (categories.length === 0) {
    categories.push('general');
  }
  
  return {
    title: title.length > 100 ? title.substring(0, 100) + '...' : title,
    description: description.length > 500 ? description.substring(0, 500) + '...' : description,
    location,
    categories,
    date,
    time,
    estimated_duration: undefined,
    cost_estimate: undefined,
    age_appropriate: undefined,
    weather_dependent: undefined
  };
}
