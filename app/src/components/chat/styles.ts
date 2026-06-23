import styled, { keyframes } from "styled-components";
import { BiChevronDown, BiChevronRight } from "react-icons/bi";

// Animations
const pulse = keyframes`
  0%, 80%, 100% { opacity: 0.4; }
  40% { opacity: 1; }
`;

export const TypingDot = styled.span<{ $delay: number }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #666;
  margin: 0 2px;
  animation: ${pulse} 1.4s infinite ease-in-out;
  animation-delay: ${props => props.$delay}s;
`;

export const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
`;

export const ChatContainer = styled.div<{ $open: boolean; $minimized: boolean; $width: number; $height: number }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: ${props => props.$open ? `${props.$width}px` : "0"};
  height: ${props => props.$minimized ? "48px" : props.$open ? `${props.$height}px` : "0"};
  min-width: ${props => props.$open ? "320px" : "0"};
  min-height: ${props => props.$open && !props.$minimized ? "300px" : "0"};
  max-width: 600px;
  max-height: 80vh;
  background: white;
  border: ${props => props.$open ? "2px solid black" : "none"};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  z-index: 14;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  font-family: 'IBM Plex Sans', sans-serif;
`;

export const DropOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 2px dashed black;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: black;
  pointer-events: none;
`;

export const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nw-resize;
  z-index: 10;

  &::before {
    content: "";
    position: absolute;
    top: 4px;
    left: 4px;
    width: 8px;
    height: 8px;
    border-left: 2px solid #ccc;
    border-top: 2px solid #ccc;
  }

  &:hover::before {
    border-color: #666;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  min-height: 24px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Title = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: black;
`;

export const StatusDot = styled.span<{ $connected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$connected ? "#2d6a4f" : "#c1121f"};
`;

export const PermissionDropdown = styled.div`
  position: relative;
  display: inline-block;
`;

export const PermissionButton = styled.button`
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid black;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  background: white;
  color: black;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: #f0f0f0;
  }
`;

export const DropdownMenu = styled.div<{ $open: boolean }>`
  display: ${props => props.$open ? "block" : "none"};
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid black;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 25;
  min-width: 140px;
`;

export const DropdownItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  background: ${props => props.$selected ? "#f0f0f0" : "white"};

  &:hover {
    background: gainsboro;
  }

  &:first-child {
    border-radius: 3px 3px 0 0;
  }

  &:last-child {
    border-radius: 0 0 3px 3px;
  }
`;

export const HeaderButtons = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

export const IconButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: black;
  border-radius: 4px;

  &:hover {
    background: #f0f0f0;
  }
`;

export const EngineToggle = styled.button`
  background: #e8e8e8;
  border: 1px solid #ccc;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  font-family: monospace;
  border-radius: 3px;
  color: #555;

  &:hover {
    background: #d0d0d0;
  }
`;

export const MinimizeIcon = styled(BiChevronDown)<{ $minimized: boolean }>`
  transform: ${props => props.$minimized ? "rotate(180deg)" : "rotate(0)"};
  transition: transform 0.2s;
`;

export const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fafafa;
`;

export const MessageBubble = styled.div<{ $role: "user" | "assistant"; $editing?: boolean }>`
  max-width: ${props => props.$editing ? "100%" : "90%"};
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
  align-self: ${props => props.$editing ? "stretch" : (props.$role === "user" ? "flex-end" : "flex-start")};
  background: ${props => props.$role === "user" ? "black" : "white"};
  color: ${props => props.$role === "user" ? "white" : "black"};
  border: ${props => props.$role === "assistant" ? "1px solid #e0e0e0" : "none"};
  overflow-wrap: break-word;
  word-break: break-word;

  p {
    margin: 0 0 8px 0;
    &:last-child { margin-bottom: 0; }
  }

  ul, ol {
    margin: 4px 0;
    padding-left: 20px;
    list-style-position: outside;
  }

  ul { list-style-type: disc; }
  ol { list-style-type: decimal; }

  li {
    margin: 2px 0;
    display: list-item;
  }

  code {
    background: ${props => props.$role === "user" ? "rgba(255,255,255,0.15)" : "#f0f0f0"};
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 11px;
    font-family: 'SF Mono', Monaco, monospace;
  }

  pre {
    background: ${props => props.$role === "user" ? "rgba(255,255,255,0.1)" : "#f5f5f5"};
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 11px;
    margin: 8px 0;

    code {
      background: none;
      padding: 0;
    }
  }

  strong {
    font-weight: 600;
  }

  table {
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 11px;
    width: 100%;
  }

  th, td {
    border: 1px solid ${props => props.$role === "user" ? "rgba(255,255,255,0.3)" : "#e0e0e0"};
    padding: 4px 8px;
    text-align: left;
  }

  th {
    background: ${props => props.$role === "user" ? "rgba(255,255,255,0.1)" : "#f5f5f5"};
    font-weight: 600;
  }

  blockquote {
    border-left: 3px solid #ccc;
    margin: 8px 0;
    padding-left: 12px;
    color: #666;
  }
`;

// Live tool-activity chip in the feed
export const ToolItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  max-width: 90%;
  padding: 1px 4px;
  font-size: 11px;
  color: #888;
  svg { flex-shrink: 0; }
`;

// Message actions (edit / copy)
export const MessageActions = styled.div<{ $role: "user" | "assistant" }>`
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 6px;
  padding-top: 4px;
`;

export const ActionButton = styled.button<{ $role: "user" | "assistant" }>`
  background: transparent;
  border: none;
  border-radius: 3px;
  padding: 2px 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: ${props => props.$role === "user" ? "rgba(255,255,255,0.5)" : "#bbb"};

  &:hover {
    color: ${props => props.$role === "user" ? "white" : "black"};
    background: ${props => props.$role === "user" ? "rgba(255,255,255,0.1)" : "#f0f0f0"};
  }
`;

export const EditInput = styled.textarea`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
  font-size: 13px;
  font-family: inherit;
  min-height: 40px;
  max-height: 120px;
  background: white;
  color: black;

  &:focus {
    outline: none;
    border-color: black;
  }
`;

export const EditButtons = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 6px;
`;

export const EditButton = styled.button<{ $variant: "confirm" | "cancel" }>`
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;

  ${props => props.$variant === "confirm" ? `
    background: black;
    color: white;
    border: 1px solid black;
    &:hover { background: #333; }
  ` : `
    background: white;
    color: black;
    border: 1px solid #ccc;
    &:hover { background: #f0f0f0; }
  `}
`;

// Preview / Proposal
export const PreviewBanner = styled.div`
  background: white;
  border: 2px solid black;
  border-radius: 6px;
  padding: 12px;
  margin: 4px 0;
  align-self: stretch;
`;

export const PreviewTitle = styled.div`
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
  color: black;
`;

export const PreviewDescription = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
`;

export const PreviewLegend = styled.div`
  font-size: 11px;
  color: #888;
  margin-bottom: 10px;
  display: flex;
  gap: 12px;
`;

export const LegendItem = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${props => props.$color};
  }
