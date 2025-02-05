import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function PageHeader({
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <section
      className={cn("grid gap-1", className)}
      {...props}
    >
      {children}
    </section>
  )
}

PageHeader.Title = function PageHeaderTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-2xl font-bold tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

PageHeader.Description = function PageHeaderDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
} 