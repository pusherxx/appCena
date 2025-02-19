import { pgTable, text, serial, integer, boolean, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  preferences: jsonb("preferences").$type<{
    dietaryRestrictions: string[];
    peopleCount: number;
    allergies: string[];
  }>(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ingredients: jsonb("ingredients").$type<{
    name: string;
    amount: number;
    unit: string;
    seasonal: boolean;
  }[]>(),
  instructions: text("instructions").notNull(),
  preparationTime: integer("preparation_time"),
  servings: integer("servings"),
  tags: text("tags").array(),
});

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),
  recipeId: integer("recipe_id").notNull(),
});

export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  items: jsonb("items").$type<{
    name: string;
    amount: number;
    unit: string;
    checked: boolean;
  }[]>(),
  weekStart: date("week_start").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRecipeSchema = createInsertSchema(recipes);
export const insertMealPlanSchema = createInsertSchema(mealPlans);
export const insertShoppingListSchema = createInsertSchema(shoppingLists);

export type User = typeof users.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
