import React, { useState, useEffect } from 'react'
import { X, FileText, Save, Check, Plus, Loader2 } from '../lib/icons'
import { MealSuggestion, analyzeRecipe } from '../hooks/useMealPlans'

interface MealDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (details: string, recipeUrl?: string, category?: string, ingredients?: Array<{name: string, amount: string, unit: string, notes?: string}>) => void
  initialDetails?: string
  initialRecipeUrl?: string
  mealCategory: string
  mealEmoji: string
  isNewMeal?: boolean
  isRecipeOnly?: boolean
  aiSuggestions?: MealSuggestion[]
  userPreferences?: string | null
  onUpdateCategory?: (category: string) => void
}

export function MealDetailsModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialDetails = '', 
  initialRecipeUrl = '',
  mealCategory, 
  mealEmoji,
  isNewMeal = false,
  isRecipeOnly = false,
  aiSuggestions = [],
  userPreferences,
  onUpdateCategory
}: MealDetailsModalProps) {
  const [details, setDetails] = useState(initialDetails)
  const [recipeUrl, setRecipeUrl] = useState(initialRecipeUrl)
  const [showCustomDetails, setShowCustomDetails] = useState(false)
  const [aiSuggestionsCollapsed, setAiSuggestionsCollapsed] = useState(false)
  const [isAnalyzingRecipe, setIsAnalyzingRecipe] = useState(false)

  useEffect(() => {
    // Only set initial details if it's not a new meal
    if (!isNewMeal) {
      setDetails(initialDetails)
      setRecipeUrl(initialRecipeUrl)
    } else {
      setDetails('')
      setRecipeUrl('')
    }
    // Reset custom details toggle for new meals
    if (isNewMeal) {
      setShowCustomDetails(false)
      setAiSuggestionsCollapsed(false)
    }
  }, [initialDetails, initialRecipeUrl, isNewMeal])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let finalDetails = details.trim()
    
    let finalCategory = mealCategory
    
    // Always analyze recipe if there's a URL - this will update both category and description
    // Works for both new meals and when editing existing meals with a new recipe URL
    if (recipeUrl.trim() && (isNewMeal || recipeUrl.trim() !== initialRecipeUrl)) {
      setIsAnalyzingRecipe(true)
      
      try {
        const analysis = await analyzeRecipe(recipeUrl.trim(), mealCategory, details)
        
        if (analysis.success && (analysis.category || analysis.details)) {
          // Auto-fill fields with AI-generated content
          if (analysis.category && onUpdateCategory) {
            onUpdateCategory(analysis.category)
            finalCategory = analysis.category // Use the AI-generated category for saving
          }
          if (analysis.details) {
            setDetails(analysis.details)
            finalDetails = analysis.details // Use the AI-generated details for saving
          }
        }
      } catch (error) {
        console.error('❌ Recipe analysis failed:', error)
        // Continue with save even if analysis fails
      } finally {
        setIsAnalyzingRecipe(false)
      }
    }
    
    // Save the meal details, recipe URL, and category (using the final values which may include AI-generated content)
    onSave(finalDetails, recipeUrl.trim() || undefined, finalCategory)
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e)
    }
  }

  const handleRecipeUrlChange = (url: string) => {
    setRecipeUrl(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{mealEmoji}</span>
            <div>
              <h2 className="text-xl font-medium text-gray-900">
                {mealCategory}
              </h2>
              <p className="text-sm text-gray-500">
                {isRecipeOnly ? 'Add a recipe link for quick access' : 
                 isNewMeal ? 'Choose a suggestion or add your own details' : 'Edit meal details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* AI Suggestions */}
          {!isRecipeOnly && isNewMeal && aiSuggestions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  AI Suggestions
                </label>
                <button
                  type="button"
                  onClick={() => setAiSuggestionsCollapsed(!aiSuggestionsCollapsed)}
                  className="flex items-center justify-center w-6 h-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                >
                  {aiSuggestionsCollapsed ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-3 h-0.5 bg-emerald-600 rounded-full" />
                    </div>
                  )}
                </button>
              </div>
              
              {!aiSuggestionsCollapsed && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  {aiSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        // Auto-save the AI suggestion with ingredients and close modal
                        onSave(`${suggestion.title} - ${suggestion.description}`, undefined, undefined, suggestion.ingredients)
                        onClose()
                      }}
                      className="w-full text-left p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 group-hover:bg-emerald-500 transition-colors" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 group-hover:text-emerald-900 transition-colors text-sm mb-1">
                            {suggestion.title}
                          </p>
                          <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">
                            {suggestion.description}
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* Show "Write Your Own" button when there are AI suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomDetails(!showCustomDetails)
                      // Auto-collapse AI suggestions when showing custom details
                      if (!showCustomDetails) {
                        setAiSuggestionsCollapsed(true)
                      }
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ${
                      showCustomDetails 
                        ? 'border-emerald-200 bg-emerald-50' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full transition-colors ${
                          showCustomDetails ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                        <div className="text-left">
                          <p className="font-medium text-gray-900 text-sm">
                            {showCustomDetails ? 'Customizing Your Meal' : 'Write Your Own'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {showCustomDetails 
                              ? 'Add your own meal description below' 
                              : 'Click to write your own meal details instead of using AI suggestions'
                            }
                          </p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 transition-transform ${
                        showCustomDetails ? 'rotate-90' : ''
                      }`}>
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Custom Details Field - Only show for existing meals or when toggle is active, but not for recipe-only */}
          {!isRecipeOnly && (!isNewMeal || showCustomDetails) && (
            <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {isNewMeal ? 'Custom Details' : 'Meal Details'}
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                  placeholder={isNewMeal 
                    ? "Describe your meal..." 
                    : "Add specific details about this meal..."
                  }
                  rows={4}
                  autoFocus={!isNewMeal || showCustomDetails}
                />
              </div>
              
            </div>
          )}

          {/* Recipe URL Field - Show for existing meals, custom details, recipe-only mode, or when AI suggestions are collapsed */}
          {(!isNewMeal || showCustomDetails || isRecipeOnly || aiSuggestionsCollapsed) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Recipe Link (Optional)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400">
                  🔗
                </div>
                <input
                  type="url"
                  value={recipeUrl}
                  onChange={(e) => handleRecipeUrlChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="https://example.com/recipe..."
                />
                {isAnalyzingRecipe && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  </div>
                )}
              </div>
              
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                onSave('')
                onClose()
              }}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              {isRecipeOnly ? 'Cancel' : isNewMeal ? 'Skip Details' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isAnalyzingRecipe}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzingRecipe ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Recipe...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isRecipeOnly ? 'Save Recipe' : 'Save Details'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}