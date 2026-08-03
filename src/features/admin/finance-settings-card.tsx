import { SaveIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/errors/common'
import {
  getFinanceSettingsFn,
  updateFinanceSettingsFn,
} from '@/functions/admin'

type FinanceSettings = Awaited<ReturnType<typeof getFinanceSettingsFn>>

const FIELDS = [
  {
    key: 'serverMonthly',
    label: 'Server / compute',
    suffix: '/ month',
  },
  { key: 'databaseMonthly', label: 'Database', suffix: '/ month' },
  {
    key: 'observabilityMonthly',
    label: 'Logs & observability',
    suffix: '/ month',
  },
  { key: 'otherMonthly', label: 'Other fixed costs', suffix: '/ month' },
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

export function FinanceSettingsCard() {
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
    load()
  }, [load])

  const save = async () => {
    if (!settings) {
      return
    }
    setSaving(true)
    try {
      setSettings(await updateFinanceSettingsFn({ data: settings }))
      toast.success('Finance assumptions saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save finance settings'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial cost model</CardTitle>
        <CardDescription>
          Operating assumptions used by Finances, Overview, and customer
          contribution calculations. Enter USD amounts before tax and replace
          reference pricing when an invoice is available.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {settings ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FIELDS.map((field) => (
              <div className="flex flex-col gap-1.5" key={field.key}>
                <Label htmlFor={`finance-${field.key}`}>{field.label}</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-2.5 flex items-center text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    className="px-6 pr-16 tabular-nums"
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
        ) : (
          <Skeleton className="h-48" />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="max-w-3xl text-muted-foreground text-xs">
            Fixed costs are prorated by days. Edge costs are platform-wide and
            are not assigned to individual customers because Cloudflare’s zone
            analytics do not expose the Keenpix organization. The documented
            launch baseline is $9.99/month for the Hetzner compute reference and
            $15/month for Postmark; database, observability, included traffic,
            and Cloudflare Edge run on those existing allocations.
          </p>
          <Button disabled={!settings || saving} onClick={save}>
            <SaveIcon data-icon="inline-start" />
            {saving ? 'Saving…' : 'Save cost model'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
