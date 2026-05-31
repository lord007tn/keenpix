import { CheckIcon, ListFilterIcon, PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterField {
  key: string
  label: string
  options: FilterOption[]
}

function summarize(field: FilterField, selected: string[]): string {
  if (selected.length === 0) {
    return 'Any'
  }
  if (selected.length === 1) {
    return (
      field.options.find((o) => o.value === selected[0])?.label ?? selected[0]
    )
  }
  return `${selected.length} selected`
}

function FilterPill({
  field,
  selected,
  onChange,
  onRemove,
}: {
  field: FilterField
  selected: string[]
  onChange: (next: string[]) => void
  onRemove: () => void
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value],
    )
  }

  return (
    <div className="flex items-center overflow-hidden rounded-md border bg-background">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="flex items-center gap-1.5 px-2 py-1 text-sm outline-none hover:bg-accent"
              type="button"
            />
          }
        >
          <ListFilterIcon className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{field.label}</span>
          <span className="font-medium">{summarize(field, selected)}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{field.label}</DropdownMenuLabel>
            {field.options.map((o) => {
              const checked = selected.includes(o.value)
              return (
                <DropdownMenuItem
                  closeOnClick={false}
                  key={o.value}
                  onClick={() => toggle(o.value)}
                >
                  <span
                    className={`flex size-4 items-center justify-center rounded-[4px] border ${
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input'
                    }`}
                  >
                    {checked ? <CheckIcon className="size-3" /> : null}
                  </span>
                  <span className="truncate">{o.label}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        aria-label={`Remove ${field.label} filter`}
        className="border-l px-1.5 py-1.5 text-muted-foreground outline-none hover:bg-accent hover:text-foreground"
        onClick={onRemove}
        type="button"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  )
}

/**
 * reui.io-style filters: an "Add filter" button plus a removable pill per active
 * field. Controlled — `values` is a map of fieldKey → selected values.
 */
export function DataFilters({
  fields,
  values,
  onChange,
  onClear,
}: {
  fields: FilterField[]
  values: Record<string, string[]>
  onChange: (key: string, next: string[]) => void
  onClear: () => void
}) {
  const [added, setAdded] = useState<string[]>([])
  const isActive = (f: FilterField) =>
    (values[f.key]?.length ?? 0) > 0 || added.includes(f.key)
  const active = fields.filter(isActive)
  const available = fields.filter((f) => !isActive(f))

  function remove(key: string) {
    setAdded((a) => a.filter((k) => k !== key))
    onChange(key, [])
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map((f) => (
        <FilterPill
          field={f}
          key={f.key}
          onChange={(next) => onChange(f.key, next)}
          onRemove={() => remove(f.key)}
          selected={values[f.key] ?? []}
        />
      ))}

      {available.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="border-dashed" size="sm" variant="outline" />
            }
          >
            <PlusIcon data-icon="inline-start" />
            {active.length > 0 ? 'Add filter' : 'Filter'}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Add filter</DropdownMenuLabel>
              {available.map((f) => (
                <DropdownMenuItem
                  key={f.key}
                  onClick={() => setAdded((a) => [...a, f.key])}
                >
                  <ListFilterIcon className="size-3.5 text-muted-foreground" />
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {active.length > 0 ? (
        <Button
          onClick={() => {
            setAdded([])
            onClear()
          }}
          size="sm"
          variant="ghost"
        >
          Clear
          <XIcon data-icon="inline-end" />
        </Button>
      ) : null}
    </div>
  )
}
