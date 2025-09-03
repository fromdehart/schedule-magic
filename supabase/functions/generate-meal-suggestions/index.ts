import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface MealRequest {
  category: string
  preferences?: string | null
  isKidsMeal?: boolean
}

interface MealSuggestion {
  title: string
  description: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const { category, preferences, isKidsMeal }: MealRequest = await req.json()

    if (!category) {
      return new Response(
        JSON.stringify({ error: 'Category is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create the prompt for OpenAI
    const systemPrompt = `You are a helpful meal planning assistant. Generate 3 specific, practical meal suggestions based on the meal category and user preferences provided. Each suggestion should be a complete meal idea that a family could realistically prepare.

Return your response as a JSON array of objects with this structure:
[
  {
    "title": "Specific meal name (e.g., 'Honey Garlic Chicken Thighs with Roasted Vegetables')",
    "description": "Short, inspiring description that helps someone decide what to make (1 sentence max)"
  }
]

Focus on:
- Practical, family-friendly meals
- Clear, specific meal names (not generic)
- Short, inspiring descriptions
- Variety in cooking methods and flavors
- Consider dietary preferences if mentioned

${isKidsMeal ? 'IMPORTANT: These are KIDS MEALS. Make them fun, appealing to children, and easy to eat. Use kid-friendly language and focus on familiar, comforting foods that kids typically enjoy.' : ''}`

    const userPrompt = preferences 
      ? `Category: ${category}\nUser preferences: ${preferences}\n${isKidsMeal ? 'Target: Kids meal' : 'Target: Family meal'}\n\nPlease suggest 3 specific ${category.toLowerCase()} meals that match these preferences.`
      : `Category: ${category}\n${isKidsMeal ? 'Target: Kids meal' : 'Target: Family meal'}\n\nPlease suggest 3 popular, ${isKidsMeal ? 'kid-friendly' : 'family-friendly'} ${category.toLowerCase()} meals.`

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openAIResponse.status}`)
    }

    const openAIData = await openAIResponse.json()
    const content = openAIData.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    // Parse the JSON response from OpenAI
    let suggestions: MealSuggestion[]
    try {
      suggestions = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      // Fallback to default suggestions if parsing fails
      suggestions = [
        {
          title: `Classic ${category}`,
          description: `A traditional ${category.toLowerCase()} meal that's perfect for family dinner.`
        },
        {
          title: `Homestyle ${category}`,
          description: `A comforting ${category.toLowerCase()} dish with familiar flavors everyone will love.`
        },
        {
          title: `Quick ${category}`,
          description: `An easy-to-make ${category.toLowerCase()} meal perfect for busy weeknights.`
        }
      ]
    }

    // Ensure we have exactly 3 suggestions
    if (suggestions.length > 3) {
      suggestions = suggestions.slice(0, 3)
    } else if (suggestions.length < 3) {
      // Pad with generic suggestions if needed
      while (suggestions.length < 3) {
        suggestions.push({
          title: `${category} Option ${suggestions.length + 1}`,
          description: `A delicious ${category.toLowerCase()} meal option for your family.`
        })
      }
    }

    return new Response(
      JSON.stringify({ suggestions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error generating meal suggestions:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate meal suggestions',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})