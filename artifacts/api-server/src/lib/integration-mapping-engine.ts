/**
 * Metadata-driven field mapping engine for the Integration Framework.
 *
 * A mapping template (stored as JSON in integration_mapping_templates.definition)
 * declares, per target field: where to read the value from the inbound partner
 * payload, an optional transform, and optional validation. runMappingPipeline
 * executes extraction -> transform -> assembly -> validation against a template
 * and returns the assembled target object plus a fail-collect list of errors
 * (every field is checked, not just the first failure).
 */

export type TransformSpec =
  | { type: "direct" }
  | { type: "concat"; parts: Array<{ sourcePath?: string; literal?: string }>; separator?: string }
  | { type: "split"; separator: string; index: number }
  | { type: "conditional"; operator: "eq" | "neq" | "truthy" | "falsy"; compareValue?: unknown; thenValue: unknown; elseValue: unknown }
  | { type: "lookup"; table: string; fallback?: unknown }
  | { type: "default"; value: unknown }
  | { type: "dateFormat"; outputFormat: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY" | "ISO" }
  | { type: "toEpoch" }
  | { type: "math"; expression: string }
  | { type: "const"; value: unknown }
  | { type: "upper" }
  | { type: "lower" }
  | { type: "truncate"; maxLen: number }
  | { type: "not" };

export interface ValidationSpec {
  mandatory?: boolean;
  type?: "string" | "integer" | "decimal" | "boolean" | "date" | "email" | "phone";
  format?: "email" | "e164_phone" | "iso_date" | string;
  enum?: string[];
  maxLength?: number;
  onExceed?: "truncate" | "reject";
  min?: number;
  max?: number;
}

export interface MappingFieldDef {
  id: string;
  sourcePath: string;
  targetField: string;
  transform: TransformSpec;
  validation?: ValidationSpec;
}

export interface MappingTemplateDefinition {
  entityType: string;
  fields: MappingFieldDef[];
  lookupTables?: Record<string, Record<string, string>>;
  dedupeField?: string;
}

export interface FieldError {
  fieldId: string;
  targetField: string;
  message: string;
}

export interface MappingRunResult {
  valid: boolean;
  output: Record<string, unknown>;
  errors: FieldError[];
}

const BUILTIN_FORMATS: Record<string, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  e164_phone: /^\+[1-9]\d{6,14}$/,
  iso_date: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/,
};

function getPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.replace(/^\$\.?/, "").split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.replace(/^\$\.?/, "").split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cur[key];
    if (typeof next !== "object" || next === null) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function formatDate(d: Date, fmt: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY" | "ISO"): string {
  const yyyy = d.getUTCFullYear().toString().padStart(4, "0");
  const MM = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  switch (fmt) {
    case "YYYY-MM-DD": return `${yyyy}-${MM}-${dd}`;
    case "DD/MM/YYYY": return `${dd}/${MM}/${yyyy}`;
    case "MM/DD/YYYY": return `${MM}/${dd}/${yyyy}`;
    case "ISO":
    default: return d.toISOString();
  }
}

