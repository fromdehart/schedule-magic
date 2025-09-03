import React, { useState, useMemo } from 'react'
import { X, Copy, Printer, Mail } from '../lib/icons'

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

interface ConsolidatedIngredient {
  name: string
  totalAmount: string
  unit: string
  notes: string[]
  sourceDays: string[]
}

interface ShoppingListModalProps {
  isOpen: boolean
  onClose: () => void
  ingredients: { [key: string]: DayIngredients }
  currentWeekDates: string[]
}

export function ShoppingListModal({
  isOpen,
  onClose,
  ingredients,
  currentWeekDates
}: ShoppingListModalProps) {
  const [viewMode, setViewMode] = useState<'consolidated' | 'meal-grouped'>('consolidated')

    // Consolidate ingredients across all days
  const consolidatedIngredients = useMemo(() => {
    const ingredientMap = new Map<string, ConsolidatedIngredient>()
    
    currentWeekDates.forEach(date => {
      const dayIngredients = ingredients[date]
      
      if (!dayIngredients) {
        return;
      }
      
      if (!dayIngredients.mainMeal && !dayIngredients.kidsMeal) {
        return;
      }

      // Process main meal ingredients
      if (dayIngredients.mainMeal?.items && Array.isArray(dayIngredients.mainMeal.items)) {
        dayIngredients.mainMeal.items.forEach(ingredient => {
                  // Skip ingredients with missing required properties
        if (!ingredient?.name || !ingredient?.unit) {
          return;
        }

          const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`
          const existing = ingredientMap.get(key)

          if (existing) {
            // Add quantities (simple string concatenation for now)
            const existingAmount = parseFloat(existing.totalAmount) || 0
            const newAmount = parseFloat(ingredient.amount) || 0
            existing.totalAmount = String(existingAmount + newAmount)
            existing.notes.push(ingredient.notes || '')
            existing.sourceDays.push(date)
          } else {
            ingredientMap.set(key, {
              name: ingredient.name,
              totalAmount: ingredient.amount || '1',
              unit: ingredient.unit,
              notes: [ingredient.notes || ''],
              sourceDays: [date]
            })
          }
        });
      }

      // Process kids meal ingredients
      if (dayIngredients.kidsMeal?.items && Array.isArray(dayIngredients.kidsMeal.items)) {
        dayIngredients.kidsMeal.items.forEach(ingredient => {
          // Skip ingredients with missing required properties
          if (!ingredient?.name || !ingredient.unit) {
            console.warn('Skipping ingredient with missing name or unit:', ingredient);
            return;
          }

          const key = `${ingredient.name.toLowerCase()}-${ingredient.unit.toLowerCase()}`
          const existing = ingredientMap.get(key)

          if (existing) {
            const existingAmount = parseFloat(existing.totalAmount) || 0
            const newAmount = parseFloat(ingredient.amount) || 0
            existing.totalAmount = String(existingAmount + newAmount)
            existing.notes.push(ingredient.notes || '')
            existing.sourceDays.push(date)
          } else {
            ingredientMap.set(key, {
              name: ingredient.name,
              totalAmount: ingredient.amount || '1',
              unit: ingredient.unit,
              notes: [ingredient.notes || ''],
              sourceDays: [date]
            })
          }
        });
      }
    })

    return Array.from(ingredientMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [ingredients, currentWeekDates])

  // Group ingredients by meal for meal-grouped view
  const mealGroupedIngredients = useMemo(() => {
    const grouped: { [date: string]: { mainMeal?: Ingredient[], kidsMeal?: Ingredient[] } } = {}
    
    currentWeekDates.forEach(date => {
      const dayIngredients = ingredients[date]
      if (!dayIngredients) return
      
      grouped[date] = {}
      
      if (dayIngredients.mainMeal?.items && Array.isArray(dayIngredients.mainMeal.items)) {
        grouped[date].mainMeal = dayIngredients.mainMeal.items.filter(ingredient => 
          ingredient?.name && ingredient?.unit
        )
      }
      
      if (dayIngredients.kidsMeal?.items && Array.isArray(dayIngredients.kidsMeal.items)) {
        grouped[date].kidsMeal = dayIngredients.kidsMeal.items.filter(ingredient => 
          ingredient?.name && ingredient?.unit
        )
      }
    })
    
    return grouped
  }, [ingredients, currentWeekDates])

  const copyToClipboard = () => {
    const consolidatedText = consolidatedIngredients.map(item => `${item.totalAmount} ${item.unit} ${item.name}`).join('\n')
    
    const mealGroupedText = Object.entries(mealGroupedIngredients).flatMap(([date, meals]) => {
      const dateIngredients: string[] = []
      if (meals.mainMeal?.length) {
        dateIngredients.push(`\n${date} - Main Meal:`)
        meals.mainMeal.forEach(item => dateIngredients.push(`  ${item.amount} ${item.unit} ${item.name}`))
      }
      if (meals.kidsMeal?.length) {
        dateIngredients.push(`${date} - Kids Meal:`)
        meals.kidsMeal.forEach(item => dateIngredients.push(`  ${item.amount} ${item.unit} ${item.name}`))
      }
      return dateIngredients
    }).join('\n')
    
    const text = `SHOPPING LIST\n\nCONSOLIDATED VIEW:\n${consolidatedText}\n\nMEAL GROUPED VIEW:\n${mealGroupedText}`
    navigator.clipboard.writeText(text)
  }

  const printList = () => {
    const consolidatedText = consolidatedIngredients.map(item => `${item.totalAmount} ${item.unit} ${item.name}`).join('\n')
    
    const mealGroupedText = Object.entries(mealGroupedIngredients).flatMap(([date, meals]) => {
      const dateIngredients: string[] = []
      if (meals.mainMeal?.length) {
        dateIngredients.push(`\n${date} - Main Meal:`)
        meals.mainMeal.forEach(item => dateIngredients.push(`  ${item.amount} ${item.unit} ${item.name}`))
      }
      if (meals.kidsMeal?.length) {
        dateIngredients.push(`${date} - Kids Meal:`)
        meals.kidsMeal.forEach(item => dateIngredients.push(`  ${item.amount} ${item.unit} ${item.name}`))
      }
      return dateIngredients
    }).join('\n')
    
    const text = `SHOPPING LIST\n\nCONSOLIDATED VIEW:\n${consolidatedText}\n\nMEAL GROUPED VIEW:\n${mealGroupedText}`
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Shopping List</title></head>
          <body>
            <h1>Shopping List</h1>
            <pre>${text}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const emailList = () => {
    const consolidatedText = consolidatedIngredients.map(item => `${item.totalAmount} ${item.unit} ${item.name}`).join('\n')
    
    const mealGroupedText = Object.entries(mealGroupedIngredients).flatMap(([date, meals]) => {
      const dateIngredients: string[] = []
      if (meals.mainMeal?.length) {
        dateIngredients.push(`\n${date} - Main Meal:`)
        meals.mainMeal.forEach(item => dateIngredients.push(`  ${item.amount} ${item.unit} ${item.name}`))
      }
      if (meals.kidsMeal?.length) {
        dateIngredients.push(`${date} - Kids Meal:`)
        meals.kidsMeal.forEach(item => dateIngredients.push(`  ${item.amount} ${item.unit} ${item.name}`))
      }
      return dateIngredients
    }).join('\n')
    
    const subject = 'Shopping List - YumPlan'
    const body = `SHOPPING LIST\n\nCONSOLIDATED VIEW:\n${consolidatedText}\n\nMEAL GROUPED VIEW:\n${mealGroupedText}`
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Shopping List</h2>
              </div>
              <div className="flex items-center gap-0 sm:gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  onClick={printList}
                  className="flex items-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors"
                  title="Print list"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  onClick={emailList}
                  className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
                  title="Email list"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Email</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

                    {/* View Toggle */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('consolidated')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'consolidated'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Consolidated
                  </button>
                  <button
                    onClick={() => setViewMode('meal-grouped')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'meal-grouped'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    By Meal
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {viewMode === 'consolidated' ? (
                // Consolidated View
                consolidatedIngredients.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No ingredients found for the current week</p>
                    <p className="text-sm mt-2">Add some meals to see ingredients here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {consolidatedIngredients.map((ingredient) => (
                      <div
                        key={ingredient.name}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-900">
                              {ingredient.totalAmount} {ingredient.unit}
                            </span>
                            <span className="text-gray-500">-</span>
                            <span className="font-medium text-gray-900">{ingredient.name}</span>
                          </div>
                          
                          {ingredient.notes.some(note => note) && (
                            <div className="mt-1 text-sm text-gray-600">
                              {ingredient.notes.filter(note => note).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // Meal Grouped View
                Object.keys(mealGroupedIngredients).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No ingredients found for the current week</p>
                    <p className="text-sm mt-2">Add some meals to see ingredients here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {currentWeekDates.map(date => {
                      const dayIngredients = mealGroupedIngredients[date]
                      if (!dayIngredients || (!dayIngredients.mainMeal?.length && !dayIngredients.kidsMeal?.length)) {
                        return null
                      }
                      
                      const dateInfo = (() => {
                        const dateObj = new Date(date)
                        const today = new Date()
                        const tomorrow = new Date(today)
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        
                        if (dateObj.toDateString() === today.toDateString()) {
                          return 'Today'
                        } else if (dateObj.toDateString() === tomorrow.toDateString()) {
                          return 'Tomorrow'
                        } else {
                          return dateObj.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        }
                      })()
                      
                      return (
                        <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <h3 className="font-medium text-gray-900">{dateInfo}</h3>
                          </div>
                          
                          <div className="divide-y divide-gray-100">
                            {dayIngredients.mainMeal && dayIngredients.mainMeal.length > 0 && (
                              <div className="p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Main Meal</h4>
                                <div className="space-y-2">
                                  {dayIngredients.mainMeal.map((ingredient, index) => (
                                    <div key={index} className="flex items-center gap-1 text-sm">
                                      <span className="text-gray-600">
                                        {ingredient.amount} {ingredient.unit}
                                      </span>
                                      <span className="text-gray-500">-</span>
                                      <span className="text-gray-900">{ingredient.name}</span>
                                      {ingredient.notes && (
                                        <span className="text-gray-500 text-xs">({ingredient.notes})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {dayIngredients.kidsMeal && dayIngredients.kidsMeal.length > 0 && (
                              <div className="p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Kids Meal</h4>
                                <div className="space-y-2">
                                  {dayIngredients.kidsMeal.map((ingredient, index) => (
                                    <div key={index} className="flex items-center gap-1 text-sm">
                                      <span className="text-gray-600">
                                        {ingredient.amount} {ingredient.unit}
                                      </span>
                                      <span className="text-gray-500">-</span>
                                      <span className="text-gray-900">{ingredient.name}</span>
                                      {ingredient.notes && (
                                        <span className="text-xs text-gray-500">({ingredient.notes})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
      </div>
    </div>
  )
}
