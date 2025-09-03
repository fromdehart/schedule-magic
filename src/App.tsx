import React, { useState } from 'react';
import { User, LogOut, Plus, Filter, Search, Sparkles } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import { ActivityInput } from './components/ActivityInput';
import { ActivityCard } from './components/ActivityCard';
import { ActivityEditModal } from './components/ActivityEditModal';
import { useActivities } from './hooks/useActivities';
import { Activity, ProcessedActivity } from './types/activity';

function ActivityMagic() {
  const { user, signOut } = useAuth();
  const { activities, loading, error, addActivity, updateActivity, deleteActivity } = useActivities();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleActivityProcessed = async (processedActivity: ProcessedActivity) => {
    try {
      await addActivity(processedActivity);
      setNotification({ type: 'success', message: 'Activity added successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error adding activity:', error);
      setNotification({ type: 'error', message: 'Failed to add activity. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleError = (error: string) => {
    setNotification({ type: 'error', message: error });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setShowEditModal(true);
  };

  const handleSaveActivity = async (id: string, updates: Partial<Activity>) => {
    try {
      await updateActivity(id, updates);
      setNotification({ type: 'success', message: 'Activity updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating activity:', error);
      setNotification({ type: 'error', message: 'Failed to update activity. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
        await deleteActivity(activity.id);
        setNotification({ type: 'success', message: 'Activity deleted successfully!' });
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        console.error('Error deleting activity:', error);
        setNotification({ type: 'error', message: 'Failed to delete activity. Please try again.' });
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  const handleShareActivity = (activity: Activity) => {
    // TODO: Implement share functionality
    console.log('Share activity:', activity);
  };

  const handleStatusChange = async (activity: Activity, status: Activity['status']) => {
    try {
      await updateActivity(activity.id, { status });
      setNotification({ type: 'success', message: 'Activity status updated!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating activity status:', error);
      setNotification({ type: 'error', message: 'Failed to update activity status.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || activity.categories.includes(categoryFilter);
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories for filter
  const allCategories = Array.from(new Set(activities.flatMap(activity => activity.categories)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Activity Magic</h1>
                  <p className="text-sm text-gray-500">Capture and share activity ideas</p>
                </div>
              </div>
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
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {!user && isSupabaseConfigured && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">Sign in to save your activities</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Create an account to save your activity ideas and share them with family and friends.
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
                  You're using Activity Magic in demo mode. Activities won't be saved between sessions. To enable full features, connect to Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Activity Section */}
        {user && (
          <div className="mb-8">
            <ActivityInput
              onActivityProcessed={handleActivityProcessed}
              onError={handleError}
            />
          </div>
        )}

        {/* Filters and Search */}
        {user && activities.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="idea">Ideas</option>
                  <option value="planned">Planned</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="sm:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {allCategories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Activities Grid */}
        {user ? (
          loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading activities...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="font-medium text-red-900">Error loading activities</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activities.length === 0 ? 'No activities yet' : 'No activities match your filters'}
              </h3>
              <p className="text-gray-600 mb-4">
                {activities.length === 0 
                  ? 'Start by adding your first activity idea above!'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {activities.length === 0 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Activity
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onEdit={handleEditActivity}
                  onDelete={handleDeleteActivity}
                  onShare={handleShareActivity}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Activity Magic</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Capture and share real-world activity ideas with the people you care about. 
              Whether it's a museum visit, apple picking, or a new restaurant, you can quickly 
              jot down ideas and keep them in one shared dream list.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <User className="w-5 h-5" />
              Get Started
            </button>
          </div>
        )}

        {/* Stats */}
        {user && activities.length > 0 && (
          <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Activity Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {activities.length}
                </div>
                <p className="text-sm text-gray-600">Total Activities</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {activities.filter(a => a.status === 'completed').length}
                </div>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {activities.filter(a => a.status === 'planned').length}
                </div>
                <p className="text-sm text-gray-600">Planned</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {activities.filter(a => a.status === 'idea').length}
                </div>
                <p className="text-sm text-gray-600">Ideas</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ActivityEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingActivity(null);
        }}
        onSave={handleSaveActivity}
        activity={editingActivity}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ActivityMagic />
    </AuthProvider>
  );
}

export default App;