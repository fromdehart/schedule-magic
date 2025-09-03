import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ShoppingCart, Sparkles, Edit3, Plus, User, LogOut, FileText } from './lib/icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import { MealTypeSelectorModal } from './components/MealTypeSelectorModal';
import { MealPreferenceModal } from './components/MealPreferenceModal';
import { MealDetailsModal } from './components/MealDetailsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DatePicker } from './components/DatePicker';
import { IngredientsModal } from './components/IngredientsModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import { InventoryModal } from './components/InventoryModal';
import { SavedRecipesModal } from './components/SavedRecipesModal';
import { useMealPlans, Meal, MealTypePlaceholder, DayMealPlan, generateMealSuggestions, MealSuggestion, isMealPlaceholder, isRegularMeal, generateDateRange, formatDateForDisplay, generateIngredients } from './hooks/useMealPlans';
import menuMagicLogo from './assets/menuMagicLogo.jpg';

const sampleMeals: Meal[] = [
  {
    id: '1',
    title: 'Herb-Crusted Salmon with Quinoa',
    image: 'https://images.pexels.com/photos/3622643/pexels-photo-3622643.jpeg?auto=compress&cs=tinysrgb&w=800',
    hasKidsMeal: true,
    type: 'meal',
    kidsMeal: {
      title: 'Fish Sticks & Sweet Potato Fries',
      image: 'https://images.pexels.com/photos/4518844/pexels-photo-4518844.jpeg?auto=compress&cs=tinysrgb&w=600'
    }
  },
  {
    id: '2',
    title: 'Mediterranean Chicken Bowl',
    image: 'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=800',
    hasKidsMeal: true,
    type: 'meal',
    kidsMeal: {
      title: 'Chicken Nuggets & Rice',
      image: 'https://images.pexels.com/photos/4518844/pexels-photo-4518844.jpeg?auto=compress&cs=tinysrgb&w=600'
    }
  },
  {
    id: '3',
    title: 'Creamy Mushroom Risotto',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    type: 'meal'
  }
];

// Generate date range for the current week
const getCurrentWeekDates = () => generateDateRange();

