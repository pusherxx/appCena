import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingList } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBasket } from "lucide-react";

export default function ShoppingListPage() {
  const { toast } = useToast();
  const weekStart = new Date().toISOString();

  const { data: shoppingList, isLoading, error } = useQuery<ShoppingList>({
    queryKey: ["/api/shopping-list", weekStart],
    staleTime: 30000, // 30 secondi
    refetchInterval: 30000, // 30 secondi
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/shopping-list?weekStart=${weekStart}`
      );
      const data = await res.json();
      return data;
    },
    retry: false
  });

  if (error) return <div>Errore nel caricamento della lista: {(error as Error).message}</div>;
  if (isLoading) return <div>Caricamento...</div>;
  if (!shoppingList) return <div>Nessuna lista della spesa trovata. Genera un nuovo piano pasti.</div>;

  const updateMutation = useMutation({
    mutationFn: async (list: ShoppingList) => {
      const res = await apiRequest("PATCH", `/api/shopping-list/${list.id}`, list);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
      toast({
        title: "Success",
        description: "Shopping list updated",
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

  const toggleItem = (itemName: string) => {
    if (!shoppingList) return;

    const updatedItems = shoppingList.items.map((item) =>
      item.name === itemName ? { ...item, checked: !item.checked } : item
    );

    updateMutation.mutate({
      ...shoppingList,
      items: updatedItems,
    });
  };

  const groupedItems = shoppingList?.items.reduce((groups, item) => {
    const category = item.checked ? "checked" : "unchecked";
    return {
      ...groups,
      [category]: [...(groups[category] || []), item],
    };
  }, {} as Record<string, typeof shoppingList.items>) || { unchecked: [], checked: [] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBasket className="h-6 w-6 text-primary" />
              <CardTitle>Shopping List</CardTitle>
            </div>
            <CardDescription>
              Based on your meal plan for {new Date(weekStart).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {groupedItems.unchecked.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-4">To Buy</h3>
                    <div className="space-y-2">
                      {groupedItems.unchecked.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => toggleItem(item.name)}
                          />
                          <span>
                            {item.amount} {item.unit} {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {groupedItems.checked.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium mb-4 text-muted-foreground">
                        Already Have
                      </h3>
                      <div className="space-y-2">
                        {groupedItems.checked.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center space-x-2 text-muted-foreground"
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleItem(item.name)}
                            />
                            <span className="line-through">
                              {item.amount} {item.unit} {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}