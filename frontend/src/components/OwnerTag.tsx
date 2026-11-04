import type { BoardOwner } from "../services/boardService";
import Avatar from "./Avatar";

// "Quadro de: (foto) Nome" — mostrado nos quadros compartilhados.
export default function OwnerTag({ owner }: { owner: BoardOwner }) {
  return (
    <span className="owner-tag" title={`Quadro de ${owner.name}`}>
      <span className="owner-tag-label">Quadro de:</span>
      <Avatar user={owner} size={22} />
      <span className="owner-tag-name">{owner.name}</span>
    </span>
  );
}