/** Minimal recursive-descent evaluator for `+ - * / ( )` — never uses eval/Function. */
function evalSafeMath(expression: string, value: number): number | null {
  const substituted = expression.replace(/value/gi, String(value));
  const tokens = substituted.match(/\d+\.?\d*|[()+\-*/]/g);
  if (!tokens) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const rhs = parseTerm();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const rhs = parseFactor();
      v = op === "*" ? v * rhs : v / rhs;
    }
    return v;
  }
  function parseFactor(): number {
    if (peek() === "(") {
      consume();
      const v = parseExpr();
      if (peek() === ")") consume();
      return v;
    }
    if (peek() === "-") { consume(); return -parseFactor(); }
    const t = consume();
    const n = Number(t);
    if (Number.isNaN(n)) throw new Error(`Unexpected token: ${t}`);
    return n;
  }

  try {
    const result = parseExpr();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function applyTransform(
  source: unknown,
  sourceValue: unknown,
  spec: TransformSpec,
  lookupTables: Record<string, Record<string, string>>,
): unknown {
  switch (spec.type) {
    case "direct":
      return sourceValue;
    case "concat":
      return spec.parts
        .map((p) => (p.literal !== undefined ? p.literal : String(getPath(source, p.sourcePath ?? "") ?? "")))
        .join(spec.separator ?? "");
    case "split": {
      const arr = String(sourceValue ?? "").split(spec.separator);
      return arr[spec.index] ?? null;
    }
    case "conditional": {
      let matches = false;
      switch (spec.operator) {
        case "eq": matches = sourceValue === spec.compareValue; break;
        case "neq": matches = sourceValue !== spec.compareValue; break;
        case "truthy": matches = Boolean(sourceValue); break;
        case "falsy": matches = !sourceValue; break;
      }
      return matches ? spec.thenValue : spec.elseValue;
    }
    case "lookup": {
      const table = lookupTables[spec.table] ?? {};
      const key = String(sourceValue ?? "");
      return key in table ? table[key] : (spec.fallback ?? null);
    }
    case "default":
      return sourceValue === undefined || sourceValue === null || sourceValue === "" ? spec.value : sourceValue;
    case "dateFormat": {
      if (!sourceValue) return null;
      const d = new Date(sourceValue as string);
      if (Number.isNaN(d.getTime())) return null;
      return formatDate(d, spec.outputFormat);
    }
    case "toEpoch": {
      if (!sourceValue) return null;
      const d = new Date(sourceValue as string);
      if (Number.isNaN(d.getTime())) return null;
      return Math.floor(d.getTime() / 1000);
    }
    case "math": {
      const n = Number(sourceValue);
      if (Number.isNaN(n)) return null;
      return evalSafeMath(spec.expression, n);
    }
    case "const":
      return spec.value;
    case "upper":
      return sourceValue == null ? sourceValue : String(sourceValue).toUpperCase();
    case "lower":
      return sourceValue == null ? sourceValue : String(sourceValue).toLowerCase();
    case "truncate":
      return sourceValue == null ? sourceValue : String(sourceValue).slice(0, spec.maxLen);
    case "not":
      return !sourceValue;
    default:
      return sourceValue;
  }
}

function checkType(value: unknown, type: NonNullable<ValidationSpec["type"]>): boolean {
  switch (type) {
    case "string": return typeof value === "string";
    case "integer": return Number.isInteger(Number(value));
    case "decimal": return !Number.isNaN(Number(value));
    case "boolean": return typeof value === "boolean";
    case "date": return !Number.isNaN(new Date(value as string).getTime());
    case "email": return BUILTIN_FORMATS.email.test(String(value));
    case "phone": return BUILTIN_FORMATS.e164_phone.test(String(value));
    default: return true;
  }
}

function safeRegex(pattern: string): RegExp | null {
  try { return new RegExp(pattern); } catch { return null; }
}

function validateField(
  value: unknown,
  spec: ValidationSpec | undefined,
  fieldId: string,
  targetField: string,
): { value: unknown; errors: FieldError[] } {
  const errors: FieldError[] = [];
  if (!spec) return { value, errors };

  const isEmpty = value === undefined || value === null || value === "";
  if (spec.mandatory && isEmpty) {
    errors.push({ fieldId, targetField, message: `${targetField} is required` });
    return { value, errors };
  }
  if (isEmpty) return { value, errors };

  if (spec.type && !checkType(value, spec.type)) {
    errors.push({ fieldId, targetField, message: `${targetField} expected type ${spec.type}` });
  }

  if (spec.format) {
    const re = BUILTIN_FORMATS[spec.format] ?? safeRegex(spec.format);
    if (re && !re.test(String(value))) {
      errors.push({ fieldId, targetField, message: `${targetField} does not match format ${spec.format}` });
    }
  }

  if (spec.enum && !spec.enum.includes(String(value))) {
    errors.push({ fieldId, targetField, message: `${targetField} must be one of: ${spec.enum.join(", ")}` });
  }

  let outValue = value;
  if (spec.maxLength !== undefined && typeof value === "string" && value.length > spec.maxLength) {
    if (spec.onExceed === "truncate") {
      outValue = value.slice(0, spec.maxLength);
    } else {
      errors.push({ fieldId, targetField, message: `${targetField} exceeds max length ${spec.maxLength}` });
    }
  }

  if (typeof value === "number") {
    if (spec.min !== undefined && value < spec.min) errors.push({ fieldId, targetField, message: `${targetField} below minimum ${spec.min}` });
    if (spec.max !== undefined && value > spec.max) errors.push({ fieldId, targetField, message: `${targetField} above maximum ${spec.max}` });
  }

  return { value: outValue, errors };
}

export function runMappingPipeline(
  source: Record<string, unknown>,
  template: MappingTemplateDefinition,
): MappingRunResult {
  const output: Record<string, unknown> = {};
  const errors: FieldError[] = [];
  const lookupTables = template.lookupTables ?? {};

  for (const field of template.fields) {
    const sourceValue = field.sourcePath ? getPath(source, field.sourcePath) : undefined;
    let transformed: unknown;
    try {
      transformed = applyTransform(source, sourceValue, field.transform, lookupTables);
    } catch (err) {
      errors.push({ fieldId: field.id, targetField: field.targetField, message: `Transform error: ${(err as Error).message}` });
      continue;
    }
    const { value, errors: fieldErrors } = validateField(transformed, field.validation, field.id, field.targetField);
    errors.push(...fieldErrors);
    if (value !== undefined) setPath(output, field.targetField, value);
  }

  return { valid: errors.length === 0, output, errors };
}
