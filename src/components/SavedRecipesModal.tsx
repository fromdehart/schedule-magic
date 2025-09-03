import React, { useState, useEffect } from 'react';
import { X, Save, ExternalLink, Calendar, Loader2, Trash2 } from '../lib/icons';
import { analyzeRecipe } from '../hooks/useMealPlans';
import { DatePicker } from './DatePicker';
import { useAuth } from '../contexts/AuthContext';

interface SavedRecipe {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at: string;
}

interface SavedRecipesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecipeToDay: (recipe: SavedRecipe, date: string) => void;
}

export const SavedRecipesModal: React.FC<SavedRecipesModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddRecipeToDay 
}) => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<SavedRecipe | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSavedRecipes();
    }
  }, [isOpen]);

  const loadSavedRecipes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await window.supabase
        .from('saved_recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedRecipes(data || []);
    } catch (error) {
      console.error('Error loading saved recipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!url.trim()) return;

    setIsAnalyzing(true);
    try {
      // Use AI to analyze the recipe
      const analysis = await analyzeRecipe(url.trim());
      
      let title = 'Recipe';
      let description = '';
      
      if (analysis.success) {
        title = analysis.category || 'Recipe';
        description = analysis.details || '';
      }

      // Save to database
      const { error } = await window.supabase
        .from('saved_recipes')
        .insert({
          user_id: user?.id,
          title,
          description,
          url: url.trim()
        });

      if (error) throw error;

      // Clear form and refresh list
      setUrl('');
      await loadSavedRecipes();
    } catch (error) {
      console.error('Error saving recipe:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToDay = (recipe: SavedRecipe) => {
    setSelectedRecipe(recipe);
    setShowDatePicker(true);
  };

  const handleDateSelected = (date: Date) => {
    if (selectedRecipe) {
      onAddRecipeToDay(selectedRecipe, date.toISOString().split('T')[0]);
      setShowDatePicker(false);
      setSelectedRecipe(null);
      onClose();
    }
  };

  const handleOpenRecipe = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteRecipe = (recipe: SavedRecipe) => {
    setRecipeToDelete(recipe);
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await window.supabase
        .from('saved_recipes')
        .delete()
        .eq('id', recipeToDelete.id);

      if (error) throw error;

      // Refresh the list and close confirmation
      await loadSavedRecipes();
      setShowDeleteConfirmation(false);
      setRecipeToDelete(null);
    } catch (error) {
      console.error('Error deleting recipe:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim()) {
      handleSaveRecipe();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Saved Recipes</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Add Recipe Section */}
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="space-y-4">
            <div>
              <label htmlFor="recipe-url" className="block text-sm font-medium text-gray-700 mb-2">
                Recipe URL
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="recipe-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="https://example.com/recipe"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base"
                />
                <button
                  onClick={handleSaveRecipe}
                  disabled={!url.trim() || isAnalyzing}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-base font-medium"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Recipe
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Recipes List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : savedRecipes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No saved recipes yet.</p>
              <p className="text-sm mt-1">Add a recipe URL above to get started!</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {savedRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">{recipe.title}</h3>
                      {recipe.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2 truncate">{recipe.url}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenRecipe(recipe.url)}
                          className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                          title="Open recipe"
                        >
                          Open Recipe
                        </button>
                        <button
                          onClick={() => handleAddToDay(recipe)}
                          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          title="Add to day"
                        >
                          Add to Day
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteRecipe(recipe)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[60] p-4 pt-8">
            <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Choose a day for "{selectedRecipe?.title}"
              </h3>
              <DatePicker
                selectedDate={selectedDate}
                onDateChange={handleDateSelected}
              />
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDateSelected(selectedDate)}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-base font-medium"
                >
                  Add to Day
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Delete Recipe
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{recipeToDelete?.title}"? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setRecipeToDelete(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Recipe'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
