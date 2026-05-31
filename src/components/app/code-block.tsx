export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-muted-foreground text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  )
}
