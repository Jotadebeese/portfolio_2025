"use client";
import React from "react";
import { useAuth } from "@payloadcms/ui";

export default function CustomAvatar(props: any) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || "?";

  return (
    <div className="bg-foreground/10 border-border-color flex aspect-square h-full w-fit items-center justify-center rounded-full border p-2">
      <div className="text-foreground">{initials}</div>
    </div>
  );
}
