import { Routes, Route, Navigate } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { HomePage } from '@/features/home/HomePage'
import { CoursePage } from '@/features/courses/CoursePage'
import { ModulePage } from '@/features/courses/ModulePage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses/:courseSlug" element={<CoursePage />} />
        <Route path="/courses/:courseSlug/:moduleSlug" element={<ModulePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
