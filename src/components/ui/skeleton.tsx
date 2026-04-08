/**
 * Skeleton — componente de carregamento animado (shimmer).
 * Inspirado no padrão shadcn/ui skeleton.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/60 ${className}`}
    />
  );
}
