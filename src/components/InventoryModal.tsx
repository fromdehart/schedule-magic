import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, Loader2, Plus, Trash2, Sparkles } from '../lib/icons';
import { DatePicker } from './DatePicker';

interface InventoryItem {
  id?: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  notes?: string;
  estimated_expiry?: string;
}

interface InventoryLocation {
  id: string;
  name: string;
  displayName: string;
  icon: string;
}

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMealToDate?: (meal: any, date: string) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose, onAddMealToDate }) => {
  const [activeTab, setActiveTab] = useState<'pantry' | 'fridge' | 'freezer' | 'suggestions'>('pantry');
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [inventoryItems, setInventoryItems] = useState<{ [key: string]: InventoryItem[] }>({
    pantry: [],
    fridge: [],
    freezer: []
  });
  const [rawInputs, setRawInputs] = useState({
    pantry: '',
    fridge: '',
    freezer: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mealSuggestions, setMealSuggestions] = useState<any[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMealForDate, setSelectedMealForDate] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (isOpen) {
      loadLocations();
      loadInventoryItems();
    }
  }, [isOpen]);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await window.supabase
        .from('inventory_locations')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const { data, error } = await window.supabase
        .from('inventory_items')
        .select(`
          *,
          inventory_locations(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group items by location
      const grouped = { pantry: [], fridge: [], freezer: [] };
      data?.forEach(item => {
        const locationName = item.inventory_locations?.name;
        if (locationName && grouped[locationName]) {
          grouped[locationName].push(item);
        }
      });

      setInventoryItems(grouped);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  };

  const processRawInput = async (locationName: string, rawInput: string) => {
    if (!rawInput.trim()) return;

    setIsProcessing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/process-inventory-input`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await window.supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          locationName,
          rawInput: rawInput.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process input');
      }

      const result = await response.json();
      
      if (result.success && result.items) {
        // Add new items to the inventory
        await addInventoryItems(locationName, result.items);
        
        // Clear the input
        setRawInputs(prev => ({
          ...prev,
          [locationName]: ''
        }));
        
        // Reload inventory
        await loadInventoryItems();
      }
    } catch (error) {
      console.error('Error processing input:', error);
      showToast('Failed to process inventory input. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const addInventoryItems = async (locationName: string, items: InventoryItem[]) => {
    try {
      const location = locations.find(loc => loc.name === locationName);
      if (!location) return;

      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const itemsToInsert = items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        notes: item.notes,
        estimated_expiry: item.estimated_expiry,
        location_id: location.id,
        user_id: user.id
      }));

      const { error } = await window.supabase
        .from('inventory_items')
        .insert(itemsToInsert);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding inventory items:', error);
      throw error;
    }
  };

  const updateInventoryItem = async (item: InventoryItem) => {
    try {
      const { error } = await window.supabase
        .from('inventory_items')
        .update({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          notes: item.notes,
          estimated_expiry: item.estimated_expiry
        })
        .eq('id', item.id);

      if (error) throw error;
      
      await loadInventoryItems();
      setEditingItem(null);
      setIsEditing(false);
      showToast('Item updated successfully', 'success');
    } catch (error) {
      console.error('Error updating inventory item:', error);
      showToast('Failed to update item. Please try again.', 'error');
    }
  };

  const deleteInventoryItem = async (itemId: string) => {
    setItemToDelete(itemId);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await window.supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemToDelete);

      if (error) throw error;
      
      await loadInventoryItems();
      showToast('Item deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      showToast('Failed to delete item. Please try again.', 'error');
    } finally {
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
    }
  };

  const startEditing = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setIsEditing(false);
  };

  const saveEditing = () => {
    if (editingItem) {
      updateInventoryItem(editingItem);
    }
  };

  const formatExpiry = (expiry: string) => {
    const date = new Date(expiry);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    if (diffDays <= 3) return `Expires in ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const getExpiryColor = (expiry: string) => {
    const date = new Date(expiry);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-600';
    if (diffDays <= 3) return 'text-orange-600';
    if (diffDays <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const generateMealSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
      // Get all inventory items
      const allItems = Object.values(inventoryItems).flat();
      if (allItems.length === 0) {
        showToast('Please add some items to your inventory first.', 'info');
        return;
      }

      // Create a summary of available ingredients
      const ingredientsSummary = allItems.map(item => 
        `${item.name}${item.quantity && item.unit ? ` (${item.quantity} ${item.unit})` : ''}`
      ).join(', ');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-inventory-based-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await window.supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          ingredients: ingredientsSummary,
          location: 'all'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate meal suggestions');
      }

      const result = await response.json();
      if (result.success && result.meals) {
        setMealSuggestions(result.meals);
        showToast('Meal suggestions generated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error generating meal suggestions:', error);
      showToast('Failed to generate meal suggestions. Please try again.', 'error');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleAddToMenu = (meal: any) => {
    setSelectedMealForDate(meal);
    setShowDatePicker(true);
  };

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMealTitle, setSuccessMealTitle] = useState('');
  const [successDate, setSuccessDate] = useState('');

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  } | null>(null);

  // Toast notification functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, isVisible: false } : null);
    }, 4000);
  };

  const hideToast = () => {
    setToast(null);
  };

  // Confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">My Pantry & Fridge</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {locations.map((location) => (
            <button
              key={location.name}
              onClick={() => setActiveTab(location.name as any)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === location.name
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-sm font-medium text-gray-600">{location.icon}</span>
              {location.displayName}
            </button>
          ))}
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'suggestions'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="hidden sm:inline">Meal Ideas</span>
            <span className="sm:hidden">Ideas</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading inventory locations...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No inventory locations found.</p>
              <p className="text-sm mt-1">Please check your database configuration.</p>
            </div>
          ) : (
            locations.map((location) => (
              <div
                key={location.name}
                className={activeTab === location.name ? 'block' : 'hidden'}
              >
              {/* Input Section */}
              <div className="mb-6">
               
                <div className="text-sm text-gray-700 space-y-2">
                  <p className="font-bold">
                    Talk us through your <span className="font-medium">{location.displayName?.toLowerCase() || location.name}</span>. We'll do the rest.
                  </p>
                  <p>
                    <span className="font-bold text-blue-600">Ramble like:</span> 'bag of broccoli, popsicles stuck to the shelf, leftover chili in a tub, and some waffles expiring Aug 25th.' We'll turn it into an organized list.
                  </p>
                  <p>
                    💡 <span className="font-bold text-blue-600">Pro Tip:</span> Don't type it—tap the mic on your keyboard. It's perfect for <span className="font-medium">{location.displayName?.toLowerCase() || location.name}</span> confessions.
                  </p>
                </div>
              </div>
                <textarea
                  value={rawInputs[location.name as keyof typeof rawInputs]}
                  onChange={(e) => setRawInputs(prev => ({
                    ...prev,
                    [location.name]: e.target.value
                  }))}
                  placeholder={`e.g., 2 cans black beans, 1 lb ground beef, 3 bell peppers, some leftover chicken...`}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isProcessing}
                />
                <div className="mt-3 mb-8">
                  <button
                    onClick={() => processRawInput(location.name, rawInputs[location.name as keyof typeof rawInputs])}
                    disabled={isProcessing || !rawInputs[location.name as keyof typeof rawInputs].trim()}
                    className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Organize and Add Items
                      </>
                    )}
                  </button>
                </div>

              {/* Inventory List */}
              <div className='mt-8'>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Current {location.displayName || location.name} Items ({inventoryItems[location.name]?.length || 0})
                </h3>
                
                {inventoryItems[location.name]?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No items in your {location.displayName?.toLowerCase() || location.name} yet.</p>
                    <p className="text-sm mt-1">Add some items above to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inventoryItems[location.name]?.map((item) => (
                      <div
                        key={item.id || Math.random()}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        {isEditing && editingItem?.id === item.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={editingItem.name}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                                placeholder="Item name"
                              />
                              <input
                                type="text"
                                value={editingItem.category || ''}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, category: e.target.value } : null)}
                                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                                placeholder="Category"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <input
                                type="number"
                                step="0.1"
                                value={editingItem.quantity || ''}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, quantity: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                                placeholder="Quantity"
                              />
                              <input
                                type="text"
                                value={editingItem.unit || ''}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit: e.target.value } : null)}
                                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                                placeholder="Unit"
                              />
                              <input
                                type="date"
                                value={editingItem.estimated_expiry || ''}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, estimated_expiry: e.target.value } : null)}
                                className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <input
                              type="text"
                              value={editingItem.notes || ''}
                              onChange={(e) => setEditingItem(prev => prev ? { ...prev, notes: e.target.value } : null)}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
                              placeholder="Notes (optional)"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditing}
                                className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                {item.category && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {item.quantity && item.unit && (
                                  <span>{item.quantity} {item.unit}</span>
                                )}
                                {item.notes && (
                                  <span className="italic">{item.notes}</span>
                                )}
                                {item.estimated_expiry && (
                                  <span className={getExpiryColor(item.estimated_expiry)}>
                                    {formatExpiry(item.estimated_expiry)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditing(item)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                title="Edit item"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteInventoryItem(item.id!)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Delete item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Meal Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                AI-Powered Meal Suggestions
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Based on what's in your pantry, fridge, and freezer, we'll suggest delicious meals you can make right now.
              </p>
              
              {mealSuggestions.length === 0 ? (
                <button
                  onClick={generateMealSuggestions}
                  disabled={isGeneratingSuggestions}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isGeneratingSuggestions ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating Suggestions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Meal Suggestions
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-medium text-gray-900">
                      {mealSuggestions.length} Meal Suggestions
                    </h4>
                    <button
                      onClick={generateMealSuggestions}
                      disabled={isGeneratingSuggestions}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
                    >
                      {isGeneratingSuggestions ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          Regenerate
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mealSuggestions.map((meal, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <h5 className="font-medium text-gray-900 flex-1 min-w-0">{meal.title}</h5>
                          <button
                            onClick={() => handleAddToMenu(meal)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            Add to My Menu
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{meal.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {meal.ingredients?.map((ingredient: any, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {ingredient.amount} {ingredient.unit} {ingredient.name}
                              {ingredient.notes && <span className="text-blue-600 ml-1">({ingredient.notes})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Date Picker Modal for Adding Meals to Menu */}
      {showDatePicker && selectedMealForDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-16">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add "{selectedMealForDate.title}" to Your Menu
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Choose which day you'd like to add this meal to your weekly menu.
              </p>
              
              {showSuccessMessage ? (
                <div className="mt-6 text-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-green-600 text-2xl">✅</span>
                    </div>
                    <h4 className="text-green-800 font-medium mb-1">Meal Added Successfully!</h4>
                    <p className="text-green-700 text-sm">
                      "{successMealTitle}" has been added to your menu for {(() => {
                        // Parse date string in a timezone-safe way
                        const [year, month, day] = successDate.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      })()}.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Custom Date Input with Calendar Popup */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Date
                    </label>
                    <DatePicker
                      selectedDate={selectedDate}
                      onDateChange={(date) => {
                        setSelectedDate(date);
                      }}
                    />
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setShowDatePicker(false);
                        setSelectedMealForDate(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (selectedDate && onAddMealToDate && selectedMealForDate) {
                          // Call the parent function to add the meal to the selected date
                          onAddMealToDate(selectedMealForDate, (() => {
                            // Convert Date to YYYY-MM-DD format without timezone issues
                            const year = selectedDate.getFullYear();
                            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const day = String(selectedDate.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                          })());
                          
                          // Show success message
                          setSuccessMealTitle(selectedMealForDate.title);
                          setSuccessDate((() => {
                            // Convert Date to YYYY-MM-DD format without timezone issues
                            const year = selectedDate.getFullYear();
                            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const day = String(selectedDate.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                          })());
                          setShowSuccessMessage(true);
                          
                          // Close the modal after a short delay
                          setTimeout(() => {
                            setShowDatePicker(false);
                            setSelectedMealForDate(null);
                            setShowSuccessMessage(false);
                          }, 2000);
                        }
                      }}
                      disabled={!selectedDate}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Add Meal
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && toast.isVisible && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={hideToast}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      {showDeleteConfirmation && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
