import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BiEdit, BiCopy, BiCheck, BiX, BiChevronsRight } from "react-icons/bi";
import type { Message } from "./types";
import {
  MessagesContainer,
  MessageBubble,
  ToolItem,
  TypingIndicator,
  TypingDot,
  MessageActions,
  ActionButton,
  EditInput,
  EditButtons,
  EditButton,
} from "./styles";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  onEditMessage?: (userMessageIndex: number, newContent: string, displayIndex: number) => void;
  children?: React.ReactNode;
}

export default function MessageList({ messages, loading, onEditMessage, children }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const checkIfAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
  }, []);

  useEffect(() => {
    // A proposal/review card (children) always pulls the view down to it;
    // otherwise only follow along if the user is already at the bottom.
    if (isAtBottomRef.current || children) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, children, loading]);

  const handleStartEdit = useCallback((idx: number, content: string) => {
    setEditingIdx(idx);
    setEditText(content);
  }, []);

  const handleConfirmEdit = useCallback(() => {
    if (editingIdx === null || !editText.trim() || !onEditMessage) return;
    let userMsgIndex = 0;
    for (let i = 0; i < editingIdx; i++) {
      if (messages[i].role === "user") userMsgIndex++;
    }
    onEditMessage(userMsgIndex, editText.trim(), editingIdx);
    setEditingIdx(null);
    setEditText("");
  }, [editingIdx, editText, messages, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditingIdx(null);
    setEditText("");
  }, []);

  const handleCopy = useCallback((idx: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConfirmEdit(); }
    if (e.key === "Escape") handleCancelEdit();
  };

  return (
    <MessagesContainer ref={containerRef} onScroll={checkIfAtBottom}>
      {messages.length === 0 && !children && (
        <MessageBubble $role="assistant">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            I can help you create and modify DCR graphs. Try describing a process or asking me to add events.
          </ReactMarkdown>
        </MessageBubble>
      )}
      {messages.map((msg, idx) => (
        msg.role === "tool" ? (
          <ToolItem key={idx}>
            <BiChevronsRight size={12} />{msg.content}
            {msg.detail && (
              <pre style={{
                margin: "4px 0 0 16px", padding: "6px 8px", fontSize: 11, lineHeight: 1.4,
                whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: 0.75,
                borderLeft: "2px solid currentColor", fontFamily: "inherit",
              }}>{msg.detail}</pre>
            )}
          </ToolItem>
        ) : (
        <MessageBubble key={idx} $role={msg.role} $editing={editingIdx === idx}>
          {editingIdx === idx ? (
            <>
              <EditInput
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                autoFocus
              />
              <EditButtons>
                <EditButton $variant="confirm" onClick={handleConfirmEdit}>
                  <BiCheck size={14} /> Send
                </EditButton>
                <EditButton $variant="cancel" onClick={handleCancelEdit}>
                  <BiX size={14} /> Cancel
                </EditButton>
              </EditButtons>
            </>
          ) : (
            <>
              {msg.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
              <MessageActions $role={msg.role}>
                {msg.role === "user" && onEditMessage && (
                  <ActionButton
                    $role={msg.role}
                    onClick={() => handleStartEdit(idx, msg.content)}
                    title="Edit message"
                  >
                    <BiEdit size={13} />
                  </ActionButton>
                )}
                <ActionButton
                  $role={msg.role}
                  onClick={() => handleCopy(idx, msg.content)}
                  title="Copy message"
                >
                  {copiedIdx === idx ? <BiCheck size={13} /> : <BiCopy size={13} />}
                </ActionButton>
              </MessageActions>
            </>
          )}
        </MessageBubble>
        )
      ))}
      {children}
      {loading && (
        <MessageBubble $role="assistant">
          <TypingIndicator>
            <TypingDot $delay={0} />
            <TypingDot $delay={0.2} />
            <TypingDot $delay={0.4} />
          </TypingIndicator>
        </MessageBubble>
      )}
      <div ref={endRef} />
    </MessagesContainer>
  );
}