`;

export const ApprovalButtons = styled.div`
  display: flex;
  gap: 8px;
`;

export const ApprovalButton = styled.button<{ $variant: "accept" | "decline" }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  border: 2px solid black;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;

  ${props => props.$variant === "accept" ? `
    background: black;
    color: white;
    &:hover { background: #333; }
  ` : `
    background: white;
    color: black;
    &:hover { background: #f0f0f0; }
  `}
`;

// Plan Panel
export const PlanPanelContainer = styled.div<{ $collapsed: boolean }>`
  background: white;
  border-top: 2px solid black;
  padding: ${props => props.$collapsed ? "8px 12px" : "10px 12px"};
`;

export const PlanHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
`;

export const PlanTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: black;
`;

export const PlanProgress = styled.span`
  font-weight: 400;
  color: #666;
`;

export const CollapseIcon = styled(BiChevronRight)<{ $collapsed: boolean }>`
  transform: ${props => props.$collapsed ? "rotate(0)" : "rotate(90deg)"};
  transition: transform 0.2s;
`;

export const PlanContent = styled.div<{ $collapsed: boolean }>`
  display: ${props => props.$collapsed ? "none" : "block"};
  margin-top: 8px;
`;

export const ProgressBar = styled.div`
  height: 6px;
  background: gainsboro;
  border-radius: 3px;
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid #ccc;
`;

export const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${props => props.$percent}%;
  background: black;
  transition: width 0.3s;
`;

export const PlanSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 150px;
  overflow-y: auto;
`;

export const PlanStepItem = styled.div<{ $current: boolean; $completed: boolean; $expanded: boolean }>`
  font-size: 11px;
  padding: 6px 8px;
  border-radius: 4px;
  background: ${props => props.$current ? "black" : "white"};
  color: ${props => props.$current ? "white" : "black"};
  border: 1px solid ${props => props.$completed ? "#ccc" : "black"};
  cursor: pointer;
  opacity: ${props => props.$completed ? 0.6 : 1};
`;

export const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const StepStatus = styled.span`
  font-size: 10px;
  flex-shrink: 0;
`;

export const StepTitle = styled.span`
  flex: 1;
`;

export const StepDescription = styled.div<{ $show: boolean; $current: boolean }>`
  display: ${props => props.$show ? "block" : "none"};
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid ${props => props.$current ? "rgba(255,255,255,0.3)" : "#e0e0e0"};
  font-size: 10px;
  color: ${props => props.$current ? "rgba(255,255,255,0.9)" : "#666"};
  line-height: 1.4;
`;

export const PlanButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

export const PlanButton = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 8px 10px;
  border: 2px solid black;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: ${props => props.$primary ? "black" : "white"};
  color: ${props => props.$primary ? "white" : "black"};

  &:hover {
    background: ${props => props.$primary ? "#333" : "gainsboro"};
  }

  &:disabled {
    background: gainsboro;
    color: #999;
    border-color: #ccc;
    cursor: not-allowed;
  }
`;

// Input
export const AttachmentBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 12px 0;
`;

export const Chip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 3px 8px;
  font-size: 11px;
  color: black;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;

  svg { flex-shrink: 0; }
`;

export const ChipLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ChipRemove = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #888;
  flex-shrink: 0;

  &:hover { color: black; }
`;

export const InputContainer = styled.div`
  display: flex;
  padding: 12px;
  border-top: 1px solid #e0e0e0;
  gap: 8px;
  background: white;
`;

export const Input = styled.textarea`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
  font-size: 13px;
  font-family: inherit;
  min-height: 36px;
  max-height: 80px;

  &:focus {
    outline: none;
    border-color: black;
  }

  &::placeholder {
    color: #999;
  }
`;

export const SendButton = styled.button`
  background: black;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #333;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

export const StopButton = styled.button`
  background: white;
  color: black;
  border: 2px solid black;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: gainsboro;
  }
`;

// Attach button — same weight as the send button so the input row reads as a pair.
export const AttachButton = styled.button`
  background: black;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #333;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

export const ToggleButton = styled.button<{ $open: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: ${props => props.$open ? "black" : "white"};
  color: ${props => props.$open ? "white" : "black"};
  border: 2px solid black;
  display: ${props => props.$open ? "none" : "flex"};
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 15;
  padding: 0;

  &:hover {
    box-shadow: 0px 0px 5px 0px grey;
  }
`;
