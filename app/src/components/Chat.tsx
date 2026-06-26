/**
 * Chat — composition shell for the dcr-assistant chat integration.
 *
 * Owns: WebSocket lifecycle, state, event dispatch.
 * Delegates rendering to sub-components in ./chat/.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  BiMessageDetail, BiX, BiSend, BiChevronDown, BiChevronUp, BiStop, BiPlus,
  BiCheckShield, BiBoltCircle, BiLockAlt, BiPlayCircle, BiReset,
} from "react-icons/bi";
import type { IconType } from "react-icons";
import type DCRModeler from "modeler";
import { createDCRFunctions, type AttachedLog } from "../hooks/useCommandHandler";
import {
  extractDocText, isSupportedDoc, DocError, DOC_ACCEPT,
  isLogFile, readLogText, LOG_ACCEPT, type AttachedDoc,
} from "../lib/attachments";
import "../styles/preview.css";

import type { Message, PlanState, PermissionLevel } from "./chat/types";
import { PERMISSION_LABELS, PERMISSION_ORDER } from "./chat/types";
import {
  ChatContainer, ResizeHandle, Header, HeaderLeft, HeaderButtons,
  Title, StatusDot, PermissionDropdown, PermissionButton, DropdownMenu, DropdownItem,
  IconButton, MinimizeIcon, ToggleButton,
  AttachmentBar, InputContainer, Input, SendButton, StopButton, AttachButton,
  DropOverlay,
} from "./chat/styles";
import MessageList from "./chat/MessageList";
import ProposalBanner from "./chat/ProposalBanner";
import PlanPanel from "./chat/PlanPanel";
import AttachmentChip from "./chat/AttachmentChip";

const BACKEND_WS_URL = import.meta.env.VITE_BACKEND_WS_URL || "ws://localhost:8000/ws";

// A distinct icon per permission level: confirm = approve each change,
// auto = apply automatically, discuss = read-only (no edits).
const PERMISSION_ICONS: Record<PermissionLevel, IconType> = {
  "confirm": BiCheckShield,
  "auto-approve": BiBoltCircle,
  "discuss": BiLockAlt,
  "simulate": BiPlayCircle,
};

interface ChatProps {
  modeler: DCRModeler | null;
}

/** A small health dot — green ok, red down, grey unknown. Sparse colour, by design. */
const Dot = ({ status }: { status?: string }) => (
  <span style={{
    width: 6, height: 6, borderRadius: "50%", flexShrink: 0, display: "inline-block",
    background: status === "ok" ? "#2d6a4f" : status === "down" ? "#c1121f" : "#bbb",
  }} />
);

