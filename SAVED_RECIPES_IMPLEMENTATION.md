# Saved Recipes Feature Implementation

## Overview
The Saved Recipes feature allows users to save recipe URLs with AI-generated titles and descriptions, then easily add them to their meal plans.

## Database Setup

### 1. Run the Migration
Execute the following SQL migration to create the `saved_recipes` table:

```sql
-- File: supabase/migrations/20250101000002_create_saved_recipes_table.sql
-- This creates the table with proper RLS policies and indexes
```

### 2. Table Structure
```sql
saved_recipes (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,           -- AI-generated recipe title
  description text,              -- AI-generated recipe description
  url text NOT NULL,             -- Original recipe URL
  created_at timestamptz,
  updated_at timestamptz
)
```

## Features

### 1. Save Recipe
- User enters recipe URL
- AI analyzes the recipe to extract title and description
- Recipe is saved to database with AI-generated content

### 2. View Saved Recipes
- List of all saved recipes with titles, descriptions, and URLs
- Each recipe shows:
  - AI-generated title
  - AI-generated description
  - Original URL
  - Action buttons

### 3. Add to Meal Plan
- "Add to Day" button opens date picker
- Selected recipe is added to the chosen day
- Opens MealDetailsModal for final customization
- Integrates with existing meal planning system

## UI Components

### SavedRecipesModal
- **Location:** `src/components/SavedRecipesModal.tsx`
- **Features:**
  - URL input field
  - Save Recipe button with AI analysis
  - List of saved recipes
  - Date picker for adding to meal plan

### Integration Points
- **Button:** Added next to "My Pantry & Fridge" button
- **Icon:** 📖 (book emoji)
- **Position:** Top navigation area

## AI Integration

### Recipe Analysis
- Uses existing `analyzeRecipe()` function from `useMealPlans.ts`
- Calls Supabase Edge Function `/functions/v1/analyze-recipe`
- Extracts:
  - Recipe title (from category)
  - Recipe description (from details)

### Fallback Handling
- If AI analysis fails, saves with basic info
- Title defaults to "Recipe"
- Description is empty
- Recipe can still be saved and used

## User Flow

1. **Save Recipe:**
   - Click "Saved Recipes" button
   - Enter recipe URL
   - Click "Save Recipe"
   - AI analyzes and saves recipe

2. **Add to Meal Plan:**
   - Click "Add to Day" on saved recipe
   - Select date from picker
   - Recipe is added to meal plan
   - Opens MealDetailsModal for customization

3. **View Recipe:**
   - Click external link icon to open original recipe
   - Recipe opens in new tab

## Technical Details

### State Management
- `showSavedRecipesModal` - Controls modal visibility
- `handleAddRecipeToDay` - Handles adding recipe to meal plan

### Database Operations
- `loadSavedRecipes()` - Fetches user's saved recipes
- `handleSaveRecipe()` - Saves new recipe with AI analysis

### Error Handling
- Graceful fallback if AI analysis fails
- User-friendly error messages
- Loading states for better UX

## Future Enhancements

- Recipe categorization/tagging
- Recipe notes and personal modifications
- Recipe sharing between users
- Recipe import from popular cooking sites
- Recipe difficulty analysis
- Nutritional information extraction

## Testing

### Manual Testing Steps
1. Open the app and sign in
2. Click "Saved Recipes" button
3. Enter a recipe URL and save
4. Verify AI-generated title/description
5. Add recipe to a specific day
6. Verify integration with meal planning

### Database Verification
```sql
-- Check if recipes are saved
SELECT * FROM saved_recipes WHERE user_id = 'your-user-id';

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'saved_recipes';
```

## Dependencies

- Existing `analyzeRecipe` function
- Existing `DatePicker` component
- Existing `MealDetailsModal` component
- Supabase client setup
- Tailwind CSS for styling
- Lucide React for icons
