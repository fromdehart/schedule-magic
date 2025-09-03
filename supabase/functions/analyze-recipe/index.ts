import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}



interface RecipeAnalysisRequest {
  url: string
  existingCategory?: string
  existingDetails?: string
}

interface RecipeAnalysisResponse {
  success: boolean
  category?: string
  details?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Initialize Supabase client for JWT verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    


    // Parse request body
    const { url, existingCategory, existingDetails }: RecipeAnalysisRequest = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }



    // Always proceed with analysis for now - simplified approach

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

        // Use OpenAI's built-in web browsing to analyze the recipe URL directly
    let aiAnalysis: { category?: string; details?: string } = {}
    
    try {
      const openaiRequest = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a recipe analyzer. You can browse the web to analyze recipe URLs. Generate:
1. The specific name/title of the recipe or meal (e.g., "Pasta alla Norma", "Chicken Tikka Masala", "Caesar Salad")
2. A brief, inspiring description of the dish (1-2 sentences max)

Focus on being specific and appetizing. Extract the actual recipe name from the webpage, not a generic category. If the URL is inaccessible or unclear, try analyzing the website meta data or the actual URL to take your best guess at filling in the details. Only respond with empty strings if absolutely nothing is available.`
          },
          {
            role: 'user',
            content: `Please browse to this recipe URL and analyze it to generate the recipe name and description:

URL: ${url}

Respond with JSON format only:
{
  "category": "specific recipe name or meal title",
  "details": "brief description or empty string"
}`
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      }
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openaiRequest),
      })

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json()
          
          const content = openaiData.choices?.[0]?.message?.content
          
          if (content) {
            try {
              // Clean the content - remove markdown code blocks if present
              let cleanContent = content.trim()
              
              // Remove ```json and ``` if present
              if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
              } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
              }
              
              const parsed = JSON.parse(cleanContent)
              aiAnalysis = {
                category: parsed.category || '',
                details: parsed.details || ''
              }
            } catch (parseError) {
              // Try to extract JSON from markdown as fallback
              try {
                const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
                if (jsonMatch) {
                  const fallbackContent = jsonMatch[1]
                  const fallbackParsed = JSON.parse(fallbackContent)
                  aiAnalysis = {
                    category: fallbackParsed.category || '',
                    details: fallbackParsed.details || ''
                  }
                }
              } catch (fallbackError) {
                // Fallback parsing failed
              }
            }
          }
        }
      } catch (openaiError) {
        // OpenAI API call failed
      }

    // Return results
    const response: RecipeAnalysisResponse = {
      success: true,
      category: aiAnalysis.category || '',
      details: aiAnalysis.details || '',
    }
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Recipe analysis error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        category: '',
        details: ''
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
