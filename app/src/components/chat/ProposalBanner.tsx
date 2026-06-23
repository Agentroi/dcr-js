import { BiCheck, BiXCircle } from "react-icons/bi";
import {
  PreviewBanner,
  PreviewTitle,
  PreviewDescription,
  PreviewLegend,
  LegendItem,
  ApprovalButtons,
  ApprovalButton,
} from "./styles";

interface ProposalBannerProps {
  summary: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function ProposalBanner({ summary, onAccept, onDecline }: ProposalBannerProps) {
  return (
    <PreviewBanner>
      <PreviewTitle>Preview: {summary}</PreviewTitle>
      <PreviewDescription>Review the changes on the canvas.</PreviewDescription>
      <PreviewLegend>
        <LegendItem $color="#2d6a4f">Add</LegendItem>
        <LegendItem $color="#c1121f">Remove</LegendItem>
        <LegendItem $color="#e85d04">Modify</LegendItem>
      </PreviewLegend>
      <ApprovalButtons>
        <ApprovalButton $variant="accept" onClick={onAccept}>
          <BiCheck size={16} /> Accept
        </ApprovalButton>
        <ApprovalButton $variant="decline" onClick={onDecline}>
          <BiXCircle size={14} /> Decline
        </ApprovalButton>
      </ApprovalButtons>
    </PreviewBanner>
  );
}