const Chat = ({ modeler }: ChatProps) => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [inPreviewMode, setInPreviewMode] = useState(false);
  const [previewSummary, setPreviewSummary] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>("confirm");
  const [permissionDropdownOpen, setPermissionDropdownOpen] = useState(false);
  const [model, setModel] = useState<string | null>(null);  // the LLM answering, shown in the header
  const [availableModels, setAvailableModels] = useState<string[]>([]);  // selectable set (local only)
  const [canSelectModel, setCanSelectModel] = useState(false);  // false on a public deployment
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelHealth, setModelHealth] = useState<Record<string, { status: string; detail?: string }>>({});
  const [mirrorMode, setMirrorMode] = useState(false);  // canvas-only: the terminal drives, chat is inert

  const [size, setSize] = useState({ width: 380, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [attachedLog, setAttachedLog] = useState<AttachedLog | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const attachedLogRef = useRef<AttachedLog | null>(null);
  const attachedDocRef = useRef<AttachedDoc | null>(null);
  const dcrFunctionsRef = useRef(createDCRFunctions(modeler, () => attachedLogRef.current));
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const permissionDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const permissionLevelRef = useRef<PermissionLevel>(permissionLevel);
  const executeAllRef = useRef(false);
  const dragDepth = useRef(0);

  useEffect(() => { dcrFunctionsRef.current = createDCRFunctions(modeler, () => attachedLogRef.current); }, [modeler]);
  useEffect(() => { permissionLevelRef.current = permissionLevel; }, [permissionLevel]);
  // Entering simulate mode snapshots the current marking, so "Reset markings" goes
  // back to the model as it was when simulation began (not a blank slate).
  useEffect(() => {
    if (permissionLevel === "simulate") dcrFunctionsRef.current.snapshotMarking?.();
  }, [permissionLevel]);
  // Grow the input with its content (CSS min/max-height bound it; it scrolls past the max).
  // Only measure when there's content — measuring an empty textarea on mount (while the
  // panel is still laying out) wraps the placeholder and reports a too-tall scrollHeight.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    if (input) el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Keep focus in the message box: refocus whenever it becomes editable again (after a
  // response finishes, on connect), so the user can keep typing without clicking back in.
  useEffect(() => {
    if (!loading && connected && !inPreviewMode && !mirrorMode) inputRef.current?.focus();
  }, [loading, connected, inPreviewMode, mirrorMode]);
  useEffect(() => { attachedLogRef.current = attachedLog; }, [attachedLog]);
  useEffect(() => { attachedDocRef.current = attachedDoc; }, [attachedDoc]);

  // Close permission dropdown on click outside
  useEffect(() => {
    if (!permissionDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (permissionDropdownRef.current && !permissionDropdownRef.current.contains(e.target as Node)) {
        setPermissionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [permissionDropdownOpen]);

  // Resize handling
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSize({
        width: Math.max(320, Math.min(600, rect.right - e.clientX)),
        height: Math.max(300, Math.min(window.innerHeight * 0.8, rect.bottom - e.clientY)),
      });
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [isResizing]);

  // =========================================================================
  // WebSocket lifecycle
  // =========================================================================

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(BACKEND_WS_URL);

      ws.onopen = () => { setConnected(true); };
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
      ws.onerror = (error) => { console.error("WebSocket error:", error); };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "session_created") {
          // The CLI co-host marks the session as a read-only canvas mirror.
          setMirrorMode(!!data.mirror);

        } else if (data.type === "assistant_delta") {
          // Token streaming: append to the current streaming bubble (or start one).
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.streaming) {
              return [...prev.slice(0, -1), { ...last, content: last.content + data.content }];
            }
            return [...prev, { role: "assistant", content: data.content, streaming: true }];
          });

        } else if (data.type === "assistant_message") {
          // Finalize the streaming bubble with the authoritative text (or push a
          // whole bubble if token streaming didn't run).
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.streaming) {
              return [...prev.slice(0, -1), { role: "assistant", content: data.content }];
            }
            return [...prev, { role: "assistant", content: data.content }];
          });

        } else if (data.type === "model_info") {
          // Which model is answering, the selectable set, and whether we may switch.
          setModel(data.model);
          setAvailableModels(data.available || []);
          setCanSelectModel(!!data.can_select);
          if (data.can_select) wsRef.current?.send(JSON.stringify({ type: "request_health" }));

        } else if (data.type === "model_health") {
          setModelHealth(data.health || {});

        } else if (data.type === "tool_activity") {
          // The agent acting, live — a quiet chip in the feed.
          if (data.status === "running") {
            setMessages(prev => [...prev, { role: "tool", content: data.label }]);
          } else if (data.status === "result" && data.detail) {
            // A reasoning/verification tool's verbatim result (what it checked + why).
            setMessages(prev => [...prev, { role: "tool", content: data.label, detail: data.detail }]);
          }

        } else if (data.type === "layout") {
          // Fires after any mutating batch (agent path or plan step).
          await dcrFunctionsRef.current.runAutoLayout?.();

        } else if (data.type === "done") {
          // Turn finished (graph reached END).
          setLoading(false);

        } else if (data.type === "review") {
          // A mutating batch applied; in confirm mode, pause for keep/revert.
          setLoading(false);
          if (data.decision_required) {
            setPreviewSummary(data.summary || "Review the changes");
            setInPreviewMode(true);
          }

        } else if (data.type === "revert_graph") {
          // Backend-owned revert: rebuild the canvas to the pre-turn graph.
          await dcrFunctionsRef.current.execute({
            id: crypto.randomUUID(),
            action: "load_graph",
            params: { graph: data.graph },
          });

        } else if (data.type === "plan_updated") {
          const newPlan = data.plan as PlanState;
          setPlan(newPlan);
          if (executeAllRef.current && !newPlan.is_complete && ws.readyState === WebSocket.OPEN) {
            setLoading(true);
            ws.send(JSON.stringify({ type: "execute_plan" }));
          } else if (newPlan.is_complete) {
            executeAllRef.current = false;
          }

        } else if (data.type === "plan_cleared") {
          setPlan(null);
          executeAllRef.current = false;

        } else if (data.type === "graph_reset") {
          dcrFunctionsRef.current.clearModel?.();
          setMessages([]);
          setPlan(null);

        } else if (data.type === "permission_changed") {
          setPermissionLevel(data.level as PermissionLevel);

        } else if (data.type === "error") {
          executeAllRef.current = false;
          setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.message}` }]);
          setLoading(false);

        } else if (data.type === "cancelled") {
          executeAllRef.current = false;
          setLoading(false);

        } else if (data.type === "restore") {
          const restored = (data.messages as { role: "user" | "assistant"; content: string }[]);
          setMessages(restored);
          setPlan(null);
          executeAllRef.current = false;
          setInPreviewMode(false);
          setPreviewSummary("");
          // Rebuild the canvas to the rewound graph (edit/undo).
          if (data.graph) {
            await dcrFunctionsRef.current.execute({
              id: crypto.randomUUID(),
              action: "load_graph",
              params: { graph: data.graph },
            });
          }

        } else if (data.type === "command") {
          const result = await dcrFunctionsRef.current.execute({
            id: data.id,
            action: data.action,
            params: data.params || {},
          });
          ws.send(JSON.stringify({
            type: "command_result",
            id: data.id,
            success: result.success,
            message: result.message,
            data: result.data,
          }));
        }
      };

      wsRef.current = ws;
    };

    connect();
    return () => { wsRef.current?.close(); };
  }, []);

  // =========================================================================
  // Actions
  // =========================================================================

  const sendMessage = useCallback(() => {
    if (!input.trim() || loading || !wsRef.current || !connected || inPreviewMode) return;
    setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
    setInput("");
    setLoading(true);
    wsRef.current.send(JSON.stringify({
      type: "user_message",
      content: input.trim(),
      state: dcrFunctionsRef.current.getState(),
      attached_log: attachedLogRef.current ? { name: attachedLogRef.current.name } : null,
      // Documents are sent inline (content); the engine never sees them.
      attached_doc: attachedDocRef.current,
    }));
    setAttachedDoc(null); // one-shot: a document rides only its own message
  }, [input, loading, connected, inPreviewMode]);

  const notify = useCallback((content: string) => {
    setMessages(prev => [...prev, { role: "assistant", content }]);
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (isLogFile(file.name)) {
      // Event log → kept in the browser, fed to the engine for discovery/conformance.
      // .xes.gz is gunzipped client-side, so the 10 MB cap is on the compressed file.
      const MAX_LOG_BYTES = 10 * 1024 * 1024;
      if (file.size > MAX_LOG_BYTES) {
        notify(`Log "${file.name}" is too large (max 10 MB).`);
        return;
      }
      try {
        setAttachedLog({ name: file.name, content: await readLogText(file) });
      } catch {
        notify(`Could not read "${file.name}" (corrupt or invalid gzip?).`);
      }
      return;
    }

    if (!isSupportedDoc(file.name)) {
      notify(`Unsupported file "${file.name}". Attach an event log (.xes/.xes.gz) or a document (.txt/.md/.json/.pdf).`);
      return;
    }

    // Document → extracted text injected inline into the next message.
    try {
      setAttachedDoc(await extractDocText(file));
    } catch (err) {
      notify(err instanceof DocError ? err.message : `Could not read "${file.name}".`);
    }
  }, [notify]);

  const handleAttachFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (file) processFile(file);
  }, [processFile]);

  // Drag-and-drop: a file dragged over the panel shows a drop overlay; dropping
  // it routes through the same handling as the attach button.
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  }, []);
  const handleDragLeave = useCallback(() => {
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) { dragDepth.current = 0; setIsDragging(false); }
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !inPreviewMode) processFile(file);
  }, [processFile, inPreviewMode]);

  const handleAccept = useCallback(() => {
    // Keep this batch; the agent continues the turn from here.
    if (!wsRef.current) return;
    setInPreviewMode(false);
    setPreviewSummary("");
    setLoading(true);
    wsRef.current.send(JSON.stringify({ type: "changes_accepted" }));
  }, []);

  const handleDecline = useCallback(() => {
    // Revert this batch (backend restores the graph and pushes it back via
    // revert_graph → load_graph); the agent then reacts to the revert.
    if (!wsRef.current) return;
    setInPreviewMode(false);
    setPreviewSummary("");
    setLoading(true);
    wsRef.current.send(JSON.stringify({ type: "changes_declined" }));
  }, []);

  const handleExecuteStep = useCallback(() => {
    if (!wsRef.current || !plan || plan.is_complete || loading || inPreviewMode) return;
    setLoading(true);
    wsRef.current.send(JSON.stringify({ type: "execute_plan" }));
  }, [plan, loading, inPreviewMode]);

  const handleExecuteAll = useCallback(() => {
    if (!wsRef.current || !plan || plan.is_complete || loading || inPreviewMode) return;
    executeAllRef.current = true;
    setLoading(true);
    wsRef.current.send(JSON.stringify({ type: "execute_plan" }));
  }, [plan, loading, inPreviewMode]);

  const handleClearPlan = useCallback(() => {
    if (!wsRef.current) return;
    executeAllRef.current = false;
    wsRef.current.send(JSON.stringify({ type: "clear_plan" }));
  }, []);

  const selectPermission = useCallback((level: PermissionLevel) => {
    if (!wsRef.current) return;
    setPermissionLevel(level);
    setPermissionDropdownOpen(false);
    wsRef.current.send(JSON.stringify({ type: "set_permission", level }));
  }, []);

  const selectModel = useCallback((name: string) => {
    if (!wsRef.current || name === model) return;
    // Seamless: the backend applies it on the next turn; the model_info reply
    // confirms the active model.
    wsRef.current.send(JSON.stringify({ type: "set_model", model: name }));
  }, [model]);

  const requestHealth = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "request_health" }));
  }, []);

  const resetMarkings = useCallback(() => {
    // Simulation: put every event back to its initial marking.
    wsRef.current?.send(JSON.stringify({ type: "reset_marking" }));
  }, []);

  const handleStop = useCallback(() => {
    if (!wsRef.current) return;
    executeAllRef.current = false;
    wsRef.current.send(JSON.stringify({ type: "cancel" }));
    setLoading(false);
  }, []);

  const handleEditMessage = useCallback((userMessageIndex: number, newContent: string, displayIndex: number) => {
    if (!wsRef.current || loading || inPreviewMode) return;
    // Optimistically drop the edited message and everything after it, then show
    // the edited message — the assistant's reply to it will append. The backend
    // rewinds to the same point, so its `restore` agrees with this.
    setMessages(prev => [...prev.slice(0, displayIndex), { role: "user", content: newContent }]);
    setLoading(true);
    wsRef.current.send(JSON.stringify({
      type: "edit_message",
      message_index: userMessageIndex,
      content: newContent,
    }));
  }, [loading, inPreviewMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <>
      <ToggleButton $open={open} onClick={() => setOpen(true)}>
        <BiMessageDetail size={20} />
      </ToggleButton>

      <ChatContainer
        ref={containerRef}
        $open={open}
        $minimized={minimized}
        $width={size.width}
        $height={size.height}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {open && !minimized && <ResizeHandle onMouseDown={() => setIsResizing(true)} />}
        {open && !minimized && isDragging && (
          <DropOverlay>Drop an event log or document to attach</DropOverlay>
        )}

        <Header>
          <HeaderLeft>
            <StatusDot $connected={connected} />
            <Title>DCR Assistant</Title>
            <PermissionDropdown ref={permissionDropdownRef}>
              <PermissionButton
                onClick={() => setPermissionDropdownOpen(!permissionDropdownOpen)}
                title="How the assistant applies graph edits"
              >
                {(() => { const Icon = PERMISSION_ICONS[permissionLevel]; return <Icon size={15} />; })()}
                {PERMISSION_LABELS[permissionLevel]}
                <BiChevronDown size={14} style={{ transform: permissionDropdownOpen ? "rotate(180deg)" : "none" }} />
              </PermissionButton>
              <DropdownMenu $open={permissionDropdownOpen}>
                {PERMISSION_ORDER.map(level => {
                  const Icon = PERMISSION_ICONS[level];
                  return (
                    <DropdownItem key={level} $selected={level === permissionLevel} onClick={() => selectPermission(level)}>
                      <Icon size={15} />
                      {PERMISSION_LABELS[level]}
                    </DropdownItem>
                  );
                })}
              </DropdownMenu>
            </PermissionDropdown>
          </HeaderLeft>
          <HeaderButtons>
            <IconButton onClick={() => setMinimized(!minimized)}>
              <MinimizeIcon $minimized={minimized} size={18} />
            </IconButton>
            <IconButton onClick={() => setOpen(false)}>
              <BiX size={18} />
            </IconButton>
          </HeaderButtons>
        </Header>

        {!minimized && (
          <>
            <MessageList messages={messages} loading={loading} onEditMessage={handleEditMessage}>
              {inPreviewMode && (
                <ProposalBanner summary={previewSummary} onAccept={handleAccept} onDecline={handleDecline} />
              )}
            </MessageList>

            {plan && !plan.is_complete && (
              <PlanPanel
                plan={plan}
                loading={loading}
                inPreviewMode={inPreviewMode}
                onExecuteStep={handleExecuteStep}
                onExecuteAll={handleExecuteAll}
                onClear={handleClearPlan}
              />
            )}

            {(attachedLog || attachedDoc) && (
              <AttachmentBar>
                {attachedLog && (
                  <AttachmentChip label={attachedLog.name} onRemove={() => setAttachedLog(null)} />
                )}
                {attachedDoc && (
                  <AttachmentChip label={attachedDoc.name} onRemove={() => setAttachedDoc(null)} />
                )}
              </AttachmentBar>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={`${LOG_ACCEPT},${DOC_ACCEPT}`}
              style={{ display: "none" }}
              onChange={handleAttachFile}
            />

            {model && canSelectModel && availableModels.length > 0 && (
              <div style={{ position: "relative", display: "flex", justifyContent: "flex-end",
                            padding: "0 12px 4px", background: "#fafafa" }}>
                <button
                  onClick={() => { setModelDropdownOpen(o => !o); requestHealth(); }}
                  title={modelHealth[model]?.detail || "Model answering — click to switch"}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                           color: "black", opacity: 0.75, background: "transparent", border: "none",
                           cursor: "pointer", fontFamily: "inherit", padding: 0, maxWidth: 170 }}
                >
                  <Dot status={modelHealth[model]?.status} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model}</span>
                  <BiChevronUp size={13} style={{ flexShrink: 0 }} />
                </button>
                {modelDropdownOpen && (
                  <div style={{ position: "absolute", bottom: "100%", right: 12, marginBottom: 4,
                                background: "white", border: "1px solid black", borderRadius: 4,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 25, minWidth: 170 }}>
                    {availableModels.map(m => (
                      <DropdownItem key={m} $selected={m === model}
                        title={modelHealth[m]?.detail || ""}
                        onClick={() => { selectModel(m); setModelDropdownOpen(false); }}>
                        <Dot status={modelHealth[m]?.status} />
                        <span>{m}</span>
                      </DropdownItem>
                    ))}
                  </div>
                )}
              </div>
            )}

            {permissionLevel === "simulate" && (
              <div style={{ display: "flex", justifyContent: "center", padding: "0 12px 6px",
                            background: "#fafafa" }}>
                <button
                  onClick={resetMarkings}
                  title="Reset every event back to its initial marking"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12,
                           padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
                           borderRadius: 4, border: "1px solid black", background: "white", color: "black" }}
                >
                  <BiReset size={14} /> Reset markings
                </button>
              </div>
            )}

            <InputContainer>
              <AttachButton
                onClick={() => fileInputRef.current?.click()}
                title="Attach event log (.xes/.xes.gz) or document (.txt/.md/.json/.pdf)"
                disabled={!connected || inPreviewMode}
              >
                <BiPlus size={18} />
              </AttachButton>
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mirrorMode ? "Driving from the terminal — this canvas is read-only" :
                  inPreviewMode ? "Accept or decline first..." :
                  !connected ? "Connecting..." :
                  "Describe your process..."
                }
                disabled={mirrorMode || loading || !connected || inPreviewMode}
              />
              {loading ? (
                <StopButton onClick={handleStop}><BiStop size={16} /></StopButton>
              ) : (
                <SendButton onClick={sendMessage} disabled={!input.trim() || !connected || inPreviewMode}>
                  <BiSend size={16} />
                </SendButton>
              )}
            </InputContainer>
          </>
        )}
      </ChatContainer>
    </>
  );
};

export default Chat;
