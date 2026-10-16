"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PageLoading } from "@/components/ui/Spinner";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/rooms" : "/login");
  }, [loading, user, router]);

  return <PageLoading />;
}
