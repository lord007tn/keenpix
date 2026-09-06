import { ListFilterIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="rounded-e-none px-3"
              size="lg"
              type="button"
              variant="outline"
            />
          }
        >
          <ListFilterIcon data-icon="inline-start" />
          <span className="text-muted-foreground">{field.label}</span>
          <span className="font-medium">{summarize(field, selected)}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{field.label}</DropdownMenuLabel>
            {field.options.map((o) => {
              const checked = selected.includes(o.value)
              return (
                <DropdownMenuCheckboxItem
                  checked={checked}
                  closeOnClick={false}
                  key={o.value}
                  onClick={() => toggle(o.value)}
                >
                  <span className="truncate">{o.label}</span>
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        aria-label={`Remove ${field.label} filter`}
        className="rounded-s-none border-s-0"
        onClick={onRemove}
        size="icon-lg"
        type="button"
        variant="outline"
      >
        <XIcon />
      </Button>
    </div>
  )
}

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
  const active = fields.filter((field) => (values[field.key]?.length ?? 0) > 0)
  const selectionCount = active.reduce(
    (total, field) => total + (values[field.key]?.length ?? 0),
    0,
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {fields.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="lg" variant="outline" />}>
            <ListFilterIcon data-icon="inline-start" />
            Filters
            {selectionCount > 0 ? (
              <Badge className="ml-1" variant="secondary">
                {selectionCount}
              </Badge>
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filter analytics</DropdownMenuLabel>
              {fields.map((field) => {
                const selected = values[field.key] ?? []
                return (
                  <DropdownMenuSub key={field.key}>
                    <DropdownMenuSubTrigger>
                      {field.label}
                      {selected.length > 0 ? (
                        <Badge className="ml-auto" variant="secondary">
                          {selected.length}
                        </Badge>
                      ) : null}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{field.label}</DropdownMenuLabel>
                        {field.options.map((option) => {
                          const checked = selected.includes(option.value)
                          return (
                            <DropdownMenuCheckboxItem
                              checked={checked}
                              closeOnClick={false}
                              key={option.value}
                              onClick={() =>
                                onChange(
                                  field.key,
                                  checked
                                    ? selected.filter(
                                        (value) => value !== option.value,
                                      )
                                    : [...selected, option.value],
                                )
                              }
                            >
                              <span className="truncate">{option.label}</span>
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {active.map((f) => (
        <FilterPill
          field={f}
          key={f.key}
          onChange={(next) => onChange(f.key, next)}
          onRemove={() => onChange(f.key, [])}
          selected={values[f.key] ?? []}
        />
      ))}

      {active.length > 0 ? (
        <Button
          onClick={() => {
            onClear()
          }}
          size="lg"
          variant="ghost"
        >
          Clear
          <XIcon data-icon="inline-end" />
        </Button>
      ) : null}
    </div>
  )
}
