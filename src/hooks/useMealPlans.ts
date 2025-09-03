import { useState, useEffect, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Meal {
  id: string
  title: string
  image: string
  hasKidsMeal?: boolean
  kidsMeal?: {
    title: string
    image: string
  }
  recipeUrl?: string
  type?: 'meal'
}

export interface MealTypePlaceholder {
  type: 'placeholder'
  category: string
  emoji: string
  details?: string
  recipeUrl?: string
}

export interface DayMealPlan {
  mainMeal: Meal | MealTypePlaceholder | null
  kidsMeal: Meal | MealTypePlaceholder | null
}

export interface Ingredient {
  id: string
  name: string
  amount: string
  unit: string
  notes?: string
}

export interface DayIngredients {
  day: string
  mainMeal: {
    items: Ingredient[]
    servingSize: number
  }
  kidsMeal: {
    items: Ingredient[]
    servingSize: number
  }
}

// Helper type guard to check if a meal is a placeholder
export function isMealPlaceholder(meal: Meal | MealTypePlaceholder | null | undefined): meal is MealTypePlaceholder {
  return meal != null && typeof meal === 'object' && 'type' in meal && meal.type === 'placeholder'
}

// Helper type guard to check if a meal is a regular meal
export function isRegularMeal(meal: Meal | MealTypePlaceholder | null | undefined): meal is Meal {
  return meal != null && typeof meal === 'object' && (!('type' in meal) || meal.type !== 'placeholder')
}

export type WeekPlan = { [key: string]: DayMealPlan }

// Helper function to generate date range (today + next 6 days)
export function generateDateRange(startDate: Date = new Date()): string[] {
  const dates: string[] = []
  const currentDate = new Date(startDate)
  
  for (let i = 0; i < 7; i++) {
    // Use timezone-safe date conversion to avoid UTC conversion issues
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}` // YYYY-MM-DD format
    
    dates.push(dateString)
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
}

// Helper function to format date for display
export function formatDateForDisplay(dateString: string): { 
  relative: string; 
  full: string; 
  dayName: string;
  isToday: boolean;
  isTomorrow: boolean;
} {
  // Parse date string in a timezone-safe way
  // Split the date string and create date at local midnight
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0, 0) // Use noon to avoid timezone edge cases
  
  // Create today and tomorrow dates at midnight to avoid time comparison issues
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Convert the input date to a date at midnight for comparison
  const inputDate = new Date(year, month - 1, day, 0, 0, 0, 0)
  
  // Compare dates at midnight level
  const isToday = inputDate.getTime() === today.getTime()
  const isTomorrow = inputDate.getTime() === tomorrow.getTime()
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = dayNames[date.getDay()]
  
  let relative = ''
  if (isToday) {
    relative = 'Today'
  } else if (isTomorrow) {
    relative = 'Tomorrow'
  } else {
    relative = dayName
  }
  
  const full = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
  
  return { relative, full, dayName, isToday, isTomorrow }
}

// Helper function to format date to YYYY-MM-DD without timezone issues
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface MealSuggestion {
  title: string
  description: string
  ingredients: Array<{
    name: string
    amount: string
    unit: string
    notes?: string
  }>
}

export interface RecipeAnalysis {
  success: boolean
  category?: string
  details?: string
  error?: string
}

export async function generateMealSuggestions(
  category: string, 
  preferences?: string | null,
  isKidsMeal?: boolean
): Promise<MealSuggestion[]> {
  // If Supabase is not configured, return fallback suggestions
  if (!isSupabaseConfigured) {
    return getFallbackSuggestions(category, preferences, isKidsMeal);
  }

  try {
    // Get the current user's session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('No authenticated session, using fallback suggestions');
      return getFallbackSuggestions(category, preferences, isKidsMeal);
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meal-suggestions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          preferences,
          isKidsMeal
        })
      }
    );

    if (!response.ok) {
      console.warn(`Edge function error (${response.status}), using fallback suggestions`);
      return getFallbackSuggestions(category, preferences, isKidsMeal);
    }

    const data = await response.json();
    
    // If the Edge Function returns suggestions with ingredients, use them
    if (data.suggestions && Array.isArray(data.suggestions)) {
      // Check if suggestions already have ingredients
      if (data.suggestions[0] && data.suggestions[0].ingredients) {
        return data.suggestions;
      }
    }
    
    // If no ingredients in suggestions, generate them for each suggestion
    const suggestions = data.suggestions || getFallbackSuggestions(category, preferences, isKidsMeal);
    const suggestionsWithIngredients: MealSuggestion[] = [];
    
    for (const suggestion of suggestions) {
      try {
        // Generate ingredients for this suggestion
        const ingredientsResult = await generateIngredients({
          category,
          title: suggestion.title,
          details: suggestion.description,
          emoji: '🍽️',
          target: isKidsMeal ? 'kids' : 'main'
        });
        
        suggestionsWithIngredients.push({
          ...suggestion,
          ingredients: ingredientsResult.success ? ingredientsResult.ingredients : []
        });
      } catch (error) {
        console.error('Error generating ingredients for suggestion:', error);
        suggestionsWithIngredients.push({
          ...suggestion,
          ingredients: []
        });
      }
    }
    
    return suggestionsWithIngredients;
  } catch (error) {
    console.error('Error generating meal suggestions:', error);
    return getFallbackSuggestions(category, preferences, isKidsMeal);
  }
}

export async function generateIngredients(
  mealData: {
    category: string
    title?: string
    details?: string
    emoji: string
    target: 'main' | 'kids'
  }
): Promise<{
  success: boolean
  ingredients: Array<{
    name: string
    amount: string
    unit: string
    notes?: string
  }>
  error?: string
}> {
  // If Supabase is not configured, return fallback ingredients
  if (!isSupabaseConfigured) {
    return getFallbackIngredients(mealData);
  }

  try {
    // Get the current user's session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('No authenticated session, using fallback ingredients');
      return getFallbackIngredients(mealData);
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ingredients`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: mealData.category,
          title: mealData.title,
          details: mealData.details,
          emoji: mealData.emoji,
          target: mealData.target
        })
      }
    );

    if (!response.ok) {
      console.warn(`Edge function error (${response.status}), using fallback ingredients`);
      return getFallbackIngredients(mealData);
    }

    const data = await response.json();
    
    // The Edge Function now returns the ingredients array directly
    if (Array.isArray(data)) {
      return {
        success: true,
        ingredients: data
      };
    }
    
    // Fallback for old format
    return data.ingredients || getFallbackIngredients(mealData);
  } catch (error) {
    console.error('Error generating ingredients:', error);
    return getFallbackIngredients(mealData);
  }
}

