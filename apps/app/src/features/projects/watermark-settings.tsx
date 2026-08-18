import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/errors/common'
import { updateProjectSettingsFn } from '@/functions/projects'
import type { Project, WatermarkPosition } from '@/shared/types'

const POSITIONS: WatermarkPosition[] = [
  'northwest',
  'north',
  'northeast',
  'west',
  'center',
  'east',
  'southwest',
  'south',
  'southeast',
]

export function WatermarkSettings({ project }: { project: Project }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(project.watermarkEnabled)
  const [margin, setMargin] = useState(String(project.watermarkMargin))
  const [opacity, setOpacity] = useState(String(project.watermarkOpacity))
  const [position, setPosition] = useState(project.watermarkPosition)
  const [scale, setScale] = useState(String(project.watermarkScale))
  const [url, setUrl] = useState(project.watermarkUrl ?? '')
  const [pending, setPending] = useState(false)

  async function save() {
    setPending(true)
    try {
      await updateProjectSettingsFn({
        data: {
          projectId: project.id,
          watermarkEnabled: enabled,
          watermarkMargin: Number(margin),
          watermarkOpacity: Number(opacity),
          watermarkPosition: position,
          watermarkScale: Number(scale),
          watermarkUrl: url,
        },
      })
      await router.invalidate()
      toast.success('Watermark settings saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save watermark settings'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="watermark-enabled">Apply watermark</Label>
          <p className="text-muted-foreground text-xs">
            Applied server-side to raster output. The watermark host must also
            be in this project’s allowed-host list.
          </p>
        </div>
        <Switch
          checked={enabled}
          id="watermark-enabled"
          onCheckedChange={setEnabled}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="watermark-url">Watermark image URL</Label>
          <Input
            id="watermark-url"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://images.example.com/brand/watermark.png"
            type="url"
            value={url}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="watermark-position">Position</Label>
          <Select
            onValueChange={(value) => setPosition(value as WatermarkPosition)}
            value={position}
          >
            <SelectTrigger id="watermark-position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((value) => (
                <SelectItem className="capitalize" key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="watermark-opacity">Opacity (%)</Label>
          <Input
            id="watermark-opacity"
            max={100}
            min={1}
            onChange={(event) => setOpacity(event.target.value)}
            type="number"
            value={opacity}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="watermark-scale">Width (% of output)</Label>
          <Input
            id="watermark-scale"
            max={100}
            min={1}
            onChange={(event) => setScale(event.target.value)}
            type="number"
            value={scale}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="watermark-margin">Edge margin (px)</Label>
          <Input
            id="watermark-margin"
            max={500}
            min={0}
            onChange={(event) => setMargin(event.target.value)}
            type="number"
            value={margin}
          />
        </div>
      </div>

      <div>
        <Button disabled={pending || (enabled && !url)} onClick={save}>
          {pending ? 'Saving…' : 'Save watermark'}
        </Button>
      </div>
    </div>
  )
}
