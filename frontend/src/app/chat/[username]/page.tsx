"use client";

import { AuthenticatedLayout } from "@/components/common/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatThread } from "@/hooks/chat/useChatThread";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

export default function ChatThreadPage() {
  const params = useParams();
  const username = params?.username as string;
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, isSending, isConnected, error, send } =
    useChatThread(username);

  useEffect(() => {
    if (isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;

    try {
      await send(body);
      setDraft("");
      inputRef.current?.focus();
    } catch {
      // error state handled in hook
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="mx-auto flex h-[calc(100dvh-5rem)] max-w-2xl flex-col px-4 py-6 sm:px-6">
        <div className="mb-4">
          <Link href="/chat" className="text-sm text-primary hover:underline">
            Back to messages
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-xl font-semibold">@{username}</h1>
            <span
              className={`text-xs ${isConnected ? "text-green-600" : "text-muted-foreground"}`}
            >
              {isConnected ? "Live" : "Connecting..."}
            </span>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border/60 p-4">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-2/3" />
            ))}

          {!isLoading &&
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.is_mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.body}
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            disabled={!isConnected}
          />
          <Button
            type="submit"
            disabled={!isConnected || isSending || !draft.trim()}
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
