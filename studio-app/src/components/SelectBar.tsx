export default function SelectBar({
  count,
  onDelete,
  onClear,
}: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="select-bar">
      <span className="select-count"><strong>{count}</strong> icon{count > 1 ? 's' : ''} selected</span>
      <button className="select-bar-btn danger" onClick={onDelete}>Delete</button>
      <button className="select-bar-btn" onClick={onClear}>Clear selection</button>
    </div>
  );
}
