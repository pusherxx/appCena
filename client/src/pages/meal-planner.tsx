import { useQuery, useMutation } from "@tanstack/react-query";
import { Recipe, MealPlan } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Users, RefreshCw, ShoppingCart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link } from "wouter";

export default function MealPlanner() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  const { data: mealPlan } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plan", selectedDate.toISOString()],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/meal-plan?weekStart=${selectedDate.toISOString()}`
      );
      return res.json();
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!recipes?.length) {
        throw new Error("Non ci sono ricette disponibili. Aggiungi delle ricette prima di generare un piano pasti.");
      }
      const res = await apiRequest(
        "POST",
        `/api/meal-plan/generate?weekStart=${selectedDate.toISOString()}`,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
      toast({
        title: "Success",
        description: "Generated new meal plan and shopping list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Meal Plan</h1>
          <div className="flex gap-4">
            <Link href="/shopping-list">
              <Button variant="outline">
                <ShoppingCart className="h-4 w-4 mr-2" />
                View Shopping List
              </Button>
            </Link>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate New Plan
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Plan</CardTitle>
                <CardDescription>
                  Select a date to view or generate your meal plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border mb-6"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mealPlan?.map((meal) => {
                    const recipe = recipes?.find(r => r.id === meal.recipeId);
                    return (
                      <Card key={meal.id} className="border-2 border-primary/10">
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {new Date(meal.date).toLocaleDateString('it-IT', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {recipe ? (
                            <>
                              <p className="font-medium text-lg mb-2">{recipe.name}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {recipe.preparationTime} mins
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {recipe.servings} servings
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-muted-foreground">No recipe selected</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Available Recipes</CardTitle>
                <CardDescription>
                  Browse our collection of recipes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {recipes?.map((recipe) => (
                      <Card key={recipe.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{recipe.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {recipe.preparationTime} mins
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {recipe.servings} servings
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {recipe.instructions}
                            </p>
                            {recipe.tags?.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {recipe.tags.map((tag) => (
                                  <span key={tag} className="px-2 py-1 bg-primary/10 rounded-full text-xs text-primary">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}