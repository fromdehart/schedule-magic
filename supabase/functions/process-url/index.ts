import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessUrlRequest {
  url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url }: ProcessUrlRequest = await req.json()

    if (!url || url.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ActivityMagic/1.0 (Activity Processing Bot)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    
    // Extract text content from HTML
    const content = extractTextFromHTML(html)
    
    // Also try to extract structured data (Open Graph, JSON-LD, etc.)
    const structuredData = extractStructuredData(html)

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: content,
        structuredData: structuredData,
        url: url
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing URL:', error)
    
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

function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ')
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ')
  text = text.trim()
  
  // Limit length
  if (text.length > 2000) {
    text = text.substring(0, 2000) + '...'
  }
  
  return text
}

function extractStructuredData(html: string): any {
  const structuredData: any = {}
  
  // Extract Open Graph data
  const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i)
  if (ogTitle) {
    structuredData.title = ogTitle[1]
  }
  
  const ogDescription = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i)
  if (ogDescription) {
    structuredData.description = ogDescription[1]
  }
  
  const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i)
  if (ogImage) {
    structuredData.image = ogImage[1]
  }
  
  // Extract regular meta tags
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (title && !structuredData.title) {
    structuredData.title = title[1]
  }
  
  const description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)
  if (description && !structuredData.description) {
    structuredData.description = description[1]
  }
  
  return structuredData
}
