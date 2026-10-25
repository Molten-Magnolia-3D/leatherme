import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex gap-3 rounded-lg border border-border bg-muted/70 px-3 py-2 text-sm", className)}
      {...props}
    />
  );
}
