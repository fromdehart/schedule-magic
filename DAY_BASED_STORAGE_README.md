# Day-Based Storage Implementation

## Overview
We've refactored the meal planning system from a week-based storage approach to a day-based storage approach. This provides better performance, scalability, and eliminates the complex dual-state management that was causing issues.

## What Changed

### Before: Week-Based Storage
```sql
-- One row per week
CREATE TABLE meal_plans (
  user_id uuid,
  week_start date,
  plan_data jsonb  -- Entire week as JSON
);
```

### After: Day-Based Storage
```sql
-- One row per day
CREATE TABLE daily_meals (
  user_id uuid,
  date date,
  main_meal jsonb,
  kids_meal jsonb
);
```

## Benefits

✅ **Efficient Updates**: Only update the specific day that changed
✅ **No Data Duplication**: Each meal stored once
✅ **Better Concurrency**: Multiple users can update different days simultaneously
✅ **Easier Queries**: Can query specific dates, date ranges, or meal types
✅ **Better Indexing**: Can index on date, meal type, etc.
✅ **Scalability**: Works better as data grows over months/years
✅ **Simplified Logic**: No more complex state synchronization

## Implementation Steps

### 1. Create New Database Schema
Run the `daily_meals_schema.sql` file in your Supabase SQL Editor. This will:
- Create the new `daily_meals` table
- Set up proper indexes and security policies
- Migrate existing data from `meal_plans` to `daily_meals`

### 2. Updated Code Structure

#### New Functions in `useMealPlans`:
```typescript
// Save a single day's meal
const saveDailyMeal = async (date: string, meal: any, target: 'main' | 'kids')

// Load meals for a week (aggregates daily meals)
const loadMealPlan = async ()

// Add meal to date (now saves immediately)
const addMealToDate = async (date: string, meal: any, target: 'main' | 'kids')
```

#### Data Flow:
```
User adds meal → Update local state → Save to daily_meals table
```

### 3. Database Operations

#### Saving a Meal:
```sql
INSERT INTO daily_meals (user_id, date, main_meal, kids_meal) 
VALUES ('user123', '2025-01-27', '{"title": "Salmon"}', NULL)
ON CONFLICT (user_id, date) DO UPDATE SET
  main_meal = EXCLUDED.main_meal,
  kids_meal = EXCLUDED.kids_meal;
```

#### Loading a Week:
```sql
SELECT date, main_meal, kids_meal 
FROM daily_meals 
WHERE user_id = 'user123' 
  AND date >= '2025-01-27' 
  AND date < '2025-02-03'
ORDER BY date;
```

## Migration

The schema includes an automatic migration that:
1. Reads existing data from `meal_plans` table
2. Converts week-based JSON to individual day records
3. Inserts each day into the new `daily_meals` table
4. Preserves all existing meal data

## Testing

Use the `test_daily_meals.sql` script to verify:
- Data insertion works correctly
- Date range queries function properly
- Conflict resolution (upsert) works as expected

## Rollback Plan

If issues arise:
1. The old `meal_plans` table remains intact
2. You can revert the code changes
3. Data is preserved in both tables during migration

## Performance Improvements

- **Before**: Loading entire week JSON and parsing it
- **After**: Loading only the days needed with proper indexing
- **Before**: Saving entire week even for one meal change
- **After**: Saving only the changed day

## Next Steps

1. Run the database schema migration
2. Test with the provided test script
3. Deploy the updated code
4. Monitor for any issues
5. Optionally drop the old `meal_plans` table after confirming everything works

## Questions?

The new approach is much simpler and more efficient. Each meal addition is now a direct database operation without complex state management or synchronization issues.
