"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { tokenStore, ClientAuthMethod } from "@/lib/oauth";

interface ClientAuthMethodSelectorProps {
  onMethodChange?: (method: ClientAuthMethod) => void;
  className?: string;
}

export function ClientAuthMethodSelector({
  onMethodChange,
  className = "",
}: ClientAuthMethodSelectorProps) {
  const [clientAuthMethod, setClientAuthMethod] = useState<ClientAuthMethod>(
    tokenStore.clientAuthMethod
  );

  // Initialize from storage on mount
  useEffect(() => {
    setClientAuthMethod(tokenStore.clientAuthMethod);
  }, []);

  const handleMethodChange = (method: ClientAuthMethod) => {
    setClientAuthMethod(method);
    tokenStore.clientAuthMethod = method;
    onMethodChange?.(method);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Client Authentication Method</CardTitle>
        <CardDescription>
          Choose how the client authenticates with the authorization server.
          client_secret_basic sends credentials in the Authorization header,
          while client_secret_post includes them in the request body.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Authentication Method
          </label>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleMethodChange("client_secret_basic")}
              variant={
                clientAuthMethod === "client_secret_basic"
                  ? "default"
                  : "outline"
              }
              size="sm"
            >
              client_secret_basic
            </Button>
            <Button
              onClick={() => handleMethodChange("client_secret_post")}
              variant={
                clientAuthMethod === "client_secret_post"
                  ? "default"
                  : "outline"
              }
              size="sm"
            >
              client_secret_post
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <strong>client_secret_basic:</strong> Sends client credentials via
            HTTP Basic authentication in the Authorization header
          </p>
          <p>
            <strong>client_secret_post:</strong> Includes client_secret as a
            parameter in the request body
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
