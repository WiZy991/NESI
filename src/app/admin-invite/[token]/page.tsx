
// app/admin-invite/[token]/page.tsx
interface PageProps {
  params: { token: string }
}

export default function Page({ params }: PageProps) {
  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-xl font-bold mb-4">Админ приглашение</h1>
      <p className="mb-4 text-gray-300">
        Токен: {params.token}
      </p>
    </div>
  )
}