function getFallbackIngredients(mealData: {
  category: string
  title?: string
  details?: string
  emoji: string
  target: 'main' | 'kids'
}): {
  success: boolean
  ingredients: Array<{
    name: string
    amount: string
    unit: string
    notes?: string
  }>
  error?: string
} {
  // Default serving sizes
  const servingSize = mealData.target === 'main' ? 4 : 2
  
  // Generate basic ingredients based on meal category
  const baseIngredients = getBaseIngredientsForCategory(mealData.category, servingSize)
  
  return {
    success: true,
    ingredients: baseIngredients
  }
}

function getBaseIngredientsForCategory(category: string, servingSize: number): Array<{
  name: string
  amount: string
  unit: string
  notes?: string
}> {
  const multiplier = servingSize / 4 // Base on 4 servings
  
  switch (category.toLowerCase()) {
    case 'pasta night':
      return [
        { name: 'Pasta', amount: String(Math.round(1 * multiplier)), unit: 'lb', notes: 'any shape' },
        { name: 'Olive oil', amount: String(Math.round(2 * multiplier)), unit: 'tbsp' },
        { name: 'Garlic', amount: String(Math.round(3 * multiplier)), unit: 'cloves', notes: 'minced' },
        { name: 'Parmesan cheese', amount: String(Math.round(0.5 * multiplier)), unit: 'cup', notes: 'grated' },
        { name: 'Salt', amount: '1', unit: 'tsp' },
        { name: 'Black pepper', amount: '1', unit: 'tsp' }
      ]
    case 'taco tuesday':
      return [
        { name: 'Ground beef', amount: String(Math.round(1 * multiplier)), unit: 'lb' },
        { name: 'Taco shells', amount: String(Math.round(8 * multiplier)), unit: 'count' },
        { name: 'Lettuce', amount: String(Math.round(0.5 * multiplier)), unit: 'head', notes: 'shredded' },
        { name: 'Tomatoes', amount: String(Math.round(2 * multiplier)), unit: 'count', notes: 'diced' },
        { name: 'Cheese', amount: String(Math.round(1 * multiplier)), unit: 'cup', notes: 'shredded' },
        { name: 'Sour cream', amount: String(Math.round(0.5 * multiplier)), unit: 'cup' }
      ]
    case 'pizza night':
      return [
        { name: 'Pizza dough', amount: String(Math.round(1 * multiplier)), unit: 'lb' },
        { name: 'Pizza sauce', amount: String(Math.round(1 * multiplier)), unit: 'cup' },
        { name: 'Mozzarella cheese', amount: String(Math.round(2 * multiplier)), unit: 'cup', notes: 'shredded' },
        { name: 'Pepperoni', amount: String(Math.round(0.5 * multiplier)), unit: 'cup', notes: 'sliced' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' },
        { name: 'Italian seasoning', amount: '1', unit: 'tsp' }
      ]
    case 'breakfast for dinner':
      return [
        { name: 'Eggs', amount: String(Math.round(8 * multiplier)), unit: 'count' },
        { name: 'Bacon', amount: String(Math.round(0.5 * multiplier)), unit: 'lb' },
        { name: 'Bread', amount: String(Math.round(8 * multiplier)), unit: 'slices', notes: 'for toast' },
        { name: 'Butter', amount: String(Math.round(2 * multiplier)), unit: 'tbsp' },
        { name: 'Milk', amount: String(Math.round(0.5 * multiplier)), unit: 'cup' },
        { name: 'Salt', amount: '1', unit: 'tsp' },
        { name: 'Black pepper', amount: '1', unit: 'tsp' }
      ]
    default:
      return [
        { name: 'Protein', amount: String(Math.round(1 * multiplier)), unit: 'lb', notes: 'chicken, beef, or fish' },
        { name: 'Vegetables', amount: String(Math.round(2 * multiplier)), unit: 'cups', notes: 'mixed vegetables' },
        { name: 'Starch', amount: String(Math.round(1 * multiplier)), unit: 'cup', notes: 'rice, potatoes, or pasta' },
        { name: 'Oil', amount: '2', unit: 'tbsp', notes: 'olive oil or cooking oil' },
        { name: 'Seasonings', amount: '1', unit: 'tsp', notes: 'salt, pepper, herbs' }
      ]
  }
}

export async function analyzeRecipe(
  url: string,
  existingCategory?: string,
  existingDetails?: string
): Promise<RecipeAnalysis> {
  // If Supabase is not configured, return empty analysis
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase not configured',
      category: '',
      details: ''
    };
  }

  try {
    // Get the current user's session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        error: 'No authenticated session',
        category: '',
        details: ''
      };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-recipe`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          existingCategory,
          existingDetails
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`,
        category: '',
        details: ''
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error analyzing recipe:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      category: '',
      details: ''
    };
  }
}

