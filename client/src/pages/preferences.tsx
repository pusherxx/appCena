import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const preferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()),
  peopleCount: z.number().min(1).max(10),
  allergies: z.array(z.string()),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

const dietaryOptions = [
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Gluten-Free", value: "gluten-free" },
  { label: "Dairy-Free", value: "dairy-free" },
];

const allergyOptions = [
  { label: "Peanuts", value: "peanuts" },
  { label: "Tree Nuts", value: "tree-nuts" },
  { label: "Shellfish", value: "shellfish" },
  { label: "Eggs", value: "eggs" },
  { label: "Soy", value: "soy" },
];

export default function Preferences() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      dietaryRestrictions: user?.preferences?.dietaryRestrictions || [],
      peopleCount: user?.preferences?.peopleCount || 1,
      allergies: user?.preferences?.allergies || [],
    },
  });

  const preferenceMutation = useMutation({
    mutationFn: async (data: PreferencesFormData) => {
      const res = await apiRequest("PATCH", "/api/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Your preferences have been updated.",
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

  function onSubmit(data: PreferencesFormData) {
    preferenceMutation.mutate(data);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your meal planning experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="peopleCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of People</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Recipe portions will be adjusted accordingly
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dietaryRestrictions"
                  render={() => (
                    <FormItem>
                      <FormLabel>Dietary Restrictions</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        {dietaryOptions.map((option) => (
                          <FormField
                            key={option.value}
                            control={form.control}
                            name="dietaryRestrictions"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      const value = field.value || [];
                                      if (checked) {
                                        field.onChange([...value, option.value]);
                                      } else {
                                        field.onChange(
                                          value.filter((v) => v !== option.value)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allergies"
                  render={() => (
                    <FormItem>
                      <FormLabel>Allergies</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        {allergyOptions.map((option) => (
                          <FormField
                            key={option.value}
                            control={form.control}
                            name="allergies"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      const value = field.value || [];
                                      if (checked) {
                                        field.onChange([...value, option.value]);
                                      } else {
                                        field.onChange(
                                          value.filter((v) => v !== option.value)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={preferenceMutation.isPending}
                >
                  Save Preferences
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
