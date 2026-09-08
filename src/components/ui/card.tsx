export function Card({
  children,
  className = "",
  borderColorClass,
}: {
  children: React.ReactNode;
  className?: string;
  borderColorClass?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ${
        borderColorClass ? `border-l-4 ${borderColorClass}` : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
