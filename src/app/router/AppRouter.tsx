import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PlaceholderPage } from '@/features/PlaceholderPage'
import { MyCoffeesPage } from '@/features/coffees/MyCoffeesPage'
import { HomePage } from '@/features/dashboard/HomePage'
import { SettingsPage } from '@/features/settings/SettingsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'coffees', element: <MyCoffeesPage /> },
      {
        path: 'coffees/:id',
        element: <PlaceholderPage page="coffeeDetail" />,
      },
      {
        path: 'journal',
        element: (
          <PlaceholderPage page="journal" />
        ),
      },
      {
        path: 'explore',
        element: (
          <PlaceholderPage page="explore" />
        ),
      },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
