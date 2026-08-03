import CompareClient from "./CompareClient";

/**
 * /resumes/compare?from=<resumeId>&to=<resumeId>
 * 服务端读取 searchParams 传给客户端组件，避免 useSearchParams 的 Suspense 限制。
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  return <CompareClient from={from ?? ""} to={to ?? ""} />;
}
