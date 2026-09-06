import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/app";
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <main className="flex-1 flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="inline-block mb-8">
          <LogoMark size={44} label="Kodigo" />
        </Link>
        <h1 className="!text-[clamp(44px,8vw,72px)]">Sign in</h1>
        <p className="text-dim mt-4">
          An account is an email address and nothing else. We send a link, you tap it, and your
          library is here.
        </p>
        <LoginForm next={next} initialError={error} />
        <p className="text-xs text-dim mt-8">
          Signing in creates an account if you don&apos;t have one. Read the{" "}
          <Link href="/privacy" className="text-accent">privacy policy</Link> for what an account holds.
        </p>
      </div>
    </main>
  );
}
