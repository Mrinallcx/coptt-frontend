import { Suspense } from "react"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { DEV_BYPASS_AUTH } from "@/lib/dev-bypass-auth"

export default function Page() {
  if (DEV_BYPASS_AUTH) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
