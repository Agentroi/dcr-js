import { BiPaperclip, BiX } from "react-icons/bi";
import { Chip, ChipLabel, ChipRemove } from "./styles";

interface AttachmentChipProps {
  label: string;
  onRemove: () => void;
}

/** A small removable chip for a file attached to the chat (log or document). */
const AttachmentChip = ({ label, onRemove }: AttachmentChipProps) => (
  <Chip>
    <BiPaperclip size={13} />
    <ChipLabel>{label}</ChipLabel>
    <ChipRemove onClick={onRemove} title="Remove">
      <BiX size={14} />
    </ChipRemove>
  </Chip>
);

export default AttachmentChip;
