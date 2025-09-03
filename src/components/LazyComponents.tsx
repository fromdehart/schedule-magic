import React, { Suspense } from 'react';

// Lazy load components for better performance
export const LazyAuthModal = React.lazy(() => import('./AuthModal'));
export const LazyMealTypeSelectorModal = React.lazy(() => import('./MealTypeSelectorModal'));
export const LazyMealPreferenceModal = React.lazy(() => import('./MealPreferenceModal'));
export const LazyMealDetailsModal = React.lazy(() => import('./MealDetailsModal'));
export const LazyConfirmationModal = React.lazy(() => import('./ConfirmationModal'));
export const LazyDatePicker = React.lazy(() => import('./DatePicker'));
export const LazyIngredientsModal = React.lazy(() => import('./IngredientsModal'));
export const LazyShoppingListModal = React.lazy(() => import('./ShoppingListModal'));
export const LazyInventoryModal = React.lazy(() => import('./InventoryModal'));

// Loading fallback component
export const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
  </div>
);

// Lazy component wrapper with error boundary
export const LazyComponent: React.FC<{
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  fallback?: React.ReactNode;
  props?: any;
}> = ({ component: Component, fallback = <LoadingFallback />, props = {} }) => (
  <Suspense fallback={fallback}>
    <Component {...props} />
  </Suspense>
);
