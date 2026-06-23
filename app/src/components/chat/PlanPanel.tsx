import { useState } from "react";
import { BiChevronDown, BiPlay } from "react-icons/bi";
import type { PlanState } from "./types";
import {
  PlanPanelContainer,
  PlanHeader,
  PlanTitleRow,
  PlanProgress,
  CollapseIcon,
  PlanContent,
  ProgressBar,
  ProgressFill,
  PlanSteps,
  PlanStepItem,
  StepHeader,
  StepStatus,
  StepTitle,
  StepDescription,
  PlanButtons,
  PlanButton,
} from "./styles";

interface PlanPanelProps {
  plan: PlanState;
  loading: boolean;
  inPreviewMode: boolean;
  onExecuteStep: () => void;
  onExecuteAll: () => void;
  onClear: () => void;
}

export default function PlanPanel({
  plan, loading, inPreviewMode,
  onExecuteStep, onExecuteAll, onClear,
}: PlanPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const progress = Math.round((plan.current_step / plan.steps.length) * 100);

  return (
    <PlanPanelContainer $collapsed={collapsed}>
      <PlanHeader onClick={() => setCollapsed(!collapsed)}>
        <PlanTitleRow>
          <CollapseIcon $collapsed={collapsed} size={14} />
          <span>{plan.title}</span>
          <PlanProgress>({plan.current_step + 1}/{plan.steps.length})</PlanProgress>
        </PlanTitleRow>
      </PlanHeader>

      <PlanContent $collapsed={collapsed}>
        <ProgressBar>
          <ProgressFill $percent={progress} />
        </ProgressBar>

        <PlanSteps>
          {plan.steps.map((step, idx) => (
            <PlanStepItem
              key={idx}
              $current={idx === plan.current_step}
              $completed={step.completed}
              $expanded={expandedStep === idx}
              onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
            >
              <StepHeader>
                <StepStatus>
                  {step.completed ? "✓" : idx === plan.current_step ? "▶" : "○"}
                </StepStatus>
                <StepTitle>{step.title}</StepTitle>
                <BiChevronDown
                  size={12}
                  style={{
                    transform: expandedStep === idx ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                />
              </StepHeader>
              <StepDescription $show={expandedStep === idx} $current={idx === plan.current_step}>
                {step.description}
              </StepDescription>
            </PlanStepItem>
          ))}
        </PlanSteps>

        <PlanButtons>
          <PlanButton onClick={onClear}>Clear</PlanButton>
          <PlanButton onClick={onExecuteStep} disabled={loading || inPreviewMode}>
            <BiPlay size={14} />
            Step {plan.current_step + 1}
          </PlanButton>
          <PlanButton $primary onClick={onExecuteAll} disabled={loading || inPreviewMode}>
            <BiPlay size={14} />
            All
          </PlanButton>
        </PlanButtons>
      </PlanContent>
    </PlanPanelContainer>
  );
}
