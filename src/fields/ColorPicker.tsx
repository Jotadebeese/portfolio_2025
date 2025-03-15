"use client";

import React from "react";
import { ChromePicker } from "react-color";
import { useField } from "@payloadcms/ui";

export default function ColorPicker({ path }: { path: string }) {
  const { value, setValue } = useField<string>({ path });
  return (
    <div>
      <ChromePicker
        color={value || "#ffffff"}
        onChangeComplete={(color) => setValue(color.hex)}
      />
    </div>
  );
}
