export function Card({
  children,
  className = "",
  borderColorClass,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  borderColorClass?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ${
        borderColorClass ? `border-l-4 ${borderColorClass}` : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
