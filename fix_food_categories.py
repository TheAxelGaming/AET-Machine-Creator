import json
import os

items_path = "public/items.json"
with open(items_path, "r", encoding="utf-8") as f:
    items = json.load(f)

food_keywords = [
    "Canned", "Soup", "Drink", "Water", "Soda", "Pop", "Beer", "Wine", "Juice", "Milk", 
    "Cheese", "Bread", "Burger", "Pizza", "Cake", "Pie", "Candy", "Chocolate", "Chips", 
    "Crisps", "Fish", "Salmon", "Tuna", "Sardines", "Beans", "Peas", "Corn", "Potato", 
    "Tomato", "Apple", "Banana", "Orange", "Strawberry", "Berry", "Mushroom", "Egg", 
    "Butter", "Cereal", "Pasta", "Rice", "Flour", "Sugar", "Salt", "Pepper", "Coffee", 
    "Tea", "Honey", "Peanut", "Jam", "Jelly", "Sauce", "Ketchup", "Mustard", "Mayo", 
    "Vinegar", "Oil", "Yogurt", "IceCream", "Popsicle", "Beef", "Meat", "Steak", "Pork",
    "Chicken", "Mutton", "Bacon", "Sausage", "Ham", "Dog Food", "Cat Food", "Oats"
]

fixed_count = 0
for item in items:
    # Si la categoria es General o None, revisemos si es comida
    if item.get("category") in ["General", None, ""]:
        name = item.get("name", "").lower()
        if any(keyword.lower() in name.split() or keyword.lower() in name for keyword in food_keywords):
            item["category"] = "Food"
            fixed_count += 1

with open(items_path, "w", encoding="utf-8") as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

print(f"Fixed {fixed_count} items to be 'Food'.")
