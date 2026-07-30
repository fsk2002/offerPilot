export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">登录</h1>
          <p className="text-muted-foreground mt-1">登录你的 OfferPilot 账号</p>
        </div>

        {params.error && (
          <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-200">
            {params.error}
          </div>
        )}

        <form
          method="POST"
          action="/api/auth/login-form"
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">邮箱</label>
            <input
              id="email" name="email" type="email" required
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">密码</label>
            <input
              id="password" name="password" type="password" required
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors cursor-pointer"
          >
            登录
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          还没有账号？<a href="/auth/register" className="text-blue-500 hover:underline">注册</a>
        </p>
      </div>
    </main>
  );
}
