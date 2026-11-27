"use client";
import React from "react";
import { useAuth } from "@payloadcms/ui";

export default function CustomAvatar() {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || "?";

  return (
    <div className="bg-utils-scent-gray-01/70 border-border-color text-foreground flex aspect-square h-full w-fit items-center justify-center rounded-full border p-2 text-xs font-medium">
      <span>{initials}</span>
    </div>
  );
}
