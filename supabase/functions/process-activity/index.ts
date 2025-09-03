import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any other text, explanations, or formatting.

Return a JSON object with this exact structure:
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

Categories must be from this list: food, entertainment, outdoor, culture, shopping, family, social, sports, education, wellness, travel, general

If information is not available or unclear, omit that field from the response.
CRITICAL: Return ONLY the JSON object, no other text.
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
  const responseContent = data.choices[0]?.message?.content

  if (!responseContent) {
    throw new Error('No content received from OpenAI')
  }

  try {
    // Try to clean the response content
    let cleanedContent = responseContent.trim()
    
    // Remove any markdown code blocks if present
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Fix common JSON issues
    // Replace single quotes with double quotes for property names and string values
    cleanedContent = cleanedContent
      .replace(/'/g, '"')  // Replace all single quotes with double quotes
      .replace(/"([^"]*)":/g, '"$1":')  // Ensure property names are properly quoted
      .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas before } or ]
    
    const parsed = JSON.parse(cleanedContent)
    
    // Validate that we have at least title and description
    if (!parsed.title || !parsed.description) {
      throw new Error('Missing required fields in OpenAI response')
    }
    
    return parsed as ProcessedActivity
  } catch (error) {
    console.error('Failed to parse OpenAI response:', responseContent)
    console.error('Parse error:', error)
    
    // Try a more aggressive cleaning approach
    try {
      // Extract JSON-like content using regex
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        let jsonContent = jsonMatch[0]
        // Fix common issues
        jsonContent = jsonContent
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":')  // Quote unquoted property names
          .replace(/:\s*([^",}\]]+)(?=[,}\]])/g, ': "$1"')  // Quote unquoted string values
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas before } or ]
        
        const parsed = JSON.parse(jsonContent)
        if (parsed.title && parsed.description) {
          return parsed as ProcessedActivity
        }
      }
    } catch (secondError) {
      console.error('Second parsing attempt failed:', secondError)
    }
    
    // Return a fallback response instead of throwing
    return {
      title: content.length > 100 ? content.substring(0, 100) + '...' : content,
      description: content.length > 500 ? content.substring(0, 500) + '...' : content,
      categories: ['general'],
      location: undefined,
      date: undefined,
      time: undefined,
      estimated_duration: undefined,
      cost_estimate: undefined,
      age_appropriate: undefined,
      weather_dependent: undefined
    }
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
