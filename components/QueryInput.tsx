"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const querySchema = z.object({
  query: z
    .string()
    .min(15, "Enter a realistic SQL query to get a meaningful plan.")
    .max(12000, "The query is too long for this explainer.")
});

type QueryForm = z.infer<typeof querySchema>;

const sampleQueries = [
  {
    label: "Orders by customer",
    value:
      "SELECT o.id, o.created_at, SUM(oi.quantity * oi.unit_price) AS total\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nWHERE o.customer_id = 42\n  AND o.created_at >= NOW() - INTERVAL '90 days'\nGROUP BY o.id, o.created_at\nORDER BY o.created_at DESC\nLIMIT 50"
  },
  {
    label: "Users with recent activity",
    value:
      "WITH recent_sessions AS (\n  SELECT user_id, MAX(last_seen_at) AS last_seen\n  FROM sessions\n  WHERE last_seen_at >= NOW() - INTERVAL '30 days'\n  GROUP BY user_id\n)\nSELECT u.id, u.email, rs.last_seen\nFROM users u\nJOIN recent_sessions rs ON rs.user_id = u.id\nWHERE u.status = 'active'\nORDER BY rs.last_seen DESC"
  },
  {
    label: "Product search",
    value:
      "SELECT p.id, p.name, p.category_id\nFROM products p\nWHERE p.is_active = true\n  AND p.name ILIKE '%wireless%'\nORDER BY p.updated_at DESC\nLIMIT 25"
  }
];

export function QueryInput({
  onExplain,
  isLoading
}: {
  onExplain: (query: string) => Promise<void>;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<QueryForm>({
    resolver: zodResolver(querySchema),
    defaultValues: {
      query: sampleQueries[0].value
    }
  });

  const submit = handleSubmit(async (values) => {
    await onExplain(values.query);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Explain a PostgreSQL query</CardTitle>
        <CardDescription>
          Paste production SQL and get a visual plan graph, cardinality insights, and node-level optimization tips.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((sample) => (
            <Button
              key={sample.label}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValue("query", sample.value, { shouldValidate: true })}
            >
              {sample.label}
            </Button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Textarea
            {...register("query")}
            rows={12}
            spellCheck={false}
            placeholder="SELECT * FROM your_table WHERE ..."
            className="font-mono text-xs sm:text-sm"
          />

          {errors.query ? <p className="text-sm text-rose-300">{errors.query.message}</p> : null}

          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Generating plan..." : "Generate execution plan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