function MealPlanner() {
  const { user, signOut } = useAuth();
  const { weekPlan, setWeekPlan, loading, saving, startDate, updateWeekPlanForDate, ingredients, saveIngredients, loadIngredients, addMealToDate } = useMealPlans();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [showMealPreferenceModal, setShowMealPreferenceModal] = useState(false);
  const [selectedDayForMealType, setSelectedDayForMealType] = useState<{ day: string; target: 'main' | 'kids' } | null>(null);
  const [showMealDetailsModal, setShowMealDetailsModal] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedDayForDetails, setSelectedDayForDetails] = useState<{ 
    day: string; 
    target: 'main' | 'kids'; 
    meal: MealTypePlaceholder;
    isNewMeal?: boolean;
    isRecipeOnly?: boolean;
    aiSuggestions?: MealSuggestion[];
    userPreferences?: string | null;
  } | null>(null);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    day: string;
    target: 'main' | 'kids';
    mealTitle?: string;
  } | null>(null);

  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [selectedDayForIngredients, setSelectedDayForIngredients] = useState<string | null>(null);
  const [isGeneratingIngredients, setIsGeneratingIngredients] = useState(false);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showSavedRecipesModal, setShowSavedRecipesModal] = useState(false);

  const handlePlanWeek = useCallback(() => {
    const newPlan: { [key: string]: DayMealPlan } = {};
    const weekDates = generateDateRange(startDate);
    weekDates.forEach((date, index) => {
      const mainMeal = sampleMeals[index % sampleMeals.length];
      newPlan[date] = {
        mainMeal,
        kidsMeal: mainMeal.hasKidsMeal && mainMeal.kidsMeal ? {
          id: `kids-${mainMeal.id}`,
          title: mainMeal.kidsMeal.title,
          image: mainMeal.kidsMeal.image,
          type: 'meal'
        } : null
      };
    });
    setWeekPlan(newPlan);
  }, [startDate]);

  const handleChooseMealType = (day: string, target: 'main' | 'kids') => {
    setSelectedDayForMealType({ day, target });
    setShowMealTypeModal(true);
  };

  const handleSelectMealType = (category: string, emoji: string) => {
    if (selectedDayForMealType) {
      // Store the meal type selection and open preference modal
      setSelectedDayForDetails({
        day: selectedDayForMealType.day,
        target: selectedDayForMealType.target,
        meal: {
          type: 'placeholder' as const,
          category,
          emoji
        },
        isNewMeal: true
      });
      
      // Close meal type modal and open preference modal
      setShowMealPreferenceModal(true);
    }
    
    setShowMealTypeModal(false);
    setSelectedDayForMealType(null);
  };

  const handleSaveMealPreferences = async (preferences: string | null) => {
    if (selectedDayForDetails) {
      if (preferences === null) {
        // Skip button was clicked - just add the meal category to the day
        const { day, target, meal } = selectedDayForDetails;
        
        // Add the meal to the week plan with just the category (no details)
        const newPlan = {
          ...weekPlan,
          [day]: {
            ...weekPlan[day],
            [target === 'main' ? 'mainMeal' : 'kidsMeal']: {
              type: 'placeholder' as const,
              category: meal.category,
              emoji: meal.emoji,
              details: '', // No details, just the category
              recipeUrl: undefined
            }
          }
        };
        
        setWeekPlan(newPlan);
        
        // Save to database
        await addMealToDate(day, {
          type: 'placeholder' as const,
          category: meal.category,
          emoji: meal.emoji,
          details: '',
          recipeUrl: undefined
        }, target);
        
        // Close all modals
        setShowMealPreferenceModal(false);
        setSelectedDayForDetails(null);
        return;
      }

      // User provided preferences - generate AI suggestions
      setIsGeneratingAI(true);
      
      try {
        // Generate AI suggestions using OpenAI
        const aiSuggestions = await generateMealSuggestions(
          selectedDayForDetails.meal.category, 
          preferences,
          selectedDayForDetails.target === 'kids'
        );
        
        // Update the selected day details with preferences and AI suggestions
        setSelectedDayForDetails({
          ...selectedDayForDetails,
          userPreferences: preferences,
          aiSuggestions
        });
        
        // Close preference modal and open details modal
        setShowMealPreferenceModal(false);
        setShowMealDetailsModal(true);
      } catch (error) {
        console.error('Error generating AI suggestions:', error);
        // Still close modal and show details, but without AI suggestions
        setSelectedDayForDetails({
          ...selectedDayForDetails,
          userPreferences: preferences,
          aiSuggestions: []
        });
        setShowMealPreferenceModal(false);
        setShowMealDetailsModal(true);
      } finally {
        setIsGeneratingAI(false);
      }
    }
  };

        const handleAddEditDetails = (day: string, target: 'main' | 'kids', meal: Meal | MealTypePlaceholder) => {
      // Convert Meal to MealTypePlaceholder if needed
      const mealForEditing = isMealPlaceholder(meal) ? meal : {
        type: 'placeholder' as const,
        category: meal.title,
        emoji: '🍽️',
        details: '',
        recipeUrl: meal.recipeUrl
      };
      
      setSelectedDayForDetails({
        day,
        target,
        meal: mealForEditing,
        isNewMeal: false 
      });
      setShowMealDetailsModal(true);
    };

  const handleAddRecipe = (day: string, target: 'main' | 'kids') => {
    // Create a basic meal placeholder
    const mealData = {
      type: 'placeholder' as const,
      category: 'Quick Recipe',
      emoji: '🍽️'
    };

    // Add the meal to the week plan
    const newPlan = {
      ...weekPlan,
      [day]: {
        ...weekPlan[day],
        [target === 'main' ? 'mainMeal' : 'kidsMeal']: mealData
      }
    };
    setWeekPlan(newPlan);

    // Open the details modal immediately for better UX
    setSelectedDayForDetails({
      day,
      target,
      meal: mealData,
      isNewMeal: true,
      isRecipeOnly: true
    });
    setShowMealDetailsModal(true);

    // Generate ingredients in the background (non-blocking)
    generateIngredientsInBackground(day, target);
  };

  // Background function to generate ingredients without blocking UI
  const generateIngredientsInBackground = async (day: string, target: 'main' | 'kids') => {
    try {
      const result = await generateIngredients({
        category: 'Quick Recipe',
        title: 'Quick Recipe',
        details: '',
        emoji: '🍽️',
        target: target
      });

      if (result.success) {
        // Create or update ingredients for this day
        const existingDayIngredients = ingredients[day] || {
          day: day,
          mainMeal: { items: [], servingSize: 4 },
          kidsMeal: { items: [], servingSize: 2 }
        };

        const updatedDayIngredients = {
          ...existingDayIngredients,
          [target === 'main' ? 'mainMeal' : 'kidsMeal']: {
            items: result.ingredients.map(ing => ({
              id: crypto.randomUUID(),
              ...ing
            })),
            servingSize: target === 'main' ? 4 : 2
          }
        };

        // Save the generated ingredients
        await saveIngredients(updatedDayIngredients);
        
        // Refresh ingredients state
        await loadIngredients();
      }
    } catch (error) {
      console.error('Error auto-generating ingredients for recipe meal:', error);
    }
  };

  const handleSaveMealDetails = async (details: string, recipeUrl?: string, category?: string, ingredients?: Array<{name: string, amount: string, unit: string, notes?: string}>) => {
    if (selectedDayForDetails) {
      const { day, target } = selectedDayForDetails;
      
      let updatedMeal: MealTypePlaceholder;
      
      if (selectedDayForDetails.isNewMeal) {
        // For new meals, create the meal from the modal data, using AI-generated category if available
        updatedMeal = {
          type: 'placeholder' as const,
          category: category || selectedDayForDetails.meal.category,
          emoji: selectedDayForDetails.meal.emoji,
          details: details || undefined,
          recipeUrl: recipeUrl || undefined
        };
      } else {
        // For existing meals, update the details and category (if provided)
        const currentMeal = weekPlan[day][target === 'main' ? 'mainMeal' : 'kidsMeal'] as MealTypePlaceholder;
        updatedMeal = {
          ...currentMeal,
          category: category || currentMeal.category,
          details: details || undefined,
          recipeUrl: recipeUrl || undefined
        };
      }
      
      const newPlan = {
        ...weekPlan,
        [day]: {
          ...weekPlan[day],
          [target === 'main' ? 'mainMeal' : 'kidsMeal']: updatedMeal
        }
      };
      setWeekPlan(newPlan);

      // Save the meal to the database using the new day-based storage
      
      await addMealToDate(day, updatedMeal, target);

      // Handle ingredients - use provided ingredients from suggestion or generate new ones
      
      try {
        let ingredientsToSave: Array<{name: string, amount: string, unit: string, notes?: string}> = [];
        
        if (ingredients && ingredients.length > 0) {
          // Use ingredients from the meal suggestion
          ingredientsToSave = ingredients;
        } else {
          // Generate ingredients for this meal
          const mealData = {
            category: updatedMeal.category,
            title: updatedMeal.category,
            details: updatedMeal.details || '',
            emoji: updatedMeal.emoji,
            target: target
          };

          const result = await generateIngredients(mealData);
          if (result.success) {
            ingredientsToSave = result.ingredients;
          }
        }
        
        if (ingredientsToSave.length > 0) {
          // Create or update ingredients for this day
          const existingDayIngredients = ingredients[day] || {
            day: day,
            mainMeal: { items: [], servingSize: 4 },
            kidsMeal: { items: [], servingSize: 2 }
          };

          const updatedDayIngredients = {
            ...existingDayIngredients,
            [target === 'main' ? 'mainMeal' : 'kidsMeal']: {
              items: ingredientsToSave.map(ing => ({
                id: crypto.randomUUID(),
                ...ing
              })),
              servingSize: target === 'main' ? 4 : 2
            }
          };

          // Save the ingredients
          await saveIngredients(updatedDayIngredients);
          
          // Refresh ingredients state
          await loadIngredients();
        }
      } catch (error) {
        console.error('Error handling ingredients:', error);
      }
    }
    setShowMealDetailsModal(false);
    setSelectedDayForDetails(null);
  };

  const handleAddRecipeToDay = (recipe: any, date: string) => {
    // Create a meal placeholder from the saved recipe
    const mealData = {
      type: 'placeholder' as const,
      category: recipe.title,
      emoji: '🍽️',
      details: recipe.description || '',
      recipeUrl: recipe.url
    };

    // Add the meal to the week plan
    const newPlan = {
      ...weekPlan,
      [date]: {
        ...weekPlan[date],
        mainMeal: mealData
      }
    };
    setWeekPlan(newPlan);

    // Optionally open the details modal for final customization
    // Comment out these lines if you want to skip the modal entirely
    /*
    setSelectedDayForDetails({
      day: date,
      target: 'main',
      meal: mealData,
      isNewMeal: true,
      isRecipeOnly: true
    });
    setShowMealDetailsModal(true);
    */

    // Generate ingredients in the background (non-blocking)
    generateIngredientsInBackground(date, 'main');
  };

  const handleAddMealFromInventory = async (meal: any, date: string) => {

    
    // Convert the AI-generated meal to a meal placeholder format
    const mealPlaceholder: MealTypePlaceholder = {
      type: 'placeholder',
      category: meal.title,
      emoji: '🍽️',
      details: meal.description,
      recipeUrl: undefined
    };


    
    // Use the hook's addMealToDate function to avoid triggering week plan sync
    await addMealToDate(date, mealPlaceholder, 'main');
    
    // Save the ingredients from the inventory meal
    if (meal.ingredients && meal.ingredients.length > 0) {
      try {
        // Create or update ingredients for this day
        const existingDayIngredients = ingredients[date] || {
          day: date,
          mainMeal: { items: [], servingSize: 4 },
          kidsMeal: { items: [], servingSize: 2 }
        };

        const updatedDayIngredients = {
          ...existingDayIngredients,
          mainMeal: {
            items: meal.ingredients.map((ing: any) => ({
              id: ing.id || crypto.randomUUID(), // Use existing ID or generate new one
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
              notes: ing.notes
            })),
            servingSize: 4
          }
        };

        // Save the ingredients
        await saveIngredients(updatedDayIngredients);
        
        // Refresh ingredients state
        await loadIngredients();
        

      } catch (error) {
        console.error('Error saving inventory meal ingredients:', error);
      }
    }
    

  };

  const handleClearMeal = async (day: string, target: 'main' | 'kids') => {
    // Clear the meal from the week plan
    const newPlan = {
      ...weekPlan,
      [day]: {
        ...weekPlan[day],
        [target === 'main' ? 'mainMeal' : 'kidsMeal']: null
      }
    };
    setWeekPlan(newPlan);

    // Save the cleared meal state to the database
    await addMealToDate(day, null, target);

    // Also clear the ingredients for this meal
    if (ingredients[day]) {
      const updatedIngredients = {
        ...ingredients[day],
        [target === 'main' ? 'mainMeal' : 'kidsMeal']: {
          items: [],
          servingSize: target === 'main' ? 4 : 2
        }
      };
      
      // Save the updated ingredients (this will clear the specific meal's ingredients)
      await saveIngredients(updatedIngredients);
    }
  };

  const handleShowClearConfirmation = (day: string, target: 'main' | 'kids', mealTitle?: string) => {
    setConfirmationData({ day, target, mealTitle });
    setShowConfirmationModal(true);
  };

  const handleConfirmClearMeal = () => {
    if (confirmationData) {
      handleClearMeal(confirmationData.day, confirmationData.target);
      setConfirmationData(null);
    }
  };



  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDateChange = (newDate: Date) => {
    updateWeekPlanForDate(newDate);
  };

  const handleOpenIngredients = (day: string) => {
    setSelectedDayForIngredients(day);
    setShowIngredientsModal(true);
  };

  const handleGenerateIngredients = async () => {
    if (!selectedDayForIngredients) {
      return;
    }

    setIsGeneratingIngredients(true);
    try {
      const dayPlan = weekPlan[selectedDayForIngredients];
      const ingredientsToGenerate: Array<{ mealData: any; target: 'main' | 'kids' }> = [];

      // Collect meal data for both main and kids meals
      if (dayPlan?.mainMeal) {
        const mealData = isMealPlaceholder(dayPlan.mainMeal) 
          ? {
              category: dayPlan.mainMeal.category,
              emoji: dayPlan.mainMeal.emoji,
              details: dayPlan.mainMeal.details,
              target: 'main' as const
            }
          : {
              category: dayPlan.mainMeal.title,
              emoji: '🍽️',
              details: '',
              target: 'main' as const
            };
        ingredientsToGenerate.push({ mealData, target: 'main' });
      }

      if (dayPlan?.kidsMeal) {
        const mealData = isMealPlaceholder(dayPlan.kidsMeal)
          ? {
              category: dayPlan.kidsMeal.category,
              emoji: dayPlan.kidsMeal.emoji,
              details: dayPlan.kidsMeal.details,
              target: 'kids' as const
            }
          : {
              category: dayPlan.kidsMeal.title,
              emoji: '🍽️',
              details: '',
              target: 'kids' as const
            };
        ingredientsToGenerate.push({ mealData, target: 'kids' });
      }

      // Generate ingredients for each meal
      const newIngredients: {
        day: string;
        mainMeal: { items: Array<{ id: string; name: string; amount: string; unit: string; notes?: string }>; servingSize: number };
        kidsMeal: { items: Array<{ id: string; name: string; amount: string; unit: string; notes?: string }>; servingSize: number };
      } = {
        day: selectedDayForIngredients,
        mainMeal: {
          items: [],
          servingSize: 4
        },
        kidsMeal: {
          items: [],
          servingSize: 2
        }
      };

      for (const { mealData, target } of ingredientsToGenerate) {
        const result = await generateIngredients(mealData);
        if (result.success) {
          const items = result.ingredients.map(ing => ({
            id: crypto.randomUUID(),
            ...ing
          }));
          
          if (target === 'main') {
            newIngredients.mainMeal.items = items;
          } else {
            newIngredients.kidsMeal.items = items;
          }
        } else {
          // Failed to generate ingredients
        }
      }

      // Save the generated ingredients
      await saveIngredients(newIngredients);
      
      // Refresh the ingredients state so the modal shows the new data
      await loadIngredients();
      
      // Don't close the modal - let user see the generated ingredients
      // setShowIngredientsModal(false);
      // setSelectedDayForIngredients(null);
      
    } catch (error) {
      console.error('Error generating ingredients:', error);
    } finally {
      setIsGeneratingIngredients(false);
    }
  };

  const handleSaveIngredients = (ingredients: any) => {
    saveIngredients(ingredients);
  };

  // Load ingredients when user is authenticated
  useEffect(() => {
    if (user && loadIngredients) {
      loadIngredients();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={menuMagicLogo} 
                alt="MenuMagic Logo" 
                className="h-16 w-auto sm:h-24"
              />
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="hidden sm:inline text-sm font-medium text-gray-900">
                      {user.user_metadata?.full_name || user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </button>
              )}
             
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-4">
        {!user && isSupabaseConfigured && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">Sign in to save your meal plans</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Create an account to automatically save your weekly meal plans and access them from any device.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="font-medium text-amber-900">Demo Mode</h3>
                <p className="text-amber-700 text-sm mt-1">
                  You're using MenuMagic in demo mode. Meal plans won't be saved between sessions. To enable full features, connect to Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Date Navigation */}
        {user && (
          <div className="mt-2 mb-4 flex justify-end items-center gap-4">
            <button
              onClick={() => setShowInventoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              🍽️ <span className="hidden sm:inline">My Pantry & Fridge</span>
            </button>
            <button
              onClick={() => setShowSavedRecipesModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              📖 <span className="hidden sm:inline">Saved Recipes</span>
            </button>
            <button
              onClick={() => setShowShoppingListModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              🛒 <span className="hidden sm:inline">View Shopping List</span>
            </button>
            <DatePicker
              selectedDate={startDate}
              onDateChange={handleDateChange}
            />
          </div>
        )}

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.keys(weekPlan).sort().map((date) => {
            const dayPlan = weekPlan[date];
            const mainMeal = dayPlan?.mainMeal;
            const kidsMeal = dayPlan?.kidsMeal;
            

            
            return (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                {/* Day Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-medium text-gray-900">
                      {(() => {
                        const dateInfo = formatDateForDisplay(date);
                        return (
                          <div>
                            <div className="text-lg font-medium text-gray-700">{dateInfo.relative}</div>
                            <div className="text-sm text-gray-500">{dateInfo.full}</div>
                          </div>
                        );
                      })()}
                    </h3>
                    <button
                      onClick={() => handleOpenIngredients(date)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="View ingredients"
                    >
                      🥕 Ingredients
                    </button>
                  </div>
                  
                  {/* Adult Meal Section */}
                  <div className="mb-6">
                    {isMealPlaceholder(mainMeal) ? (
                      <div className="space-y-4">
                        <div className="relative w-full h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex flex-col items-center justify-center border-2 border-emerald-200">
                          {/* Clear Button in Upper Right Corner */}
                          <button
                            onClick={() => handleShowClearConfirmation(date, 'main', 
                              mainMeal.details && mainMeal.details.includes(' - ') 
                                ? mainMeal.details.split(' - ')[0] 
                                : mainMeal.category
                            )}
                            className="absolute top-3 right-3 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-3 py-2 text-red-600 hover:text-red-700 font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md z-10"
                            title="Clear meal"
                          >
                            ✕
                          </button>
                          {/* Recipe Link in Upper Left Corner */}
                          {mainMeal.recipeUrl && (
                            <a
                              href={mainMeal.recipeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-3 left-3 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-3 py-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              🔗 Recipe
                            </a>
                          )}
                          <div className="text-center">
                            <div className="text-4xl mb-3">{mainMeal.emoji}</div>
                            <p className="text-lg font-medium text-emerald-800 break-words">
                              {mainMeal.details && mainMeal.details.includes(' - ') 
                                ? mainMeal.details.split(' - ')[0] 
                                : mainMeal.category
                              }
                            </p>
                            <p className="text-sm text-emerald-600 mt-1 px-4 break-words line-clamp-2 sm:line-clamp-none">
                              {mainMeal.details && mainMeal.details.includes(' - ') 
                                ? mainMeal.details.split(' - ')[1] 
                                : (mainMeal.details || 'Click "Add Details" below')
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                                                    <button
                            onClick={() => handleChooseMealType(date, 'main')}
                            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Change Category
                          </button>
                          <button 
                            onClick={() => handleAddEditDetails(date, 'main', mainMeal)}
                            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            {mainMeal.details ? 'Edit Details' : 'Add Details'}
                          </button>
                        </div>
                      </div>
                    ) : isRegularMeal(mainMeal) ? (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-700 leading-relaxed">
                          {mainMeal.title}
                        </h4>
                        <button 
                          onClick={() => handleAddEditDetails(date, 'main', mainMeal)}
                          className="relative group w-full block"
                        >
                          <img
                            src={mainMeal.image}
                            alt={mainMeal.title}
                            className="w-full h-48 object-cover rounded-xl"
                          />
                          {/* Clear Button in Upper Right Corner */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowClearConfirmation(date, 'main', mainMeal.title);
                            }}
                            className="absolute top-3 right-3 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-3 py-2 text-red-600 hover:text-red-700 font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md z-10"
                            title="Clear meal"
                          >
                            ✕
                          </button>
                          {/* Recipe Link in Upper Left Corner */}
                          {mainMeal.recipeUrl && (
                            <a
                              href={mainMeal.recipeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-3 left-3 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-3 py-2 text-gray-700 hover:text-gray-800 font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              🔗 Recipe
                            </a>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-xl flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white bg-opacity-90 rounded-lg px-3 py-2">
                              <p className="text-sm font-medium text-gray-700">Click to edit</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button 
                          onClick={() => handleChooseMealType(date, 'main')}
                          className="w-full h-48 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200 group"
                        >
                          <div className="text-center text-gray-500 group-hover:text-gray-600">
                            <Plus className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-medium">Choose Meal</p>
                            <p className="text-xs text-gray-400 mt-1">Click to start planning</p>
                          </div>
                        </button>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleAddRecipe(date, 'main')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-700 font-medium text-sm transition-colors"
                          >
                            🔗 Add Recipe
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Kids Meal Section */}
                  <div className="border-t border-gray-100 pt-6">
                    {isMealPlaceholder(kidsMeal) ? (
                      <div className="space-y-4">
                        <div className="relative w-full h-32 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex flex-col items-center justify-center border-2 border-purple-200">
                          {/* Clear Button in Upper Right Corner */}
                          <button
                            onClick={() => handleShowClearConfirmation(date, 'kids', 
                              kidsMeal.details && kidsMeal.details.includes(' - ') 
                                ? kidsMeal.details.split(' - ')[0] 
                                : kidsMeal.category
                            )}
                            className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-2 py-1 text-red-600 hover:text-red-700 font-medium text-xs transition-all duration-200 shadow-sm hover:shadow-md z-10"
                            title="Clear kids meal"
                          >
                            ✕
                          </button>
                          {/* Recipe Link in Upper Left Corner */}
                          {kidsMeal.recipeUrl && (
                            <a
                              href={kidsMeal.recipeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-2 py-1 text-purple-600 hover:text-purple-700 font-medium text-xs transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              🔗 Recipe
                            </a>
                          )}
                          <div className="text-center">
                            <div className="text-2xl mb-2">{kidsMeal.emoji}</div>
                            <p className="text-sm font-medium text-purple-800">
                              {kidsMeal.details && kidsMeal.details.includes(' - ') 
                                ? kidsMeal.details.split(' - ')[0] 
                                : kidsMeal.category
                              }
                            </p>
                            <p className="text-xs text-purple-600 mt-1 px-3">
                              {kidsMeal.details && kidsMeal.details.includes(' - ') 
                                ? kidsMeal.details.split(' - ')[1] 
                                : (kidsMeal.details || 'Click "Add Details" below')
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleChooseMealType(date, 'kids')}
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Change Category
                          </button>
                          <button 
                            onClick={() => handleAddEditDetails(date, 'kids', kidsMeal)}
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            {kidsMeal.details ? 'Edit Details' : 'Add Details'}
                          </button>
                        </div>
                      </div>
                    ) : isRegularMeal(kidsMeal) ? (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-purple-700 leading-relaxed">
                          Kids: {kidsMeal.title}
                        </h4>
                        <button 
                          onClick={() => handleAddEditDetails(date, 'kids', kidsMeal)}
                          className="relative group w-full block"
                        >
                          <img
                            src={kidsMeal.image}
                            alt={kidsMeal.title}
                            className="w-full h-32 object-cover rounded-lg border-2 border-purple-100"
                          />
                          {/* Clear Button in Upper Right Corner */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowClearConfirmation(date, 'kids', kidsMeal.title);
                            }}
                            className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-2 py-2 text-red-600 hover:text-red-700 font-medium text-xs transition-all duration-200 shadow-sm hover:shadow-md z-10"
                            title="Clear kids meal"
                          >
                            ✕
                          </button>
                          {/* Recipe Link in Upper Left Corner */}
                          {kidsMeal.recipeUrl && (
                            <a
                              href={kidsMeal.recipeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-2 py-1 text-purple-700 hover:text-purple-800 font-medium text-xs transition-all duration-200 shadow-sm hover:shadow-md z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              🔗 Recipe
                            </a>
                          )}
                          <div className="absolute inset-0 bg-purple-500 bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white bg-opacity-90 rounded-lg px-3 py-2">
                              <p className="text-sm font-medium text-purple-700">Click to edit</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button 
                          onClick={() => handleChooseMealType(date, 'kids')}
                          className="w-full h-32 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center justify-center border-2 border-dashed border-purple-300 hover:border-purple-400 transition-all duration-200 group"
                        >
                          <div className="text-center text-purple-400 group-hover:text-purple-500">
                            <Plus className="w-6 h-6 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                            <p className="text-xs font-medium">Choose Kids Meal</p>
                            <p className="text-xs text-purple-300 mt-1">Click to add</p>
                          </div>
                        </button>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleAddRecipe(date, 'kids')}
                            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
                          >
                            🔗 Add Recipe
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly Summary */}
        <div className="mt-16 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-2xl font-light text-gray-900 mb-6">This Week's Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-light text-emerald-600 mb-2">
                {Object.values(weekPlan).filter(dayPlan => dayPlan.mainMeal !== null).length}
              </div>
              <p className="text-gray-600 text-sm">Meals planned</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light text-purple-600 mb-2">
                {Object.values(weekPlan).filter(dayPlan => dayPlan.kidsMeal !== null).length}
              </div>
              <p className="text-gray-600 text-sm">Kids meals</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light text-blue-600 mb-2">
                {7 - Object.values(weekPlan).filter(dayPlan => dayPlan.mainMeal !== null).length}
              </div>
              <p className="text-gray-600 text-sm">Days to plan</p>
            </div>
          </div>
        </div>
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <MealTypeSelectorModal 
        isOpen={showMealTypeModal} 
        onClose={() => {
          setShowMealTypeModal(false);
          setSelectedDayForMealType(null);
        }} 
        onSelectMealType={handleSelectMealType}
      />
      <MealPreferenceModal 
        isOpen={showMealPreferenceModal}
        onClose={() => {
          setShowMealPreferenceModal(false);
          setSelectedDayForDetails(null);
        }}
        onSavePreferences={handleSaveMealPreferences}
        mealCategory={selectedDayForDetails?.meal.category || ''}
        mealEmoji={selectedDayForDetails?.meal.emoji || ''}
        isLoading={isGeneratingAI}
      />
      <MealDetailsModal 
        isOpen={showMealDetailsModal}
        onClose={() => {
          setShowMealDetailsModal(false);
          setSelectedDayForDetails(null);
        }}
        onSave={handleSaveMealDetails}
        initialDetails={selectedDayForDetails?.meal.details || ''}
        initialRecipeUrl={selectedDayForDetails?.meal.recipeUrl || ''}
        mealCategory={selectedDayForDetails?.meal.category || ''}
        mealEmoji={selectedDayForDetails?.meal.emoji || ''}
        isNewMeal={selectedDayForDetails?.isNewMeal}
        isRecipeOnly={selectedDayForDetails?.isRecipeOnly}
        aiSuggestions={selectedDayForDetails?.aiSuggestions}
        userPreferences={selectedDayForDetails?.userPreferences}
        onUpdateCategory={(category) => {
          if (selectedDayForDetails) {
            setSelectedDayForDetails({
              ...selectedDayForDetails,
              meal: {
                ...selectedDayForDetails.meal,
                category
              }
            })
          }
        }}
      />
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => {
          setShowConfirmationModal(false);
          setConfirmationData(null);
        }}
        onConfirm={handleConfirmClearMeal}
        title="Clear Meal"
        message={`Are you sure you want to clear the ${confirmationData?.target === 'kids' ? 'kids meal' : 'main meal'}${confirmationData?.mealTitle ? ` "${confirmationData.mealTitle}"` : ''} for ${confirmationData?.day}? This action cannot be undone.`}
        confirmText="Clear Meal"
        cancelText="Cancel"
        type="danger"
      />
      <IngredientsModal
        isOpen={showIngredientsModal}
        onClose={() => {
          setShowIngredientsModal(false);
          setSelectedDayForIngredients(null);
        }}
        dayIngredients={ingredients[selectedDayForIngredients || ''] || null} // Get ingredients from state
        onSave={handleSaveIngredients}
        onGenerate={handleGenerateIngredients}
        isGenerating={isGeneratingIngredients}
        dayDisplayName={selectedDayForIngredients ? formatDateForDisplay(selectedDayForIngredients).relative : ''}
      />
      <ShoppingListModal
        isOpen={showShoppingListModal}
        onClose={() => setShowShoppingListModal(false)}
        ingredients={ingredients}
        currentWeekDates={generateDateRange(startDate)}
      />
      <InventoryModal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        onAddMealToDate={handleAddMealFromInventory}
      />
      <SavedRecipesModal
        isOpen={showSavedRecipesModal}
        onClose={() => setShowSavedRecipesModal(false)}
        onAddRecipeToDay={handleAddRecipeToDay}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MealPlanner />
    </AuthProvider>
  );
}

export default App;