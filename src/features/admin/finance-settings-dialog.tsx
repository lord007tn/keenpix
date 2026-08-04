import { SaveIcon, Settings2Icon } from 'lucide-react'
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/errors/common'
import {
  getFinanceSettingsFn,
  updateFinanceSettingsFn,
} from '@/functions/admin'
import { PLANS, STANDARD_PLAN_PRICES } from '@/lib/billing/plans'

type FinanceSettings = Awaited<ReturnType<typeof getFinanceSettingsFn>>

const PAYMENT_FIELDS = [
  { key: 'paymentPercent', label: 'Polar percentage fee', suffix: '%' },
  { key: 'paymentFixed', label: 'Polar transaction fee', suffix: '/ payment' },
] as const

const FIXED_FIELDS = [
  { key: 'serverMonthly', label: 'Server / compute', suffix: '/ month' },
  { key: 'databaseMonthly', label: 'Database', suffix: '/ month' },
  {
    key: 'observabilityMonthly',
    label: 'Logs & observability',
    suffix: '/ month',
  },
  { key: 'otherMonthly', label: 'Email & other', suffix: '/ month' },
] as const

const DELIVERY_FIELDS = [
  {
    key: 'originRequestsPerMillion',
    label: 'Keenpix requests',
    suffix: '/ 1M',
  },
  {
    key: 'originBandwidthPerGb',
    label: 'Keenpix bandwidth',
    suffix: '/ GB',
  },
  { key: 'edgeRequestsPerMillion', label: 'Edge requests', suffix: '/ 1M' },
  { key: 'edgeBandwidthPerGb', label: 'Edge bandwidth', suffix: '/ GB' },
] as const

type FinanceFieldKey =
  | (typeof PAYMENT_FIELDS)[number]['key']
  | (typeof FIXED_FIELDS)[number]['key']
  | (typeof DELIVERY_FIELDS)[number]['key']

function SettingsFields({
  fields,
  settings,
  setSettings,
}: {
  fields: readonly {
    key: FinanceFieldKey
    label: string
    suffix: string
  }[]
  settings: FinanceSettings
  setSettings: Dispatch<SetStateAction<FinanceSettings | null>>
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div className="flex flex-col gap-1.5" key={field.key}>
          <Label htmlFor={`finance-${field.key}`}>{field.label}</Label>
          <div className="relative">
            {field.key === 'paymentPercent' ? null : (
              <span className="absolute inset-y-0 left-2.5 flex items-center text-muted-foreground text-sm">
                $
              </span>
            )}
            <Input
              className="px-6 pr-20 tabular-nums"
              id={`finance-${field.key}`}
              min="0"
              onChange={(event) =>
                setSettings({
                  ...settings,
                  [field.key]: Number(event.target.value),
                })
              }
              step="0.000001"
              type="number"
              value={settings[field.key]}
            />
            <span className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground text-xs">
              {field.suffix}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FinanceSettingsDialog({
  onSaved,
}: {
  onSaved?: () => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<FinanceSettings | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setSettings(await getFinanceSettingsFn())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load finance settings'))
    }
  }, [])

  useEffect(() => {
    if (open) {
      load()
    }
  }, [load, open])

  const save = async () => {
    if (!settings) {
      return
    }
    setSaving(true)
    try {
      await updateFinanceSettingsFn({ data: settings })
      toast.success('Finance assumptions saved')
      setOpen(false)
      await onSaved?.()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save finance settings'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={<Button className="h-11" size="sm" variant="outline" />}
      >
        <Settings2Icon data-icon="inline-start" />
        Cost model
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Financial cost model</DialogTitle>
            <Badge variant={settings?.configured ? 'success' : 'outline'}>
              {settings?.configured ? 'Configured' : 'Not configured'}
            </Badge>
          </div>
          <DialogDescription>
            Internal cost assumptions for platform profit and customer
            contribution. Customer prices remain controlled by Polar.
          </DialogDescription>
        </DialogHeader>

        {settings ? (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <div>
                <h3 className="font-medium text-sm">Payment processing</h3>
                <p className="text-muted-foreground text-xs">
                  Used to estimate monthly customer contribution. Settled
                  platform totals continue to use Polar’s actual reported fees.
                </p>
              </div>
              <SettingsFields
                fields={PAYMENT_FIELDS}
                setSettings={setSettings}
                settings={settings}
              />
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <div>
                <h3 className="font-medium text-sm">
                  Fixed monthly operations
                </h3>
                <p className="text-muted-foreground text-xs">
                  Allocated to customers by delivered bandwidth, with request
                  attempts as the fallback when no bytes were delivered.
                </p>
              </div>
              <SettingsFields
                fields={FIXED_FIELDS}
                setSettings={setSettings}
                settings={settings}
              />
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <div>
                <h3 className="font-medium text-sm">Delivery cost</h3>
                <p className="text-muted-foreground text-xs">
                  Provider cost—not customer overage price. The documented
                  Hetzner excess-transfer reference is $0.0012/GB; included
                  Cloudflare Edge delivery has no incremental bandwidth charge.
                </p>
              </div>
              <SettingsFields
                fields={DELIVERY_FIELDS}
                setSettings={setSettings}
                settings={settings}
              />
            </section>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">Polar pricing context</p>
                  <p className="text-muted-foreground text-xs">
                    Published customer prices are intentionally separate from
                    internal infrastructure costs.
                  </p>
                </div>
                <Badge variant="outline">Live catalog target</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.values(PLANS).map((plan) => (
                  <div className="flex flex-col gap-1" key={plan.id}>
                    <span className="font-medium text-sm">{plan.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ${STANDARD_PLAN_PRICES[plan.id].priceMonthlyUsd}/month ·{' '}
                      {plan.includedBandwidthBytes / 1024 ** 3} GB included
                    </span>
                    <span className="text-xs tabular-nums">
                      $
                      {(
                        STANDARD_PLAN_PRICES[plan.id].overagePerGbCents / 100
                      ).toFixed(2)}
                      /GB overage
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Skeleton className="h-96" />
        )}

        <DialogFooter showCloseButton>
          <Button disabled={!settings || saving} onClick={save}>
            <SaveIcon data-icon="inline-start" />
            {saving ? 'Saving…' : 'Save cost model'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
