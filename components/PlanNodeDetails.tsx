import { Lightbulb, Sigma, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedPlan, PlanNode } from "@/lib/planParser";

function nodeTips(node: PlanNode): string[] {
  const tips: string[] = [];

  if (node.type.includes("Seq Scan")) {
    tips.push(
      "Sequential scans are efficient on small tables, but become expensive on large tables. Add or refine indexes on filtered columns if this node dominates cost."
    );
  }

  if (node.type.includes("Index Scan") || node.type.includes("Bitmap")) {
    tips.push(
      "Index access is being used. Confirm that index selectivity is still high enough as data grows and avoid broad wildcard predicates that force rechecks."
    );
  }

  if (node.type.includes("Nested Loop")) {
    tips.push(
      "Nested loops can explode in cost with large inner relations. Verify join order and make sure the inner side has a selective index."
    );
  }

  if (node.type.includes("Hash Join")) {
    tips.push(
      "Hash joins are usually good for medium-large sets. Check whether statistics are fresh so the planner allocates hash memory correctly."
    );
  }

  if (node.type.includes("Sort")) {
    tips.push(
      "Sort nodes can spill to disk. Reduce sorted rows with earlier filters or add indexes that satisfy the ORDER BY clause."
    );
  }

  if (node.type.includes("Aggregate")) {
    tips.push(
      "Aggregates often improve when pre-filtering rows or by indexing GROUP BY keys used upstream in joins."
    );
  }

  if (tips.length === 0) {
    tips.push(
      "Review this node in context with its parent and children. Focus optimization where estimated rows diverge from reality and where total cost is concentrated."
    );
  }

  return tips;
}

export function PlanNodeDetails({
  node,
  plan
}: {
  node: PlanNode | null;
  plan: ParsedPlan | null;
}) {
  if (!node || !plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Node details</CardTitle>
          <CardDescription>Select a node in the plan graph to inspect its details.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tips = nodeTips(node);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{node.type}</CardTitle>
        <CardDescription>
          Depth {node.depth} of {plan.summary.maxDepth} • {node.children.length} child
          {node.children.length === 1 ? "" : "ren"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent">Cost {node.totalCost.toFixed(2)}</Badge>
          <Badge variant="default">Rows {node.planRows.toLocaleString()}</Badge>
          {node.actualRows !== undefined ? (
            <Badge variant="success">Actual {node.actualRows.toLocaleString()}</Badge>
          ) : null}
        </div>

        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-[#0b1220] p-3">
            <p className="mb-1 flex items-center gap-2 font-semibold text-slate-200">
              <Sigma className="h-4 w-4 text-sky-300" />
              Planner metrics
            </p>
            <p>Startup cost: {node.startupCost.toFixed(2)}</p>
            <p>Total cost: {node.totalCost.toFixed(2)}</p>
            <p>Plan rows: {node.planRows.toLocaleString()}</p>
            <p>Row width: {node.planWidth.toLocaleString()} bytes</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0b1220] p-3">
            <p className="mb-1 flex items-center gap-2 font-semibold text-slate-200">
              <Table2 className="h-4 w-4 text-sky-300" />
              Relation context
            </p>
            <p>Relation: {node.relationName ?? "N/A"}</p>
            <p>Index: {node.indexName ?? "N/A"}</p>
            <p>Join type: {node.joinType ?? "N/A"}</p>
            <p>Parallel aware: {node.parallelAware ? "Yes" : "No"}</p>
          </div>
        </div>

        {node.filter ? (
          <div className="rounded-lg border border-slate-800 bg-[#0b1220] p-3 text-sm">
            <p className="font-semibold text-slate-200">Filter predicate</p>
            <p className="mt-1 break-words font-mono text-xs text-slate-300">{node.filter}</p>
          </div>
        ) : null}

        <div className="space-y-2 rounded-lg border border-slate-800 bg-[#0b1220] p-3 text-sm text-slate-300">
          <p className="flex items-center gap-2 font-semibold text-slate-200">
            <Lightbulb className="h-4 w-4 text-amber-300" />
            Optimization guidance
          </p>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
