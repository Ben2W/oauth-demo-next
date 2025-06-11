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
import {
  exchangeCodeForTokens,
  tokenStore,
  getDefaultTokenExchangeParams,
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

    if (state !== tokenStore.state) {
      setError(
        `State parameter mismatch. Received: ${state}, Expected: ${tokenStore.state}`
      );
      setLoading(false);
      return;
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
        <Card className="w-full max-w-lg shadow-lg">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <p className="text-lg text-muted-foreground font-medium">
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
        <Card className="w-full max-w-lg border border-red-500 shadow-lg">
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Customize Token Exchange
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Review and modify the parameters that will be sent to exchange the
              authorization code for tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? "Exchanging..." : "Exchange Tokens"}
                </Button>
                <Button
                  type="button"
                  variant={hasChanges() ? "destructive" : "secondary"}
                  onClick={handleRevert}
                  disabled={!hasChanges() || submitting}
                  className="w-full sm:w-auto"
                >
                  Revert to Defaults
                </Button>
              </div>

              <div className="space-y-4">
                {Object.entries(params).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-end gap-2"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label
                          htmlFor={`key-${key}`}
                          className="text-sm font-medium"
                        >
                          Parameter Name
                        </Label>
                        <Input
                          id={`key-${key}`}
                          value={key}
                          onChange={(e) => handleKeyChange(key, e.target.value)}
                          placeholder="Parameter name"
                          className="mt-1"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`value-${key}`}
                          className="text-sm font-medium"
                        >
                          Parameter Value
                        </Label>
                        <Input
                          id={`value-${key}`}
                          value={value}
                          onChange={(e) =>
                            handleParamChange(key, e.target.value)
                          }
                          placeholder="Parameter value"
                          className="mt-1"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveParam(key)}
                      className="sm:mt-0 mt-1"
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
                  className="w-full sm:w-auto"
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
