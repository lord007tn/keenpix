import { TanStackDevtools } from '@tanstack/react-devtools'
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
export default function Devtools() {
  return (
    <TanStackDevtools
      config={{
        position: 'bottom-right',
      }}
      eventBusConfig={{
        debug: true,
        connectToServerBus: true,
      }}
      plugins={[
        {
          name: 'TanStack Query',
          render: <ReactQueryDevtoolsPanel />,
        },
        {
          name: 'TanStack Router',
          render: <TanStackRouterDevtoolsPanel />,
        },
        {
          name: 'TanStack Form',
          render: <FormDevtoolsPanel />,
        },
      ]}
    />
  )
}
