export interface PlanNode {
  id: string;
  parentId: string | null;
  depth: number;
  type: string;
  relationName?: string;
  schema?: string;
  alias?: string;
  startupCost: number;
  totalCost: number;
  planRows: number;
  planWidth: number;
  actualRows?: number;
  actualTotalTime?: number;
  filter?: string;
  indexName?: string;
  joinType?: string;
  hashCondition?: string;
  mergeCondition?: string;
  recheckCondition?: string;
  sortMethod?: string;
  sortKey?: string[];
  groupKey?: string[];
  output?: string[];
  parallelAware: boolean;
  children: PlanNode[];
  raw: Record<string, unknown>;
}

export interface ParsedPlan {
  root: PlanNode;
  nodes: PlanNode[];
  summary: {
    nodeCount: number;
    maxDepth: number;
    totalCost: number;
    estimatedRows: number;
    planningTimeMs?: number;
    executionTimeMs?: number;
    relationNames: string[];
  };
  source: Record<string, unknown>;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const output = value.filter((item): item is string => typeof item === "string");
  return output.length > 0 ? output : undefined;
}

function toString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizePlanNode(
  rawNode: unknown,
  parentId: string | null,
  depth: number,
  idRef: { current: number }
): PlanNode {
  if (!rawNode || typeof rawNode !== "object") {
    throw new Error("Plan node is not an object.");
  }

  const node = rawNode as Record<string, unknown>;
  const nodeId = `node-${idRef.current++}`;

  const children = Array.isArray(node.Plans)
    ? node.Plans.map((child) => normalizePlanNode(child, nodeId, depth + 1, idRef))
    : [];

  return {
    id: nodeId,
    parentId,
    depth,
    type: toString(node["Node Type"]) ?? "Unknown",
    relationName: toString(node["Relation Name"]),
    schema: toString(node["Schema"]),
    alias: toString(node["Alias"]),
    startupCost: toNumber(node["Startup Cost"]),
    totalCost: toNumber(node["Total Cost"]),
    planRows: toNumber(node["Plan Rows"]),
    planWidth: toNumber(node["Plan Width"]),
    actualRows: node["Actual Rows"] === undefined ? undefined : toNumber(node["Actual Rows"]),
    actualTotalTime:
      node["Actual Total Time"] === undefined ? undefined : toNumber(node["Actual Total Time"]),
    filter: toString(node.Filter),
    indexName: toString(node["Index Name"]),
    joinType: toString(node["Join Type"]),
    hashCondition: toString(node["Hash Cond"]),
    mergeCondition: toString(node["Merge Cond"]),
    recheckCondition: toString(node["Recheck Cond"]),
    sortMethod: toString(node["Sort Method"]),
    sortKey: toStringArray(node["Sort Key"]),
    groupKey: toStringArray(node["Group Key"]),
    output: toStringArray(node.Output),
    parallelAware: Boolean(node["Parallel Aware"]),
    children,
    raw: node
  };
}

function flattenTree(root: PlanNode): PlanNode[] {
  const stack: PlanNode[] = [root];
  const nodes: PlanNode[] = [];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }

    nodes.push(node);

    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      stack.push(node.children[i]);
    }
  }

  return nodes;
}

function extractPlanDocument(payload: unknown): Record<string, unknown> {
  let doc: unknown = payload;

  if (typeof doc === "string") {
    doc = JSON.parse(doc);
  }

  if (Array.isArray(doc)) {
    doc = doc[0];
  }

  if (!doc || typeof doc !== "object") {
    throw new Error("Explain payload is invalid.");
  }

  return doc as Record<string, unknown>;
}

export function parseExplainPayload(payload: unknown): ParsedPlan {
  const source = extractPlanDocument(payload);

  if (!source.Plan || typeof source.Plan !== "object") {
    throw new Error("Explain payload does not contain a Plan object.");
  }

  const root = normalizePlanNode(source.Plan, null, 0, { current: 1 });
  const nodes = flattenTree(root);

  const relationNames = Array.from(
    new Set(nodes.map((node) => node.relationName).filter((name): name is string => Boolean(name)))
  ).sort((a, b) => a.localeCompare(b));

  return {
    root,
    nodes,
    summary: {
      nodeCount: nodes.length,
      maxDepth: Math.max(...nodes.map((node) => node.depth)),
      totalCost: root.totalCost,
      estimatedRows: root.planRows,
      planningTimeMs: source["Planning Time"]
        ? toNumber(source["Planning Time"])
        : undefined,
      executionTimeMs: source["Execution Time"]
        ? toNumber(source["Execution Time"])
        : undefined,
      relationNames
    },
    source
  };
}
