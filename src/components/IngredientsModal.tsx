import React, { useState, useEffect } from 'react'
import { X, Edit3, Save, Loader2, Plus, Trash2 } from '../lib/icons'

interface Ingredient {
  id: string
  name: string
  amount: string
  unit: string
  notes?: string
}

interface DayIngredients {
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

interface IngredientsModalProps {
  isOpen: boolean
  onClose: () => void
  dayIngredients: DayIngredients | null
  onSave: (ingredients: DayIngredients) => void
  onGenerate: () => Promise<void>
  isGenerating: boolean
  dayDisplayName: string
}

export function IngredientsModal({
  isOpen,
  onClose,
  dayIngredients,
  onSave,
  onGenerate,
  isGenerating,
  dayDisplayName
}: IngredientsModalProps) {
  const [editingMode, setEditingMode] = useState(false)
  const [localIngredients, setLocalIngredients] = useState<DayIngredients | null>(dayIngredients)

  // Sync local ingredients when the modal opens or when dayIngredients changes
  useEffect(() => {
    if (isOpen) {
      // Always update local ingredients when modal opens
      // If dayIngredients is null, set localIngredients to null to clear previous data
      setLocalIngredients(dayIngredients);
      // Reset editing mode when switching days
      setEditingMode(false);
    }
  }, [isOpen, dayIngredients]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (localIngredients) {
      onSave(localIngredients)
      setEditingMode(false)
    }
  }

  const handleCancel = () => {
    setLocalIngredients(dayIngredients)
    setEditingMode(false)
  }

  const addIngredient = (mealType: 'mainMeal' | 'kidsMeal') => {
    if (!localIngredients) return

    const newIngredient: Ingredient = {
      id: crypto.randomUUID(),
      name: '',
      amount: '',
      unit: '',
      notes: ''
    }

    const currentMeal = localIngredients[mealType]
    const updatedMeal = {
      items: [...(currentMeal?.items || []), newIngredient],
      servingSize: currentMeal?.servingSize || (mealType === 'mainMeal' ? 4 : 2)
    }

    setLocalIngredients({
      ...localIngredients,
      [mealType]: updatedMeal
    })
  }

  const removeIngredient = (mealType: 'mainMeal' | 'kidsMeal', ingredientId: string) => {
    if (!localIngredients) return

    setLocalIngredients({
      ...localIngredients,
      [mealType]: {
        ...localIngredients[mealType],
        items: localIngredients[mealType].items.filter(item => item.id !== ingredientId)
      }
    })
  }

  const updateIngredient = (
    mealType: 'mainMeal' | 'kidsMeal',
    ingredientId: string,
    field: keyof Ingredient,
    value: string
  ) => {
    if (!localIngredients) return

    setLocalIngredients({
      ...localIngredients,
      [mealType]: {
        ...localIngredients[mealType],
        items: localIngredients[mealType].items.map(item =>
          item.id === ingredientId ? { ...item, [field]: value } : item
        )
      }
    })
  }

  const updateServingSize = (mealType: 'mainMeal' | 'kidsMeal', newSize: number) => {
    if (!localIngredients) return

    setLocalIngredients({
      ...localIngredients,
      [mealType]: {
        ...localIngredients[mealType],
        servingSize: newSize
      }
    })
  }

  const renderIngredientList = (mealType: 'mainMeal' | 'kidsMeal', title: string, defaultServingSize: number) => {
    const meal = localIngredients?.[mealType]

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {editingMode && meal && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Serving size:</span>
              <input
                type="number"
                min="1"
                value={meal.servingSize || defaultServingSize}
                onChange={(e) => updateServingSize(mealType, parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-600">people</span>
            </div>
          )}
        </div>

        {!meal || meal.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {isGenerating ? (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
                <p>Generating ingredients...</p>
                <p className="text-sm text-gray-400">This may take a few seconds</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-lg font-medium text-gray-700">No ingredients yet</p>
                  <p className="text-sm text-gray-500">Click the button below to generate ingredients using AI</p>
                  {!editingMode && (
                    <button
                      onClick={onGenerate}
                      disabled={isGenerating}
                      className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🤖 Generate Ingredients
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {meal.items.map((ingredient) => (
              <div key={ingredient.id} className="flex items-center gap-1 p-2 bg-gray-100 rounded-lg">
                {editingMode ? (
                  <>
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(mealType, ingredient.id, 'name', e.target.value)}
                      placeholder="Ingredient name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(mealType, ingredient.id, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(mealType, ingredient.id, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      value={ingredient.notes || ''}
                      onChange={(e) => updateIngredient(mealType, ingredient.id, 'notes', e.target.value)}
                      placeholder="Notes (optional)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={() => removeIngredient(mealType, ingredient.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-bold text-gray-900">{ingredient.name}</span>
                      <span className="font-medium text-gray-900 ml-2">
                        - {ingredient.amount && ingredient.unit ? (
                          <>{ingredient.amount} {ingredient.unit}</>
                        ) : ingredient.amount ? (
                          <>{ingredient.amount}</>
                        ) : (
                          <>1</>
                        )}
                      </span>
                      {ingredient.notes && (
                        <span className="text-sm text-gray-600 ml-2">({ingredient.notes})</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {editingMode && (
          <button
            onClick={() => addIngredient(mealType)}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Ingredient
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Ingredients for {dayDisplayName}</h2>
            <p className="text-gray-600 mt-1">Manage ingredients for your meals</p>
          </div>
          <div className="flex items-center gap-3">
            {!editingMode ? (
              <button
                onClick={() => setEditingMode(true)}
                className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-8">
            {renderIngredientList('mainMeal', 'Adult Meal', 4)}
            {renderIngredientList('kidsMeal', 'Kids Meal', 2)}
          </div>
        </div>
      </div>
    </div>
  )
}
