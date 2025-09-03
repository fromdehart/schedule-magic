// OpenAI API optimization utilities - Simplified version

export interface OptimizedOpenAIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

// Optimized configurations for different use cases
export const OPENAI_CONFIGS = {
  // Fast, focused responses for simple tasks
  FAST: {
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.3,
    timeout: 10000 // 10 seconds
  },
  
  // Balanced responses for moderate complexity
  BALANCED: {
    model: 'gpt-3.5-turbo',
    maxTokens: 800,
    temperature: 0.5,
    timeout: 15000 // 15 seconds
  },
  
  // High quality responses for complex tasks
  QUALITY: {
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.7,
    timeout: 30000 // 30 seconds
  }
} as const;

// Optimized prompts for common tasks
export const OPTIMIZED_PROMPTS = {
  ingredients: {
    system: 'You are a cooking assistant. Generate ingredient lists in valid JSON format only. Be concise and practical.',
    user: (category: string, title: string, details: string, target: string) => 
      `Generate ingredients for ${target === 'main' ? '4 adults' : '2 children'} eating ${category}${title ? `: ${title}` : ''}${details ? ` (${details})` : ''}. Return only valid JSON array of ingredients with name, amount, unit, notes.`
  },
  
  recipeAnalysis: {
    system: 'You are a recipe analyzer. Extract recipe name and description from URLs. Respond with valid JSON only.',
    user: (url: string) => 
      `Analyze this recipe URL: ${url}. Return JSON: {"category": "recipe name", "details": "description"}.`
  },
  
  mealSuggestions: {
    system: 'You are a meal planner. Generate meal suggestions in valid JSON format only.',
    user: (category: string, preferences: string) => 
      `Suggest 3 meals for ${category} category${preferences ? ` considering: ${preferences}` : ''}. Return JSON array with title, description, ingredients.`
  }
};

// Request timeout wrapper
export const withTimeout = <T>(
  promise: Promise<T>, 
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

// Simple timeout wrapper for fetch requests
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Fallback strategies for failed requests
export const fallbackStrategies = {
  ingredients: (category: string, target: string) => {
    const baseIngredients = {
      'breakfast': ['eggs', 'bread', 'milk', 'butter'],
      'lunch': ['chicken', 'rice', 'vegetables', 'olive oil'],
      'dinner': ['beef', 'potatoes', 'carrots', 'onions'],
      'snack': ['fruits', 'nuts', 'yogurt', 'cheese']
    };
    
    return baseIngredients[category as keyof typeof baseIngredients] || 
           ['protein', 'grains', 'vegetables', 'seasonings'];
  },
  
  recipeAnalysis: (url: string) => {
    // Extract basic info from URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const category = lastPart.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, '');
    
    return {
      category: category || 'Recipe',
      details: 'Recipe details from website'
    };
  }
};
