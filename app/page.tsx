"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  generateAuthUrl,
  getClientCredentialsToken,
  tokenStore,
} from "@/lib/oauth";

export default function Home() {
  const [tokens, setTokens] = useState(tokenStore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublicClient = () => {
    const authUrl = generateAuthUrl("public");
    window.location.href = authUrl;
  };

  const handleConfidentialClient = () => {
    const authUrl = generateAuthUrl("confidential");
    window.location.href = authUrl;
  };

  const handleClientCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      await getClientCredentialsToken();
      setTokens({ ...tokenStore });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">OAuth 2.0 Demo</h1>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>OAuth Flows</CardTitle>
            <CardDescription>
              Choose an OAuth flow to test. Public client makes requests from
              the browser, while confidential client makes requests from the
              server.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={handlePublicClient} disabled={loading}>
              Public Client Flow
            </Button>
            <Button onClick={handleConfidentialClient} disabled={loading}>
              Confidential Client Flow
            </Button>
            <Button onClick={handleClientCredentials} disabled={loading}>
              Client Credentials Flow
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500">
            <CardContent className="pt-6">
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        )}

        {(tokens.accessToken || tokens.refreshToken || tokens.idToken) && (
          <Card>
            <CardHeader>
              <CardTitle>Token Information</CardTitle>
              <CardDescription>
                Current tokens stored in the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tokens.accessToken && (
                  <div>
                    <h3 className="font-semibold mb-2">Access Token</h3>
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                      {tokens.accessToken}
                    </pre>
                  </div>
                )}
                {tokens.refreshToken && (
                  <div>
                    <h3 className="font-semibold mb-2">Refresh Token</h3>
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                      {tokens.refreshToken}
                    </pre>
                  </div>
                )}
                {tokens.idToken && (
                  <div>
                    <h3 className="font-semibold mb-2">ID Token</h3>
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                      {tokens.idToken}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
