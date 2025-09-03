import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface ProcessActivityRequest {
  content: string;
  url?: string;
}

interface ProcessedActivity {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const { content, url }: ProcessActivityRequest = await req.json()

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      // Fallback processing without OpenAI
      const fallbackActivity = processActivityFallback(content)
      return new Response(
        JSON.stringify({ success: true, activity: fallbackActivity }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Process with OpenAI
    const processedActivity = await processWithOpenAI(content, url, openaiApiKey)

    return new Response(
      JSON.stringify({ success: true, activity: processedActivity }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing activity:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processWithOpenAI(
  content: string, 
  url?: string, 
  apiKey: string
): Promise<ProcessedActivity> {
  const prompt = `
You are an AI assistant that extracts structured information from activity descriptions or URLs. 
Analyze the following text and extract key details about an activity or event.

${url ? `URL to analyze: ${url}` : `Text to analyze: "${content}"`}

Please extract and return a JSON object with the following structure:
{
  "title": "A clear, concise title for the activity (max 100 characters)",
  "description": "A detailed description of the activity (max 500 characters)",
  "location": "The location/venue if mentioned (optional)",
  "categories": ["array", "of", "relevant", "categories"],
  "date": "YYYY-MM-DD format if date is mentioned (optional)",
  "time": "HH:MM format if time is mentioned (optional)",
  "estimated_duration": "duration in minutes if mentioned (optional)",
  "cost_estimate": "cost information if mentioned (optional)",
  "age_appropriate": "age recommendations if mentioned (optional)",
  "weather_dependent": "true/false if weather dependency is clear (optional)"
}

Categories should be from this list: food, entertainment, outdoor, culture, shopping, family, social, sports, education, wellness, travel, general

If information is not available or unclear, omit that field from the response.
Return only the JSON object, no additional text.
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No content received from OpenAI')
  }

  try {
    const parsed = JSON.parse(content)
    return parsed as ProcessedActivity
  } catch (error) {
    console.error('Failed to parse OpenAI response:', content)
    throw new Error('Invalid response format from OpenAI')
  }
}

function processActivityFallback(content: string): ProcessedActivity {
  // Simple fallback processing
  const lines = content.split('\n').filter(line => line.trim())
  
  let title = lines[0] || 'New Activity'
  let description = content.length > 500 ? content.substring(0, 500) + '...' : content
  
  // Basic category detection
  const categories: string[] = []
  const lowerContent = content.toLowerCase()
  
  if (lowerContent.includes('restaurant') || lowerContent.includes('food') || lowerContent.includes('eat')) {
    categories.push('food')
  }
  if (lowerContent.includes('museum') || lowerContent.includes('gallery') || lowerContent.includes('art')) {
    categories.push('culture')
  }
  if (lowerContent.includes('park') || lowerContent.includes('outdoor') || lowerContent.includes('hiking')) {
    categories.push('outdoor')
  }
  if (lowerContent.includes('movie') || lowerContent.includes('theater') || lowerContent.includes('show')) {
    categories.push('entertainment')
  }
  if (lowerContent.includes('shop') || lowerContent.includes('store') || lowerContent.includes('mall')) {
    categories.push('shopping')
  }
  if (lowerContent.includes('family') || lowerContent.includes('kids') || lowerContent.includes('children')) {
    categories.push('family')
  }
  
  if (categories.length === 0) {
    categories.push('general')
  }
  
  return {
    title: title.length > 100 ? title.substring(0, 100) + '...' : title,
    description,
    categories,
    location: undefined,
    date: undefined,
    time: undefined,
    estimated_duration: undefined,
    cost_estimate: undefined,
    age_appropriate: undefined,
    weather_dependent: undefined
  }
}
