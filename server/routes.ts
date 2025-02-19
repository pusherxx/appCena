import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/recipes", async (req, res) => {
    const recipes = await storage.getRecipes();
    res.json(recipes);
  });

  app.post("/api/meal-plan/generate", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const weekStartParam = req.query.weekStart as string;
    if (!weekStartParam) {
      return res.status(400).json({ message: "weekStart query parameter is required" });
    }

    const weekStart = new Date(weekStartParam);
    if (isNaN(weekStart.getTime())) {
      return res.status(400).json({ message: "Invalid date format for weekStart" });
    }

    const recipes = await storage.getRecipes();
    if (!recipes.length) {
      return res.status(404).json({ message: "No recipes available" });
    }

    // Filter recipes based on user preferences
    const filteredRecipes = recipes.filter(recipe => {
      if (!req.user?.preferences) return true;
      if (!recipe.ingredients) return false;

      // Check dietary restrictions
      const hasRestrictedIngredient = recipe.ingredients.some(ingredient =>
        req.user!.preferences!.dietaryRestrictions.some(restriction =>
          ingredient.name.toLowerCase().includes(restriction.toLowerCase())
        )
      );

      if (hasRestrictedIngredient) return false;

      // Check allergies
      const hasAllergen = recipe.ingredients.some(ingredient =>
        req.user!.preferences!.allergies.some(allergy =>
          ingredient.name.toLowerCase().includes(allergy.toLowerCase())
        )
      );

      return !hasAllergen;
    });

    if (!filteredRecipes.length) {
      return res.status(404).json({ message: "No recipes match your dietary preferences" });
    }

    // Randomly select 7 recipes
    const selectedRecipes = [...filteredRecipes]
      .sort(() => Math.random() - 0.5)
      .slice(0, 7);

    // Create meal plan
    const mealPlan = await storage.createMealPlan(req.user.id, weekStart, selectedRecipes);

    // Generate shopping list
    const items = selectedRecipes.flatMap(recipe =>
      recipe.ingredients?.map(ingredient => ({
        name: ingredient.name,
        amount: ingredient.amount * (req.user!.preferences?.peopleCount || 1) / (recipe.servings || 1),
        unit: ingredient.unit,
        checked: false,
      })) || []
    );

    // Combine same ingredients
    const combinedItems = items.reduce((acc, item) => {
      const existing = acc.find(i => i.name === item.name && i.unit === item.unit);
      if (existing) {
        existing.amount += item.amount;
      } else {
        acc.push(item);
      }
      return acc;
    }, [] as typeof items);

    const shoppingList = await storage.createShoppingList(req.user.id, weekStart, combinedItems);

    res.json({ mealPlan, shoppingList });
  });

  app.get("/api/meal-plan", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const weekStartParam = req.query.weekStart as string;
    if (!weekStartParam) {
      return res.status(400).json({ message: "weekStart query parameter is required" });
    }

    const weekStart = new Date(weekStartParam);
    if (isNaN(weekStart.getTime())) {
      return res.status(400).json({ message: "Invalid date format for weekStart" });
    }

    const mealPlan = await storage.getMealPlan(req.user.id, weekStart);
    res.json(mealPlan);
  });

  app.get("/api/shopping-list", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const weekStartParam = req.query.weekStart as string;
    if (!weekStartParam) {
      return res.status(400).json({ message: "weekStart query parameter is required" });
    }

    const weekStart = new Date(weekStartParam);
    if (isNaN(weekStart.getTime())) {
      return res.status(400).json({ message: "Invalid date format for weekStart" });
    }

    const list = await storage.getShoppingList(req.user.id, weekStart);
    res.json(list);
  });

  app.patch("/api/shopping-list/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const list = await storage.updateShoppingList(req.body);
    res.json(list);
  });

  app.patch("/api/preferences", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const preferencesSchema = z.object({
      dietaryRestrictions: z.array(z.string()),
      peopleCount: z.number().min(1),
      allergies: z.array(z.string())
    });

    const preferences = preferencesSchema.parse(req.body);
    const user = await storage.updateUserPreferences(req.user.id, preferences);
    res.json(user);
  });

  const httpServer = createServer(app);
  return httpServer;
}