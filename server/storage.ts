import { db } from "./db";
import { eq, and, gte, lt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { 
  users, recipes, mealPlans, shoppingLists,
  type User, type Recipe, type MealPlan, type ShoppingList,
  type InsertUser
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes);
  }

  async getMealPlan(userId: number, weekStart: Date): Promise<MealPlan[]> {
    // Format dates for PostgreSQL and ensure weekStart is at midnight
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return await db.select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, userId),
          gte(mealPlans.date, start.toISOString()),
          lt(mealPlans.date, end.toISOString())
        )
      );
  }

  async createMealPlan(userId: number, weekStart: Date, recipes: Recipe[]): Promise<MealPlan[]> {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);

    const plans = recipes.map((recipe, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        userId,
        recipeId: recipe.id,
        date: date.toISOString(),
      };
    });

    return await db.insert(mealPlans)
      .values(plans)
      .returning();
  }

  async getShoppingList(userId: number, weekStart: Date): Promise<ShoppingList | undefined> {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);

    const [list] = await db.select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userId, userId),
          eq(shoppingLists.weekStart, start.toISOString())
        )
      );
    return list;
  }

  async createShoppingList(userId: number, weekStart: Date, items: ShoppingList['items']): Promise<ShoppingList> {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);

    const [list] = await db.insert(shoppingLists)
      .values({
        userId,
        weekStart: start.toISOString(),
        items,
      })
      .returning();
    return list;
  }

  async updateShoppingList(shoppingList: ShoppingList): Promise<ShoppingList> {
    const [updated] = await db
      .update(shoppingLists)
      .set(shoppingList)
      .where(eq(shoppingLists.id, shoppingList.id))
      .returning();
    return updated;
  }

  async updateUserPreferences(userId: number, preferences: User['preferences']): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ preferences })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();