-- Update inventory locations to use text instead of emoji icons
UPDATE inventory_locations 
SET icon = 'Pantry' 
WHERE name = 'pantry';

UPDATE inventory_locations 
SET icon = 'Fridge' 
WHERE name = 'fridge';

UPDATE inventory_locations 
SET icon = 'Freezer' 
WHERE name = 'freezer';
