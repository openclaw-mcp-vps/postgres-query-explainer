"use client";

import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedPlan, PlanNode } from "@/lib/planParser";

function nodeColor(nodeType: string): string {
  if (nodeType.includes("Seq Scan")) {
    return "#f97316";
  }

  if (nodeType.includes("Index")) {
    return "#22c55e";
  }

  if (nodeType.includes("Join")) {
    return "#0ea5e9";
  }

  if (nodeType.includes("Aggregate")) {
    return "#a855f7";
  }

  if (nodeType.includes("Sort")) {
    return "#facc15";
  }

  return "#94a3b8";
}

function shortLabel(node: PlanNode): string {
  if (node.relationName) {
    return `${node.type} (${node.relationName})`;
  }

  return node.type;
}

export function ExecutionPlanVisualizer({
  plan,
  selectedNodeId,
  onSelectNode
}: {
  plan: ParsedPlan | null;
  selectedNodeId?: string;
  onSelectNode: (node: PlanNode) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const dimensions = useMemo(() => {
    if (!plan) {
      return { width: 960, height: 380 };
    }

    return {
      width: Math.max(960, plan.summary.nodeCount * 160),
      height: Math.max(420, (plan.summary.maxDepth + 1) * 160)
    };
  }, [plan]);

  useEffect(() => {
    if (!svgRef.current || !plan) {
      return;
    }

    const root = d3.hierarchy(plan.root, (node) => node.children);
    const treeLayout = d3.tree<PlanNode>().nodeSize([170, 140]);
    treeLayout(root);

    const descendants = root.descendants();
    const xPositions = descendants.map((node) => node.x ?? 0);
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const centerOffset = dimensions.width / 2 - (minX + maxX) / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);

    const g = svg.append("g").attr("transform", `translate(${centerOffset}, 40)`);
    const linkGenerator = d3
      .linkVertical<d3.HierarchyPointLink<PlanNode>, d3.HierarchyPointNode<PlanNode>>()
      .x((d) => d.x ?? 0)
      .y((d) => d.y ?? 0);

    g.selectAll("path.link")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1.5)
      .attr("d", linkGenerator as unknown as string);

    const nodeGroups = g
      .selectAll("g.node")
      .data(descendants)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        onSelectNode(d.data);
      });

    nodeGroups
      .append("circle")
      .attr("r", 22)
      .attr("fill", (d) => nodeColor(d.data.type))
      .attr("stroke", (d) => (d.data.id === selectedNodeId ? "#e2e8f0" : "#0f172a"))
      .attr("stroke-width", (d) => (d.data.id === selectedNodeId ? 3 : 1.5));

    nodeGroups
      .append("text")
      .text((d) => shortLabel(d.data))
      .attr("text-anchor", "middle")
      .attr("dy", 44)
      .attr("fill", "#e2e8f0")
      .attr("font-size", 12)
      .attr("font-family", "ui-monospace, SFMono-Regular, Menlo, monospace")
      .each(function clipText(d) {
        const element = d3.select(this);
        const text = shortLabel(d.data);
        if (text.length > 28) {
          element.text(`${text.slice(0, 25)}...`);
        }
      });

    nodeGroups
      .append("text")
      .text((d) => `rows ${d.data.planRows}`)
      .attr("text-anchor", "middle")
      .attr("dy", 59)
      .attr("fill", "#94a3b8")
      .attr("font-size", 10);
  }, [plan, selectedNodeId, onSelectNode, dimensions.height, dimensions.width]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution plan graph</CardTitle>
        <CardDescription>
          Click any node to inspect costs, row estimates, and optimization guidance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-[#0b1220] p-2">
          <svg ref={svgRef} className="h-[440px] min-w-[960px]" />
        </div>
      </CardContent>
    </Card>
  );
}
