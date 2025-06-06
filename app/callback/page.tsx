"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { exchangeCodeForTokens, tokenStore } from "@/lib/oauth";

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setError(`OAuth error: ${error}`);
      setLoading(false);
      return;
    }

    if (!code || !state) {
      setError("Missing code or state parameter");
      setLoading(false);
      return;
    }

    if (state !== tokenStore.state) {
      setError(
        `State parameter mismatch. Received: ${state}, Expected: ${tokenStore.state}`
      );
      setLoading(false);
      return;
    }

    const handleCallback = async () => {
      try {
        await exchangeCodeForTokens(code);
        router.push("/");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to exchange code for tokens"
        );
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (loading) {
    return (
      <main className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p>Processing OAuth callback...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto p-4 max-w-4xl">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to complete OAuth flow</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return null;
}
