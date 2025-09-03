import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}



serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🤖 Generate ingredients function called')
    
    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.log('❌ No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const { category, title, details, emoji, target } = await req.json()
    console.log('📝 Request data:', { category, title, details, emoji, target })

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the user from the auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('❌ Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ User authenticated:', user.email)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.log('❌ No OpenAI API key configured')
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine serving size based on target
    const servingSize = target === 'main' ? 4 : 2
    const mealType = target === 'main' ? 'adult meal' : 'kids meal'

    // Create the prompt for OpenAI
    const prompt = `Generate a shopping list of ingredients for a ${mealType} serving ${servingSize} people.

Meal Details:
- Category: ${category}
- Title: ${title || 'Not specified'}
- Details: ${details || 'Not specified'}
- Target: ${mealType}

Please provide ingredients in this exact JSON format:
{
  "success": true,
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "quantity as string (only if it's a measurable amount)",
      "unit": "unit of measurement (only if amount is provided and it's a real unit)",
      "notes": "optional notes or preparation instructions"
    }
  ]
}

Guidelines:
- Include realistic quantities for ${servingSize} ${target === 'kids' ? 'children' : 'adults'}
- Only include "amount" if it's a measurable quantity (e.g., "2", "1/2", "3")
- Only include "unit" if the amount is provided AND it's a real unit of measurement
- For whole items, omit both amount and unit (e.g., just "Chicken breast")
- For countable items, use "count" as unit (e.g., "4 eggs")
- Use common units: cups, lbs, tsp, tbsp, count, oz, etc.
- Include preparation notes when helpful (e.g., "diced", "minced", "fresh")
- For kids meals, consider simpler ingredients and smaller portions
- Be practical and specific
- Return only the JSON, no additional text`

    console.log('🎯 Sending request to OpenAI')
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful cooking assistant that generates ingredient lists for meal planning. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.log('❌ OpenAI API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.log('Error details:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to generate ingredients',
          ingredients: []
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    console.log('📦 OpenAI response:', data)

    if (data.choices && data.choices[0] && data.choices[0].message) {
      try {
        // Parse the JSON response from OpenAI
        const content = data.choices[0].message.content.trim()
        console.log('📝 OpenAI content:', content)
        
        const ingredientsResponse = JSON.parse(content)
        console.log('✅ Parsed ingredients:', ingredientsResponse)

        return new Response(
          JSON.stringify(ingredientsResponse.ingredients || []),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (parseError) {
        console.log('❌ Error parsing OpenAI response:', parseError)
        console.log('Raw content:', data.choices[0].message.content)
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to parse ingredients response',
            ingredients: []
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else {
      console.log('❌ Unexpected OpenAI response format:', data)
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unexpected response format',
          ingredients: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        ingredients: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
