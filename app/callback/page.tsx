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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { CheckIcon, XIcon } from "lucide-react";
import {
  exchangeCodeForTokens,
  tokenStore,
  getDefaultTokenExchangeParams,
  isStateRemoved,
} from "@/lib/oauth";

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});
  const [defaultParams, setDefaultParams] = useState<Record<string, string>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const code = searchParams?.get("code");
    const state = searchParams?.get("state");
    const error = searchParams?.get("error");

    if (error) {
      setError(`OAuth error: ${error}`);
      setLoading(false);
      return;
    }

    if (!code) {
      setError("Missing code");
      setLoading(false);
      return;
    }

    // Handle state validation based on whether state was removed
    if (isStateRemoved()) {
      // If state was removed, we shouldn't receive a state parameter
      if (state !== null) {
        setError(
          `Unexpected state parameter received. State was removed but received: ${state}`
        );
        setLoading(false);
        return;
      }
    } else {
      // If state was not removed, validate it matches
      if (state !== tokenStore.state) {
        setError(
          `State parameter mismatch. Received: ${state}, Expected: ${tokenStore.state}`
        );
        setLoading(false);
        return;
      }
    }

    // Set up default parameters and show form
    const defaults = getDefaultTokenExchangeParams(code);
    setDefaultParams(defaults);
    setParams(defaults);
    setLoading(false);
    setShowForm(true);
  }, [searchParams]);

  const handleParamChange = (key: string, value: string) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;

    setParams((prev) => {
      const newParams = { ...prev };
      const value = newParams[oldKey];
      delete newParams[oldKey];
      newParams[newKey] = value;
      return newParams;
    });
  };

  const handleAddParam = () => {
    const newKey = `custom_param_${Date.now()}`;
    setParams((prev) => ({
      ...prev,
      [newKey]: "",
    }));
  };

  const handleRemoveParam = (key: string) => {
    setParams((prev) => {
      const newParams = { ...prev };
      delete newParams[key];
      return newParams;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await exchangeCodeForTokens(params);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to exchange code for tokens"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevert = () => {
    setParams({ ...defaultParams });
  };

  // Check if current params differ from defaults
  const hasChanges = () => {
    const currentKeys = Object.keys(params).sort();
    const defaultKeys = Object.keys(defaultParams).sort();

    // Different number of keys
    if (currentKeys.length !== defaultKeys.length) {
      return true;
    }

    // Different keys
    if (JSON.stringify(currentKeys) !== JSON.stringify(defaultKeys)) {
      return true;
    }

    // Different values
    for (const key of currentKeys) {
      if (params[key] !== defaultParams[key]) {
        return true;
      }
    }

    return false;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted">
        <Card className="w-full max-w-lg">
          <CardContent className="py-8 text-center">
            <p className="text-lg text-muted-foreground">
              Processing OAuth callback...
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted">
        <Card className="w-full max-w-lg border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription className="text-red-400">
              Failed to complete OAuth flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 font-mono break-all">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (showForm) {
    const state = searchParams?.get("state");

    return (
      <main className="flex min-h-screen items-center justify-center bg-muted ">
        <Card className="w-full max-w-2xl p-4">
          <CardHeader>
            <CardTitle>Customize Token Exchange</CardTitle>
            <CardDescription>
              Review and modify the parameters that will be sent to exchange the
              authorization code for tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium">State Parameter:</span>
              {state !== null ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500 text-white">
                    <CheckIcon className="w-3 h-3 mr-1" />
                    Included
                  </Badge>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all overflow-wrap-anywhere">
                    "{state}"
                  </code>
                </div>
              ) : (
                <Badge className="bg-red-500 text-white">
                  <XIcon className="w-3 h-3 mr-1" />
                  Not Included
                </Badge>
              )}
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Exchanging..." : "Exchange Tokens"}
                </Button>
                <Button
                  type="button"
                  variant={hasChanges() ? "destructive" : "secondary"}
                  onClick={handleRevert}
                  disabled={!hasChanges() || submitting}
                >
                  Revert to Defaults
                </Button>
              </div>

              <div className="space-y-4">
                {Object.entries(params).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`key-${key}`}>Parameter Name</Label>
                        <Input
                          id={`key-${key}`}
                          value={key}
                          onChange={(e) => handleKeyChange(key, e.target.value)}
                          placeholder="Parameter name"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`value-${key}`}>Parameter Value</Label>
                        <Input
                          id={`value-${key}`}
                          value={value}
                          onChange={(e) =>
                            handleParamChange(key, e.target.value)
                          }
                          placeholder="Parameter value"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveParam(key)}
                      className="self-end"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddParam}
                >
                  Add Parameter
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return null;
}
