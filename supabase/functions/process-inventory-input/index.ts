import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface InventoryRequest {
  locationName: string
  rawInput: string
}

interface ProcessedInventoryItem {
  name: string
  quantity?: number
  unit?: string
  category?: string
  notes?: string
  estimated_expiry?: string
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

    const { locationName, rawInput }: InventoryRequest = await req.json()

    if (!locationName || !rawInput) {
      return new Response(
        JSON.stringify({ error: 'Location name and raw input are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create the prompt for OpenAI
    const systemPrompt = `You are a helpful inventory management assistant. Your job is to convert natural language descriptions of food items into structured inventory data.

The user is describing what they see in their ${locationName}. Convert their description into a list of individual food items with quantities, units, and categories.

Return your response as a JSON array of objects with this structure:
[
  {
    "name": "Specific food item name (e.g., 'Black Beans', 'Ground Beef', 'Bell Peppers')",
    "quantity": number (if specified, otherwise null),
    "unit": "Unit of measurement (e.g., 'cans', 'lbs', 'pieces', 'bags') or null if not specified",
    "category": "Food category (e.g., 'Proteins', 'Vegetables', 'Grains', 'Dairy', 'Pantry Staples', 'Frozen Foods')",
    "notes": "Any additional context or notes (e.g., 'leftover', 'half full', 'expires soon') or null if none",
    "estimated_expiry": "ONLY set this if the user explicitly mentions an expiration date, otherwise set to null"
  }
]

Guidelines:
- Break down compound descriptions into individual items
- Infer reasonable quantities and units when not specified
- Categorize items appropriately for the storage location
- Handle approximate quantities (e.g., "some", "half", "leftover")
- Be specific with food names (e.g., "Black Beans" not just "beans")
- If no quantity is mentioned, set quantity to null
- If no unit is mentioned, set unit to null
- If no category is mentioned, infer from the food type
- If no notes are mentioned, set notes to null
- CRITICAL: Only set estimated_expiry if the user explicitly mentions a date, time period, or expiration information
- Do NOT guess or estimate expiration dates based on food type or location
- Do NOT set expiration dates for pantry items unless specifically mentioned
- If the user says "expires Aug 25th" or "good until next week", then set the date
- If the user just says "broccoli" or "cans of beans", set estimated_expiry to null

Examples:
Input: "2 cans black beans, 1 lb ground beef, 3 bell peppers"
Output: [
  {"name": "Black Beans", "quantity": 2, "unit": "cans", "category": "Pantry Staples", "notes": null, "estimated_expiry": null},
  {"name": "Ground Beef", "quantity": 1, "unit": "lb", "category": "Proteins", "notes": null, "estimated_expiry": null},
  {"name": "Bell Peppers", "quantity": 3, "unit": "pieces", "category": "Vegetables", "notes": null, "estimated_expiry": null}
]

Input: "some leftover chicken, half a bag of spinach"
Output: [
  {"name": "Cooked Chicken", "quantity": null, "unit": null, "category": "Proteins", "notes": "leftover", "estimated_expiry": null},
  {"name": "Spinach", "quantity": 0.5, "unit": "bag", "category": "Vegetables", "notes": "half full", "estimated_expiry": null}
]

Input: "milk expires tomorrow, yogurt good until Friday, cheese"
Output: [
  {"name": "Milk", "quantity": null, "unit": null, "category": "Dairy", "notes": null, "estimated_expiry": "2025-01-02"},
  {"name": "Yogurt", "quantity": null, "unit": null, "category": "Dairy", "notes": null, "estimated_expiry": "2025-01-03"},
  {"name": "Cheese", "quantity": null, "unit": null, "category": "Dairy", "notes": null, "estimated_expiry": null}
]`

    const userPrompt = `Location: ${locationName}\nRaw input: "${rawInput}"\n\nPlease convert this into structured inventory items.`

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
        temperature: 0.3,
        max_tokens: 1000,
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
    let processedItems: ProcessedInventoryItem[]
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        processedItems = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No valid JSON array found in response')
      }
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`)
    }

    // Validate the processed items
    if (!Array.isArray(processedItems)) {
      throw new Error('Processed items is not an array')
    }

    // Get location ID
    const { data: locations, error: locationError } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('name', locationName)
      .single()

    if (locationError || !locations) {
      throw new Error(`Location '${locationName}' not found`)
    }

    // Log the processing action
    const { error: auditError } = await supabase
      .from('inventory_audit_log')
      .insert({
        user_id: user.id,
        location_id: locations.id,
        action: 'process_input',
        raw_input: rawInput,
        processed_items: processedItems
      })

    if (auditError) {
      console.warn('Failed to log audit entry:', auditError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        items: processedItems,
        location: locationName
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error processing inventory input:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process inventory input',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
