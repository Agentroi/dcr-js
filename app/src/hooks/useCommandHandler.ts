/**
 * DCR function execution. Mutations apply directly; keep/revert is handled
 * post-turn by the backend review (revert restores the graph via load_graph).
 */

import type DCRModeler from "modeler";
import { moddleToDCR, layoutGraph } from "dcr-engine";

export interface FunctionCall {
  id: string;
  action: string;
  params: Record<string, unknown>;
}

export interface FunctionResult {
  id: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export type ChangeType = "add" | "remove" | "modify";

/** An event log the user attached in the chat. Content stays in the browser. */
export interface AttachedLog {
  name: string;
  content: string;
}

export function createDCRFunctions(
  modeler: DCRModeler | null,
  getAttachedLog?: () => AttachedLog | null,
) {
  // Track preview elements by ID (not reference, since importXML recreates elements)
  if (!modeler) {
    return {
      execute: async (_call: FunctionCall): Promise<FunctionResult> => ({
        id: _call.id,
        success: false,
        message: "Modeler not initialized",
      }),
      runAutoLayout: async () => {},
      getState: () => null,
      clearModel: async () => {},
    };
  }

  const modeling = modeler.get("modeling") as {
    createShape: (shape: unknown, position: { x: number; y: number }, parent: unknown) => unknown;
    createConnection: (source: unknown, target: unknown, connection: unknown, parent: unknown) => unknown;
    removeElements: (elements: unknown[]) => void;
    updateProperties: (element: unknown, properties: Record<string, unknown>) => void;
    updateLabel: (element: unknown, newLabel: string) => void;
  };
  const elementRegistry = modeler.get("elementRegistry") as {
    _elements: Record<string, { element: unknown }>;
    getGraphics: (element: unknown) => SVGElement | null;
  };
  const elementFactory = modeler.get("elementFactory") as {
    createOdElement: (type: string, attrs: Record<string, unknown>) => unknown;
  };
  const canvas = modeler.get("canvas") as {
    getRootElement: () => unknown;
    viewbox: () => { x: number; y: number; width: number; height: number };
  };

  // Get current graph state including roles
  const getState = () => {
    try {
      const graph = moddleToDCR(elementRegistry, true) as {
        events: Set<string>;
        conditionsFor: Record<string, Set<string>>;
        responseTo: Record<string, Set<string>>;
        includesTo: Record<string, Set<string>>;
        excludesTo: Record<string, Set<string>>;
        milestonesFor: Record<string, Set<string>>;
        marking: { executed: Set<string>; included: Set<string>; pending: Set<string> };
        roles: Set<string>;
        roleMap: Record<string, string>;
      };

      return {
        events: Array.from(graph.events),
        conditionsFor: mapToRecord(graph.conditionsFor),
        responseTo: mapToRecord(graph.responseTo),
        includesTo: mapToRecord(graph.includesTo),
        excludesTo: mapToRecord(graph.excludesTo),
        milestonesFor: mapToRecord(graph.milestonesFor),
        marking: {
          executed: Array.from(graph.marking.executed),
          included: Array.from(graph.marking.included),
          pending: Array.from(graph.marking.pending),
        },
        roles: Array.from(graph.roles || []),
        roleAssignments: graph.roleMap || {},
      };
    } catch (e) {
      console.error("getState error:", e);
      return null;
    }
  };

  // Find element by activity name (description)
  const findByName = (name: string): unknown | null => {
    for (const entry of Object.values(elementRegistry._elements)) {
      const el = entry.element as { businessObject?: { description?: string } };
      if (el.businessObject?.description === name) {
        return entry.element;
      }
    }
    return null;
  };

  // Find relation
  const findRelation = (source: string, target: string, type: string): unknown | null => {
    for (const entry of Object.values(elementRegistry._elements)) {
      const el = entry.element as {
        type?: string;
        businessObject?: {
          type?: string;
          sourceRef?: { description?: string };
          targetRef?: { description?: string };
        };
      };
      if (el.type === "dcr:Relation") {
        const bo = el.businessObject;
        if (bo?.type === type && bo?.sourceRef?.description === source && bo?.targetRef?.description === target) {
          return entry.element;
        }
      }
    }
    return null;
  };

  // Execute a function call (applies directly; keep/revert happens post-turn).
  const executeCore = async (
    call: FunctionCall,
  ): Promise<FunctionResult & { element?: unknown; type?: ChangeType }> => {
    const { id, action, params } = call;

    try {
      switch (action) {
        case "add_event": {
          const name = params.name as string;
          const role = (params.role as string) || "";
          const included = params.included !== false;
          const pending = params.pending === true;
          const executed = params.executed === true;

          if (findByName(name)) {
            return { id, success: false, message: `Event "${name}" already exists` };
          }

          const shape = elementFactory.createOdElement("shape", {
            type: "dcr:Event",
            attrs: { description: name, role, included, pending, executed },
          });

          const viewbox = canvas.viewbox();
          const position = {
            x: viewbox.x + viewbox.width / 2 + (Math.random() - 0.5) * 100,
            y: viewbox.y + viewbox.height / 2 + (Math.random() - 0.5) * 100,
          };

          const created = modeling.createShape(shape, position, canvas.getRootElement());
          return { id, success: true, message: `Added "${name}"`, element: created, type: "add" };
        }

        case "remove_event": {
          const name = params.name as string;
          const element = findByName(name);
          if (!element) {
            return { id, success: false, message: `Event "${name}" not found` };
          }
          modeling.removeElements([element]);
          return { id, success: true, message: `Removed "${name}"` };
        }

        case "update_event": {
          const name = params.name as string;
          const newName = params.new_name as string | undefined;
          const role = params.role as string | undefined;
          const element = findByName(name);
          if (!element) {
            return { id, success: false, message: `Event "${name}" not found` };
          }
          if (newName) {
            modeling.updateLabel(element, newName);
          }
          if (role !== undefined) {
            modeling.updateProperties(element, { role });
          }
          return { id, success: true, message: `Updated "${name}"`, element, type: "modify" };
        }

        case "add_relation": {
          const sourceName = params.source as string;
          const targetName = params.target as string;
          const relationType = params.relation_type as string;

          const source = findByName(sourceName);
          const target = findByName(targetName);
          if (!source) return { id, success: false, message: `Source "${sourceName}" not found` };
          if (!target) return { id, success: false, message: `Target "${targetName}" not found` };

          if (findRelation(sourceName, targetName, relationType)) {
            return { id, success: false, message: `Relation already exists` };
          }

          const conn = elementFactory.createOdElement("connection", {
            type: "dcr:Relation",
            attrs: { type: relationType },
          });

          const created = modeling.createConnection(source, target, conn, canvas.getRootElement());
          return { id, success: true, message: `Added ${relationType} relation`, element: created, type: "add" };
        }

        case "remove_relation": {
          const sourceName = params.source as string;
          const targetName = params.target as string;
          const relationType = params.relation_type as string;

          const relation = findRelation(sourceName, targetName, relationType);
          if (!relation) return { id, success: false, message: `Relation not found` };

          modeling.removeElements([relation]);
          return { id, success: true, message: `Removed relation` };
        }

        case "set_event_marking": {
          const eventName = params.event as string;
          const element = findByName(eventName);
          if (!element) return { id, success: false, message: `Event "${eventName}" not found` };

          const updates: Record<string, boolean> = {};
          if (params.included !== undefined) updates.included = params.included as boolean;
          if (params.pending !== undefined) updates.pending = params.pending as boolean;
          if (params.executed !== undefined) updates.executed = params.executed as boolean;

          modeling.updateProperties(element, updates);
          return { id, success: true, message: `Updated marking for "${eventName}"`, element, type: "modify" };
        }

        case "assign_role": {
          const eventName = params.event as string;
          const role = params.role as string;
          const element = findByName(eventName);
          if (!element) return { id, success: false, message: `Event "${eventName}" not found` };

          modeling.updateProperties(element, { role });
          return { id, success: true, message: `Assigned role "${role}"`, element, type: "modify" };
        }

        case "add_role":
          // Roles don't need explicit creation in dcr-js - they're just strings on events
          return { id, success: true, message: `Role "${params.name}" noted` };

        case "remove_role": {
          // Remove role from all events that have it
          const roleName = params.name as string;
          let count = 0;
          for (const entry of Object.values(elementRegistry._elements)) {
            const el = entry.element as { type?: string; businessObject?: { role?: string } };
            if (el.type === "dcr:Event" && el.businessObject?.role === roleName) {
              modeling.updateProperties(entry.element, { role: "" });
              count++;
            }
          }
          return { id, success: true, message: `Removed role "${roleName}" from ${count} events` };
        }

        case "unassign_role": {
          const eventName = params.event as string;
          const element = findByName(eventName);
          if (!element) return { id, success: false, message: `Event "${eventName}" not found` };
          modeling.updateProperties(element, { role: "" });
          return { id, success: true, message: `Unassigned role from "${eventName}"`, element, type: "modify" };
        }

        case "execute_event": {
          const eventName = params.event as string;
          const element = findByName(eventName);
          if (!element) return { id, success: false, message: `Event "${eventName}" not found` };

          try {
            const { execute: execFn, isEnabled: isEnabledFn } = await import("dcr-engine");
            const graph = moddleToDCR(elementRegistry, true);
            const typedGraph = graph as Parameters<typeof execFn>[1];

            if (!isEnabledFn(eventName, typedGraph)) {
              return { id, success: false, message: `Event "${eventName}" is not enabled` };
            }

            execFn(eventName, typedGraph);

            // Sync marking back to modeler for all events
            for (const entry of Object.values(elementRegistry._elements)) {
              const el = entry.element as { type?: string; businessObject?: { description?: string } };
              if (el.type !== "dcr:Event" || !el.businessObject?.description) continue;
              const name = el.businessObject.description;
              modeling.updateProperties(entry.element, {
                executed: typedGraph.marking.executed.has(name),
                pending: typedGraph.marking.pending.has(name),
                included: typedGraph.marking.included.has(name),
              });
            }

            return { id, success: true, message: `Executed "${eventName}"`, element, type: "modify" };
          } catch (e) {
            return { id, success: false, message: `Execute failed: ${e}` };
          }
        }

        case "clear_graph": {
          // Remove all events (relations are removed automatically)
          const allElements = Object.values(elementRegistry._elements)
            .map(entry => entry.element)
            .filter(el => (el as { type?: string }).type === "dcr:Event" || (el as { type?: string }).type === "dcr:Relation");
          if (allElements.length > 0) {
            modeling.removeElements(allElements);
          }
          return { id, success: true, message: `Cleared model (${allElements.length} elements removed)` };
        }

        case "get_model":
        case "get_state":
          return { id, success: true, message: "State retrieved", data: getState() || {} };

        case "get_events": {
          const state = getState();
          return { id, success: true, message: `${state?.events?.length || 0} events`, data: { events: state?.events || [] } };
        }

        case "get_relations": {
          const state = getState();
          const relations = {
            conditionsFor: state?.conditionsFor || {},
            responseTo: state?.responseTo || {},
            includesTo: state?.includesTo || {},
            excludesTo: state?.excludesTo || {},
            milestonesFor: state?.milestonesFor || {},
          };
          return { id, success: true, message: "Relations retrieved", data: relations };
        }

        case "get_roles": {
          const state = getState();
          return { id, success: true, message: `${state?.roles?.length || 0} roles`, data: { roles: state?.roles || [], assignments: state?.roleAssignments || {} } };
        }

        case "is_enabled": {
          // Check if event is enabled using dcr-engine
          const eventName = params.event as string;
          try {
            const { isEnabled } = await import("dcr-engine");
            const graph = moddleToDCR(elementRegistry, true);
            const enabled = isEnabled(eventName, graph as Parameters<typeof isEnabled>[1]);
            return { id, success: true, message: enabled ? `"${eventName}" is enabled` : `"${eventName}" is NOT enabled`, data: { enabled } };
          } catch (e) {
            return { id, success: false, message: `Could not check: ${e}` };
          }
        }

        case "get_enabled": {
          // dcr-engine has no getEnabled helper; filter the graph's events by
          // isEnabled (same call shape as the simulate path).
          try {
            const { isEnabled: isEnabledFn } = await import("dcr-engine");
            const graph = moddleToDCR(elementRegistry, true);
            const typedGraph = graph as Parameters<typeof isEnabledFn>[1];
            const enabledArray = Array.from(typedGraph.events).filter((e) => isEnabledFn(e, typedGraph));
            return { id, success: true, message: `${enabledArray.length} events enabled`, data: { enabled: enabledArray } };
          } catch (e) {
            return { id, success: false, message: `Could not get enabled: ${e}` };
          }
        }

        case "is_accepting": {
          // Check if model is in accepting state using dcr-engine
          try {
            const { isAccepting } = await import("dcr-engine");
            const graph = moddleToDCR(elementRegistry, true);
            const accepting = isAccepting(graph as Parameters<typeof isAccepting>[0]);
            return { id, success: true, message: accepting ? "Model is accepting" : "Model is NOT accepting", data: { accepting } };
          } catch (e) {
            return { id, success: false, message: `Could not check: ${e}` };
          }
        }

        case "export_xml": {
          const result = await (modeler as unknown as { saveXML: (opts: { format: boolean }) => Promise<{ xml: string }> }).saveXML({ format: true });
          return { id, success: true, message: "Exported", data: { xml: result.xml } };
        }

        case "simulate": {
          const trace = params.trace as string[];
          if (!trace || !Array.isArray(trace)) {
            return { id, success: false, message: "simulate requires a 'trace' parameter (array of event names)" };
          }
          try {
            const { execute: execFn, isEnabled: isEnabledFn, copyMarking, isAccepting: isAccFn } = await import("dcr-engine");
            const graph = moddleToDCR(elementRegistry, true);
            const typedGraph = graph as Parameters<typeof execFn>[1];

            const savedMarking = copyMarking(typedGraph.marking);
            const results: Array<{ event: string; enabled: boolean }> = [];

            for (const eventName of trace) {
              const enabled = isEnabledFn(eventName, typedGraph);
              results.push({ event: eventName, enabled });
              if (enabled) {
                execFn(eventName, typedGraph);
              }
            }

            const accepting = isAccFn(typedGraph);

            // Restore marking
            typedGraph.marking.executed = savedMarking.executed;
            typedGraph.marking.pending = savedMarking.pending;
            typedGraph.marking.included = savedMarking.included;

            return {
              id, success: true,
              message: `Simulated ${trace.length} events. Accepting: ${accepting}`,
              data: { results, accepting },
            };
          } catch (e) {
            return { id, success: false, message: `Simulate failed: ${e}` };
          }
        }

        case "reset_marking": {
          // Reset all events to initial marking (included, not executed, not pending)
          for (const entry of Object.values(elementRegistry._elements)) {
            const el = entry.element as { type?: string };
            if (el.type !== "dcr:Event") continue;
            modeling.updateProperties(entry.element, {
              executed: false,
              pending: false,
              included: true,
            });
          }
          return { id, success: true, message: "Marking reset to initial state" };
        }

        case "generate": {
          // Generate traces from the current model via dcr-engine playout, and
          // offer the result as an XES download (file stays browser-side).
          try {
            const { generateEventLog, writeEventLog } = await import("dcr-engine");
            const count = (params.count as number) ?? 10;
            const maxLength = (params.max_length as number) ?? 50;
            const graph = moddleToDCR(elementRegistry, true) as Parameters<typeof generateEventLog>[0];
            const log = generateEventLog(graph, count, 1, maxLength, 0);
            const traces = Object.values(log.traces).map((t) => t.map((e) => e.activity));
            try {
              const { saveAs } = await import("file-saver");
              saveAs(new Blob([writeEventLog(log)]), "generated_log.xes");
            } catch (e) {
              console.warn("Could not serialize/download generated log:", e);
            }
            return { id, success: true, message: `Generated ${traces.length} traces`, data: { traces } };
          } catch (e) {
            return { id, success: false, message: `Generate failed: ${e}` };
          }
        }

        case "discover": {
          // Mine a model from the attached event log and import it into the modeler.
          const attached = getAttachedLog?.();
          if (!attached) {
            return { id, success: false, message: "No event log attached. Attach a .xes file in the chat first." };
          }
          try {
            const { parseNonRoleLog, abstractLog, mineFromAbstraction, layoutGraph: layout } = await import("dcr-engine");
            const eventLog = parseNonRoleLog(attached.content);
            const logAbs = abstractLog(eventLog);
            const graph = mineFromAbstraction(logAbs, {
              findAdditionalConditions: (params.find_additional_conditions as boolean) ?? true,
              findAdditionalResponses: false,
              skipRecomputingConditions: false,
              skipRecomputingResponses: false,
              optimize: true,
              findInitiallyPending: false,
            });
            // Discovery applies live like any other mutation; the turn-end
            // review handles keep/revert (revert is backend-driven via load_graph).
            const xml = await layout(graph);
            await (modeler as unknown as { importXML: (xml: string) => Promise<void> }).importXML(xml);
            const model = getState();
            return {
              id, success: true,
              message: `Discovered model from ${attached.name} (${model?.events.length ?? 0} events)`,
              data: { graph: model },
            };
          } catch (e) {
            return { id, success: false, message: `Discovery failed: ${e}` };
          }
        }

        case "conformance": {
          // Replay each trace of the attached log against the current model.
          const attached = getAttachedLog?.();
          if (!attached) {
            return { id, success: false, message: "No event log attached. Attach a .xes file in the chat first." };
          }
          try {
            const { parseRoleLog, replayTraceS, copyMarking } = await import("dcr-engine");
            const graph = moddleToDCR(elementRegistry, true) as Parameters<typeof replayTraceS>[0];
            const eventLog = parseRoleLog(attached.content);
            const initMarking = copyMarking(graph.marking);
            const detailed = (params.detailed as boolean) ?? false;
            const traceEntries = Object.entries(eventLog.traces);
            let fitting = 0;
            const violations: Array<Record<string, unknown>> = [];
            for (const [traceId, trace] of traceEntries) {
              graph.marking = copyMarking(initMarking);
              if (replayTraceS(graph, trace)) {
                fitting++;
              } else if (detailed) {
                violations.push({ failed_at: traceId, reason: "trace not replayable against the model" });
              }
            }
            const total = traceEntries.length;
            const fitness = total ? fitting / total : 0;
            return {
              id, success: true,
              message: `${fitting}/${total} traces fit (${Math.round(fitness * 100)}%)`,
              data: { fitness, fitting_traces: fitting, total_traces: total, violations },
            };
          } catch (e) {
            return { id, success: false, message: `Conformance failed: ${e}` };
          }
        }

        case "load_graph": {
          // Replace the entire model with a given one (events + relations), laid
          // out. Used to restore a snapshot (edit/undo) or revert a preview.
          if (!modeler) {
            return { id, success: false, message: "No modeler available." };
          }
          const model = params.graph as {
            events?: Array<{ name: string; included?: boolean; pending?: boolean; executed?: boolean }>;
            relations?: Array<{ source: string; target: string; type: string }>;
          } | null;
          const events = model?.events ?? [];
          try {
            if (events.length === 0) {
              // Empty snapshot → clear the canvas.
              const all = Object.values(elementRegistry._elements)
                .map(e => e.element)
                .filter(el => {
                  const t = (el as { type?: string }).type;
                  return t === "dcr:Event" || t === "dcr:Relation";
                });
              if (all.length > 0) modeling.removeElements(all);
              return { id, success: true, message: "Loaded empty model" };
            }
            const { layoutGraph: layout } = await import("dcr-engine");
            const addTo = (m: Record<string, Set<string>>, k: string, v: string) => {
              (m[k] ??= new Set<string>()).add(v);
            };
            const conditionsFor: Record<string, Set<string>> = {};
            const milestonesFor: Record<string, Set<string>> = {};
            const responseTo: Record<string, Set<string>> = {};
            const includesTo: Record<string, Set<string>> = {};
            const excludesTo: Record<string, Set<string>> = {};
            for (const r of model?.relations ?? []) {
              switch (r.type) {
                case "condition": addTo(conditionsFor, r.target, r.source); break;
                case "milestone": addTo(milestonesFor, r.target, r.source); break;
                case "response": addTo(responseTo, r.source, r.target); break;
                case "include": addTo(includesTo, r.source, r.target); break;
                case "exclude": addTo(excludesTo, r.source, r.target); break;
                // noresponse has no dcr-engine DCRGraph field — skip.
              }
            }
            const graph = {
              events: new Set(events.map(e => e.name)),
              conditionsFor, milestonesFor, responseTo, includesTo, excludesTo,
              marking: {
                executed: new Set(events.filter(e => e.executed).map(e => e.name)),
                included: new Set(events.filter(e => e.included !== false).map(e => e.name)),
                pending: new Set(events.filter(e => e.pending).map(e => e.name)),
              },
            };
            const xml = await layout(graph as Parameters<typeof layout>[0]);
            await (modeler as unknown as { importXML: (xml: string) => Promise<void> }).importXML(xml);
            return { id, success: true, message: `Loaded model (${events.length} events)` };
          } catch (e) {
            return { id, success: false, message: `Load model failed: ${e}` };
          }
        }

        case "add_time_constraint":
        case "remove_time_constraint":
        case "get_time_constraints":
          return { id, success: false, message: "Time constraints not supported in dcr-js" };

        default:
          return { id, success: false, message: `Unknown action: ${action}` };
      }
    } catch (e) {
      console.error(`Error executing ${action}:`, e);
      return { id, success: false, message: `Error: ${e instanceof Error ? e.message : String(e)}` };
    }
  };

  // Execute a function call (applies directly).
  const execute = async (call: FunctionCall): Promise<FunctionResult> => {
    const result = await executeCore(call);
    return { id: result.id, success: result.success, message: result.message, data: result.data };
  };

  // Auto-layout. layoutGraph can't lay out subprocesses (those need ELK nestings),
  // so we still skip when any are present. Roles, however, are just a label on an
  // event and have NO effect on positioning — but layoutGraph's output XML doesn't
  // write the role attribute back, so re-importing it would strip every role. We
  // therefore snapshot name->role before layout and re-apply it after importXML.
  const runAutoLayout = async () => {
    try {
      const hasSubprocesses = Object.keys(elementRegistry._elements).some(
        (key) => key.includes("SubProcess")
      );
      if (hasSubprocesses) {
        console.log("Skipping auto-layout: subprocesses present (layoutGraph can't position them)");
        return;
      }

      // Snapshot roles by event name (description), since layout XML drops them.
      const roleByName: Record<string, string> = {};
      for (const key of Object.keys(elementRegistry._elements)) {
        const el = elementRegistry._elements[key]?.element as
          | { type?: string; businessObject?: { description?: string; role?: string } }
          | undefined;
        const bo = el?.businessObject;
        if (el?.type === "dcr:Event" && bo?.description && bo.role) {
          roleByName[bo.description] = bo.role;
        }
      }

      const graph = moddleToDCR(elementRegistry, true);
      const xml = await layoutGraph(graph as Parameters<typeof layoutGraph>[0], undefined);
      await (modeler as unknown as { importXML: (xml: string) => Promise<void> }).importXML(xml);

      // Re-apply the roles the layout pass stripped (match by event name).
      if (Object.keys(roleByName).length > 0) {
        for (const key of Object.keys(elementRegistry._elements)) {
          const el = elementRegistry._elements[key]?.element as
            | { type?: string; businessObject?: { description?: string } }
            | undefined;
          const name = el?.businessObject?.description;
          if (el?.type === "dcr:Event" && name && roleByName[name]) {
            modeling.updateProperties(el, { role: roleByName[name] });
          }
        }
      }
    } catch (e) {
      console.error("Auto-layout failed:", e);
    }
  };

  // Clear all elements from the canvas
  const clearModel = async () => {
    try {
      const allElements = Object.values(elementRegistry._elements)
        .map((entry) => (entry as { element?: unknown }).element)
        .filter((el): el is NonNullable<typeof el> => el != null && typeof el === "object" && "id" in el);

      // Filter to only DCR elements (events, relations, roles, etc.)
      const dcrElements = allElements.filter((el) => {
        const type = (el as { type?: string }).type || "";
        return type.startsWith("dcr:") && type !== "dcr:Definitions";
      });

      if (dcrElements.length > 0) {
        modeling.removeElements(dcrElements);
      }
    } catch (e) {
      console.error("Clear model failed:", e);
    }
  };

  return { execute, runAutoLayout, getState, clearModel };
}

function mapToRecord(map: Record<string, Set<string>>): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(map)) {
    if (value && value.size > 0) {
      result[key] = Array.from(value);
    }
  }
  return result;
}