// Helper function for fallback suggestions
function getFallbackSuggestions(category: string, preferences?: string | null, isKidsMeal?: boolean): MealSuggestion[] {
  const enhancedSuggestions = [
    {
      title: `${category} Delight`,
      description: isKidsMeal 
        ? `Fun and tasty ${category.toLowerCase()} that kids will love to eat.`
        : `A delicious ${category.toLowerCase()} meal with fresh ingredients and bold flavors.`,
      ingredients: []
    },
    {
      title: `Homestyle ${category}`,
      description: isKidsMeal
        ? `Comforting ${category.toLowerCase()} that's familiar and easy for kids to enjoy.`
        : `A comforting ${category.toLowerCase()} dish with familiar flavors and simple preparation.`,
      ingredients: []
    },
    {
      title: `Quick ${category}`,
      description: isKidsMeal
        ? `Fast and kid-friendly ${category.toLowerCase()} perfect for busy families.`
        : `A quick ${category.toLowerCase()} meal that's satisfying and easy to prepare.`,
      ingredients: []
    }
  ];

  // Add preference-based customization if provided
  if (preferences) {
    enhancedSuggestions[0].description += ` Includes your preferences: ${preferences}.`;
    enhancedSuggestions[1].description += ` Customized to match: ${preferences}.`;
    enhancedSuggestions[2].description += ` Tailored for: ${preferences}.`;
  }

  return enhancedSuggestions;
}



