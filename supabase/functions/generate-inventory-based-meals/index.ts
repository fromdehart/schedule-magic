import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface MealRequest {
  ingredients: string
  location: string
}

interface Ingredient {
  id: string
  name: string
  amount: string
  unit: string
  notes?: string
}

interface MealSuggestion {
  title: string
  description: string
  ingredients: Ingredient[]
  difficulty: 'Easy' | 'Medium' | 'Hard'
  prepTime: string
  servings: number
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

    const { ingredients, location }: MealRequest = await req.json()

    if (!ingredients) {
      return new Response(
        JSON.stringify({ error: 'Ingredients are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create the prompt for OpenAI
    const systemPrompt = `You are a creative chef and meal planning expert. Your job is to suggest delicious, practical meals that can be made using the available ingredients.

The user has these ingredients available: ${ingredients}

Generate 6 meal suggestions that:
1. Use primarily the ingredients they have
2. Are realistic and achievable for home cooking
3. Include a mix of difficulty levels and meal types
4. Provide clear, appetizing descriptions
5. List the key ingredients needed with proper amounts and units

Return your response as a JSON array of objects with this structure:
[
  {
    "title": "Creative, descriptive meal name",
    "description": "Appetizing 1-2 sentence description that makes someone want to cook this",
    "ingredients": [
      {
        "id": "unique-id-1",
        "name": "ingredient name",
        "amount": "2",
        "unit": "cups",
        "notes": "optional notes about preparation or type"
      }
    ],
    "difficulty": "Easy|Medium|Hard",
    "prepTime": "15 min|30 min|45 min|1 hour",
    "servings": 4
  }
]

Guidelines for ingredients:
- Each ingredient must have a unique "id" (use simple strings like "ing1", "ing2", etc.)
- "name" should be the ingredient name (e.g., "chicken breast", "olive oil")
- "amount" should be a reasonable quantity (e.g., "2", "1/2", "3/4")
- "unit" should be a standard cooking unit (e.g., "cups", "tbsp", "cloves", "lb", "oz")
- "notes" is optional but helpful for preparation details (e.g., "minced", "boneless", "extra virgin")
- Focus on meals that maximize the available ingredients
- Suggest meals that are family-friendly and practical
- Include a variety of cuisines and cooking methods
- Keep descriptions inspiring but realistic
- Consider seasonal appropriateness and cooking skill levels
- If they have limited ingredients, suggest simple, creative combinations
- Include at least 2 "Easy" difficulty meals for beginners

Examples of good meal names:
- "One-Pan Mediterranean Chicken with Roasted Vegetables"
- "Spicy Black Bean and Sweet Potato Tacos"
- "Creamy Mushroom and Spinach Pasta"
- "Sheet Pan Salmon with Garlic Herb Butter"
- "Quick Thai-Inspired Stir-Fry"
- "Cozy Lentil and Vegetable Soup"`

    const userPrompt = `Available ingredients: ${ingredients}

Please suggest 6 delicious meals I can make with these ingredients. For each meal, provide the ingredients with proper amounts and units (e.g., "2 cups rice", "1 lb chicken breast", "3 cloves garlic").`

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
        max_tokens: 1500,
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text()
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorData}`)
    }

    const openAIData = await openAIResponse.json()
    const content = openAIData.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    // Parse the JSON response from OpenAI
    let mealSuggestions: MealSuggestion[]
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        mealSuggestions = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No valid JSON array found in response')
      }
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`)
    }

    // Validate the processed items
    if (!Array.isArray(mealSuggestions)) {
      throw new Error('Meal suggestions is not an array')
    }

    // Validate that each meal has properly structured ingredients
    for (const meal of mealSuggestions) {
      if (!meal.ingredients || !Array.isArray(meal.ingredients)) {
        throw new Error(`Meal "${meal.title}" is missing ingredients array`)
      }
      
      for (const ingredient of meal.ingredients) {
        // Check if ingredient is an object
        if (typeof ingredient !== 'object' || ingredient === null) {
          throw new Error(`Meal "${meal.title}" has invalid ingredient: not an object`)
        }
        
        // Check required fields
        if (!ingredient.id) {
          // Generate an ID if missing
          ingredient.id = `ing${Math.random().toString(36).substr(2, 9)}`
        }
        
        if (!ingredient.name) {
          throw new Error(`Meal "${meal.title}" has ingredient missing name field`)
        }
        
        if (!ingredient.amount) {
          // Set default amount if missing
          ingredient.amount = "1"
        }
        
        if (!ingredient.unit) {
          // Set default unit if missing
          ingredient.unit = "portion"
        }
        
        // Ensure notes is a string or undefined
        if (ingredient.notes !== undefined && typeof ingredient.notes !== 'string') {
          ingredient.notes = String(ingredient.notes)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        meals: mealSuggestions,
        ingredients: ingredients,
        location: location
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error generating meal suggestions:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate meal suggestions',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
