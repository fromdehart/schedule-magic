-- Add sample meal data for user mdehart1@gmail.com
-- First, get the user ID
DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Get the user ID for mdehart1@gmail.com
    SELECT id INTO user_id FROM auth.users WHERE email = 'mdehart1@gmail.com';
    
    IF user_id IS NOT NULL THEN
        -- Insert sample meal plan data
        INSERT INTO meal_plans (user_id, week_start, plan_data, created_at, updated_at)
        VALUES (
            user_id,
            '2025-01-27', -- Current week start (Sunday)
            '{
                "Sunday": {
                    "mainMeal": {
                        "id": "1",
                        "title": "Herb-Crusted Salmon with Quinoa",
                        "image": "https://images.pexels.com/photos/3622643/pexels-photo-3622643.jpeg?auto=compress&cs=tinysrgb&w=800",
                        "hasKidsMeal": true,
                        "type": "meal",
                        "kidsMeal": {
                            "id": "kids-1",
                            "title": "Fish Sticks & Sweet Potato Fries",
                            "image": "https://images.pexels.com/photos/4518844/pexels-photo-4518844.jpeg?auto=compress&cs=tinysrgb&w=600",
                            "type": "meal"
                        }
                    },
                    "kidsMeal": {
                        "id": "kids-1",
                        "title": "Fish Sticks & Sweet Potato Fries",
                        "image": "https://images.pexels.com/photos/4518844/pexels-photo-4518844.jpeg?auto=compress&cs=tinysrgb&w=600",
                        "type": "meal"
                    }
                },
                "Monday": {
                    "mainMeal": {
                        "id": "2",
                        "title": "Mediterranean Chicken Bowl",
                        "image": "https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=800",
                        "hasKidsMeal": true,
                        "type": "meal",
                        "kidsMeal": {
                            "id": "kids-2",
                            "title": "Chicken Nuggets & Rice",
                            "image": "https://images.pexels.com/photos/4518844/pexels-photo-4518844.jpeg?auto=compress&cs=tinysrgb&w=600",
                            "type": "meal"
                        }
                    },
                    "kidsMeal": {
                        "id": "kids-2",
                        "title": "Chicken Nuggets & Rice",
                        "image": "https://images.pexels.com/photos/4518844/pexels-photo-4518844.jpeg?auto=compress&cs=tinysrgb&w=600",
                        "type": "meal"
                    }
                },
                "Tuesday": {
                    "mainMeal": {
                        "id": "3",
                        "title": "Creamy Mushroom Risotto",
                        "image": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
                        "type": "meal"
                    },
                    "kidsMeal": null
                },
                "Wednesday": {
                    "mainMeal": null,
                    "kidsMeal": null
                },
                "Thursday": {
                    "mainMeal": null,
                    "kidsMeal": null
                },
                "Friday": {
                    "mainMeal": null,
                    "kidsMeal": null
                },
                "Saturday": {
                    "mainMeal": null,
                    "kidsMeal": null
                }
            }'::jsonb,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, week_start) 
        DO UPDATE SET 
            plan_data = EXCLUDED.plan_data,
            updated_at = NOW();
        
        RAISE NOTICE 'Sample meal data added for user %', user_id;
    ELSE
        RAISE NOTICE 'User mdehart1@gmail.com not found';
    END IF;
END $$;