export function useMealPlans() {
  const { user } = useAuth()
  
  // Initialize with date-based keys (today + next 6 days)
  const getInitialWeekPlan = (): WeekPlan => {
    const dates = generateDateRange()
    const initialPlan: WeekPlan = {}
    
    dates.forEach(date => {
      initialPlan[date] = { mainMeal: null, kidsMeal: null }
    })
    
    return initialPlan
  }
  
  const [weekPlan, setWeekPlan] = useState<WeekPlan>(getInitialWeekPlan())
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [ingredients, setIngredients] = useState<{ [key: string]: DayIngredients }>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Get current week start date (today)
  const getCurrentWeekStart = () => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    // Use timezone-safe date conversion to avoid UTC conversion issues
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const weekStart = `${year}-${month}-${day}`
    return weekStart
  }

  // Update week plan when start date changes
  const updateWeekPlanForDate = (newStartDate: Date) => {
    // Use the selected date as the start
    const selectedDate = new Date(newStartDate)
    selectedDate.setHours(0, 0, 0, 0)
    
    // Generate 7 consecutive dates starting from the selected date
    const newDates = generateDateRange(selectedDate)
    
    // Create a new plan with these dates
    const newPlan: WeekPlan = {}
    newDates.forEach(date => {
      newPlan[date] = { mainMeal: null, kidsMeal: null }
    })
    
    // Load meal data for these specific dates from the database
    loadMealPlanForDates(newDates)
    
    // Update the startDate to reflect the selected start
    setStartDate(selectedDate)
  }

  // Load meal plan for specific dates
  const loadMealPlanForDates = async (dates: string[]) => {
    if (!user || !isSupabaseConfigured) return

    setLoading(true)
    try {
      // Load all meals for the user and filter by the specified dates
      const { data, error } = await supabase
        .from('daily_meals')
        .select('date, main_meal, kids_meal')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading meals for dates:', error)
        return
      }

      if (data && data.length > 0) {
        // Filter meals for the specified dates
        const relevantMeals = data.filter((dayMeal: { date: string; main_meal: any; kids_meal: any }) => {
          return dates.includes(dayMeal.date)
        })
        
        // Create week plan with the specified dates
        const weekPlanData: WeekPlan = {}
        
        // Initialize with empty meals for all specified dates
        dates.forEach(date => {
          weekPlanData[date] = { mainMeal: null, kidsMeal: null }
        })
        
        // Populate with actual meal data
        relevantMeals.forEach((dayMeal: { date: string; main_meal: any; kids_meal: any }) => {
          const date = dayMeal.date
          weekPlanData[date] = {
            mainMeal: dayMeal.main_meal,
            kidsMeal: dayMeal.kids_meal
          }
        })
        
        setWeekPlan(weekPlanData)
      } else {
        // No meals found, set empty plan for the specified dates
        const emptyPlan: WeekPlan = {}
        dates.forEach(date => {
          emptyPlan[date] = { mainMeal: null, kidsMeal: null }
        })
        setWeekPlan(emptyPlan)
      }
    } catch (error) {
      console.error('Error loading meals for dates:', error)
    } finally {
      setLoading(false)
    }
  }

  // Simple function to add a meal to a specific date
  const addMealToDate = async (date: string, meal: any, target: 'main' | 'kids' = 'main') => {
    // Update the week plan directly
    const updatedPlan = {
      ...weekPlan,
      [date]: {
        ...weekPlan[date],
        [target === 'main' ? 'mainMeal' : 'kidsMeal']: meal
      }
    };
    
    setWeekPlan(updatedPlan);
    
    // Save just this day to database
    await saveDailyMeal(date, meal, target);
  }

  // Save a single day's meal to database
  const saveDailyMeal = async (date: string, meal: any, target: 'main' | 'kids') => {
    if (!user || !isSupabaseConfigured) {
      return
    }

    try {
      const upsertData = {
        user_id: user.id,
        date: date,
        [target === 'main' ? 'main_meal' : 'kids_meal']: meal
      };
      
      const { data, error } = await supabase
        .from('daily_meals')
        .upsert(upsertData, {
          onConflict: 'user_id,date'
        })

      if (error) {
        console.error('❌ DEBUG - Supabase error:', error)
        return
      }
    } catch (error) {
      console.error('❌ DEBUG - Exception in saveDailyMeal:', error)
    }
  }

  // Save meal plan to database (for backward compatibility)
  const saveMealPlan = async (plan: WeekPlan) => {
    if (!user || !isSupabaseConfigured) {
      return
    }

    setSaving(true)
    try {
      // Save each day individually to the new daily_meals table
      const savePromises = Object.entries(plan).map(([date, dayPlan]) => {
        return supabase
          .from('daily_meals')
          .upsert({
            user_id: user.id,
            date: date,
            main_meal: dayPlan.mainMeal,
            kids_meal: dayPlan.kidsMeal
          }, {
            onConflict: 'user_id,date'
          })
      })

      const results = await Promise.all(savePromises)
      const errors = results.filter(result => result.error)
      
      if (errors.length > 0) {
        console.error('Errors saving meal plan:', errors)
        return
      }
    } catch (error) {
      console.error('Error saving meal plan:', error)
    } finally {
      setSaving(false)
    }
  }

  // Load meal plan from database
  const loadMealPlan = async () => {
    if (!user || !isSupabaseConfigured) return

    setLoading(true)
    try {
      // Get today's date and generate 7 consecutive days
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekDates = generateDateRange(today)
      
      // Use the same logic as updateWeekPlanForDate
      await loadMealPlanForDates(weekDates)
      
      // Set startDate to today
      setStartDate(today)
    } catch (error) {
      console.error('Error loading meal plan:', error)
    } finally {
      setLoading(false)
    }
  }

  // Save ingredients for a specific day
  const saveIngredients = async (dayIngredients: DayIngredients) => {
    if (!user || !isSupabaseConfigured) {
      // If Supabase is not configured, just update local state
      setIngredients(prev => ({
        ...prev,
        [dayIngredients.day]: dayIngredients
      }))
      return
    }

    try {
      const { error } = await supabase
        .from('meal_ingredients')
        .upsert({
          user_id: user.id,
          day: dayIngredients.day,
          ingredients_data: dayIngredients,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,day'
        })

      if (error) {
        console.error('Error saving ingredients:', error)
        return
      }

      setIngredients(prev => ({
        ...prev,
        [dayIngredients.day]: dayIngredients
      }))
    } catch (error) {
      console.error('Error saving ingredients:', error)
    }
  }

  // Load ingredients from database
  const loadIngredients = async () => {
    if (!user || !isSupabaseConfigured) return

    try {
      const { data, error } = await supabase
        .from('meal_ingredients')
        .select('day, ingredients_data')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading ingredients:', error)
        return
      }

      if (data) {
        const ingredientsMap: { [key: string]: DayIngredients } = {}
        data.forEach((item: { day: string; ingredients_data: DayIngredients }) => {
          ingredientsMap[item.day] = item.ingredients_data
        })
        setIngredients(ingredientsMap)
      }
    } catch (error) {
      console.error('Error loading ingredients:', error)
    }
  }

  // Load meal plan when user changes
  useEffect(() => {
    if (user) {
      loadMealPlan()
    } else {
      // Reset to empty plan when user logs out
      setWeekPlan(getInitialWeekPlan())
    }
  }, [user])

  // Load ingredients when user changes
  useEffect(() => {
    if (user) {
      loadIngredients()
    } else {
      setIngredients({})
    }
  }, [user])

  return {
    weekPlan,
    setWeekPlan,
    loading,
    saving,
    startDate,
    updateWeekPlanForDate,
    ingredients,
    saveIngredients,
    loadIngredients,
    addMealToDate
  }
}