"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw, X } from "lucide-react";
import {
  generateAuthUrl,
  getClientCredentialsToken,
  tokenStore,
  refreshAccessToken,
  getUserInfo,
  resetTokenStore,
} from "@/lib/oauth";

export default function Home() {
  const [tokens, setTokens] = useState(tokenStore);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [state, setState] = useState(() =>
    Math.random().toString(36).substring(7)
  );

  const handlePublicClient = () => {
    const authUrl = generateAuthUrl("public", state);
    window.location.href = authUrl;
  };

  const handleConfidentialClient = () => {
    const authUrl = generateAuthUrl("confidential", state);
    window.location.href = authUrl;
  };

  const handleRefreshState = () => {
    setState(Math.random().toString(36).substring(7));
  };

  const handleRemoveState = () => {
    setState("");
  };

  const handleRefreshToken = async () => {
    try {
      setLoading(true);
      setError(null);
      await refreshAccessToken();
      setTokens({ ...tokenStore });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh token");
    } finally {
      setLoading(false);
    }
  };

  const handleGetUserInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await getUserInfo();
      setUserInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get user info");
    } finally {
      setLoading(false);
    }
  };

  const handleGetTokenInfo = async (tokenType: "access" | "refresh") => {
    try {
      setLoading(true);
      setError(null);

      const token =
        tokenType === "access" ? tokens.accessToken : tokens.refreshToken;
      if (!token) {
        throw new Error(`No ${tokenType} token available`);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FAPI_URL}/oauth/token_info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(
              `${process.env.NEXT_PUBLIC_CLIENT_ID}:${process.env.NEXT_PUBLIC_CLIENT_SECRET}`
            )}`,
          },
          body: new URLSearchParams({
            token,
          }).toString(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get ${tokenType} token info`);
      }

      const info = await response.json();
      setTokenInfo(info);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to get ${tokenType} token info`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeToken = async (tokenType: "access" | "refresh") => {
    try {
      setLoading(true);
      setError(null);

      const token =
        tokenType === "access" ? tokens.accessToken : tokens.refreshToken;
      if (!token) {
        throw new Error(`No ${tokenType} token available`);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FAPI_URL}/oauth/token/revoke`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(
              `${process.env.NEXT_PUBLIC_CLIENT_ID}:${process.env.NEXT_PUBLIC_CLIENT_SECRET}`
            )}`,
          },
          body: new URLSearchParams({
            token,
            token_type_hint: `${tokenType}_token`,
          }).toString(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to revoke ${tokenType} token`);
      }

      // Clear the revoked token from store
      if (tokenType === "access") {
        tokenStore.accessToken = "";
      } else {
        tokenStore.refreshToken = "";
      }
      setTokens({ ...tokenStore });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to revoke ${tokenType} token`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    resetTokenStore();
    setTokens({ ...tokenStore });
    setUserInfo(null);
    setTokenInfo(null);
    setError(null);
  };

  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-center">OAuth 2.0 Demo</h1>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>OAuth State</CardTitle>
            <CardDescription>
              The state parameter helps prevent CSRF attacks. You can edit it,
              generate a new one, or remove it entirely (it's optional).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 items-center">
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder={state === "" ? "No state parameter (optional)" : ""}
              className="flex-1"
            />
            <Button onClick={handleRefreshState} variant="secondary">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh State
            </Button>
            <Button onClick={handleRemoveState} variant="secondary">
              <X className="mr-2 h-4 w-4" />
              Remove State
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OAuth Flows</CardTitle>
            <CardDescription>
              Choose an OAuth flow to test. Public client makes requests from
              the browser, while confidential client makes requests from the
              server.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button onClick={handlePublicClient} disabled={loading}>
              Public Client Flow
            </Button>
            <Button onClick={handleConfidentialClient} disabled={loading}>
              Confidential Client Flow
            </Button>
          </CardContent>
        </Card>

        {(tokens.accessToken || tokens.refreshToken) && (
          <Card>
            <CardHeader>
              <CardTitle>Token Operations</CardTitle>
              <CardDescription>
                Perform operations with the current tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <Button
                onClick={handleRefreshToken}
                disabled={loading || !tokens.refreshToken}
                variant="secondary"
              >
                Refresh Token
              </Button>
              <Button
                onClick={handleGetUserInfo}
                disabled={loading || !tokens.accessToken}
                variant="secondary"
              >
                Get User Info
              </Button>
              <Button
                onClick={() => handleGetTokenInfo("access")}
                disabled={loading || !tokens.accessToken}
                variant="secondary"
              >
                Get Access Token Info
              </Button>
              <Button
                onClick={() => handleGetTokenInfo("refresh")}
                disabled={loading || !tokens.refreshToken}
                variant="secondary"
              >
                Get Refresh Token Info
              </Button>
              <Button
                onClick={() => handleRevokeToken("access")}
                disabled={loading || !tokens.accessToken}
                variant="destructive"
              >
                Revoke Access Token
              </Button>
              <Button
                onClick={() => handleRevokeToken("refresh")}
                disabled={loading || !tokens.refreshToken}
                variant="destructive"
              >
                Revoke Refresh Token
              </Button>
              <Button
                onClick={handleLogout}
                disabled={loading}
                variant="destructive"
              >
                Logout
              </Button>
            </CardContent>
          </Card>
        )}

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

        {tokenInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Token Introspection</CardTitle>
              <CardDescription>
                Detailed information about the token
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(tokenInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {userInfo && (
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                Information about the authenticated user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(userInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
