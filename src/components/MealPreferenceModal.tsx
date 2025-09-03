import React, { useState, useEffect } from 'react'
import { X, Sparkles, ArrowRight } from '../lib/icons'

interface MealPreferenceModalProps {
  isOpen: boolean
  onClose: () => void
  onSavePreferences: (preferences: string | null) => void
  mealCategory: string
  mealEmoji: string
  isLoading?: boolean
}

export function MealPreferenceModal({ 
  isOpen, 
  onClose, 
  onSavePreferences, 
  mealCategory, 
  mealEmoji,
  isLoading = false
}: MealPreferenceModalProps) {
  const [preferences, setPreferences] = useState('')

  // Clear preferences when modal opens for a new day
  useEffect(() => {
    if (isOpen) {
      setPreferences('')
    }
  }, [isOpen, mealCategory])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSavePreferences(preferences.trim() || null)
  }

  const handleSkip = () => {
    onSavePreferences(null)
  }

  const getPlaceholderText = (category: string): string => {
    const placeholders: { [key: string]: string } = {
      'Burgers': 'e.g., I prefer turkey burgers, love avocado and bacon, want something healthier than usual',
      'Pasta': 'e.g., I like creamy sauces, prefer chicken over beef, want something the kids will eat',
      'Chicken': 'e.g., I prefer grilled over fried, like Asian flavors, want something quick for weeknight',
      'Tacos': 'e.g., I love fish tacos, prefer corn tortillas, want something with fresh salsa',
      'Pizza': 'e.g., I like thin crust, prefer veggie toppings, want something homemade',
      'Chinese': 'e.g., I love sweet and sour, prefer chicken dishes, want something not too spicy',
      'Mexican': 'e.g., I like authentic flavors, prefer beef over chicken, want something with fresh cilantro',
      'BBQ': 'e.g., I prefer ribs over pulled pork, like tangy sauce, want classic sides',
      'Fish & Seafood': 'e.g., I prefer salmon, like lemon flavors, want something heart-healthy',
      'Indian': 'e.g., I like mild curry, prefer chicken tikka, want something with naan bread'
    }
    
    return placeholders[category] || 'e.g., I like spicy food, prefer quick and easy meals, want something the whole family will enjoy'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{mealEmoji}</span>
            <div>
              <h2 className="text-xl font-medium text-gray-900">
                {mealCategory} Preferences
              </h2>
              <p className="text-sm text-gray-500">
                Help us suggest the perfect meal for you
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
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What do you like about {mealCategory.toLowerCase()}? (Optional)
            </label>
            <textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
              placeholder={getPlaceholderText(mealCategory)}
              rows={4}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              Share your preferences to get more personalized meal suggestions
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Ideas...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Ideas
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}