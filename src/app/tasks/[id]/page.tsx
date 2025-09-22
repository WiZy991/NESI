// app/tasks/[id]/page.tsx
import TaskDetailPageContent from '@/components/TaskDetailPageContent'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TaskDetailPageContent taskId={id} />
}
