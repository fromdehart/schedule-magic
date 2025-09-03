import React, { useState } from 'react'
import { X, Search, Plus } from '../lib/icons'

interface MealCategory {
  emoji: string
  name: string
}

interface MealTypeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectMealType: (category: string, emoji: string) => void
}

const mealCategories: MealCategory[] = [
  { emoji: '🍔', name: 'Burgers' },
  { emoji: '🍝', name: 'Pasta' },
  { emoji: '🍗', name: 'Chicken' },
  { emoji: '🌮', name: 'Tacos' },
  { emoji: '🍕', name: 'Pizza' },
  { emoji: '🥞', name: 'Breakfast for Dinner' },
  { emoji: '🥡', name: 'Chinese' },
  { emoji: '🌯', name: 'Mexican' },
  { emoji: '🍖', name: 'BBQ' },
  { emoji: '📦', name: 'Takeout' },
  { emoji: '🥗', name: 'Salad Night' },
  { emoji: '🍲', name: 'Soup & Stew' },
  { emoji: '🐟', name: 'Fish & Seafood' },
  { emoji: '🥪', name: 'Sandwich Night' },
  { emoji: '🍳', name: 'Eggs & Veggies' },
  { emoji: '🍛', name: 'Indian' },
  { emoji: '🍚', name: 'Rice Bowls' },
  { emoji: '🍜', name: 'Noodles & Ramen' },
  { emoji: '🍽️', name: 'Leftovers Night' }
]

export function MealTypeSelectorModal({ isOpen, onClose, onSelectMealType }: MealTypeSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [customMealType, setCustomMealType] = useState('')

  if (!isOpen) return null

  const filteredCategories = mealCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectCategory = (category: MealCategory) => {
    onSelectMealType(category.name, category.emoji)
    onClose()
    setSearchTerm('')
    setCustomMealType('')
  }

  const handleAddCustomMealType = () => {
    if (customMealType.trim()) {
      onSelectMealType(customMealType.trim(), '🍽️')
      onClose()
      setSearchTerm('')
      setCustomMealType('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customMealType.trim()) {
      handleAddCustomMealType()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-light text-gray-900">Choose Meal Type</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              placeholder="Search meal types..."
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Meal Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {filteredCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleSelectCategory(category)}
                className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-gray-200 rounded-xl transition-all duration-200 text-left group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">
                  {category.emoji}
                </span>
                <span className="font-medium text-gray-700 group-hover:text-emerald-700 text-sm">
                  {category.name}
                </span>
              </button>
            ))}
          </div>

          {/* Custom Meal Type */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Or create your own</h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customMealType}
                  onChange={(e) => setCustomMealType(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Enter custom meal type..."
                />
              </div>
              <button
                onClick={handleAddCustomMealType}
                disabled={!customMealType.trim()}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}