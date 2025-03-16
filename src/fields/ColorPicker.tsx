"use client";

import { useEffect, useRef, useState } from "react";
import { TwitterPicker } from "react-color";
import { useField } from "@payloadcms/ui";

export default function ColorPicker({ path }: { path: string }) {
  const { value, setValue } = useField<string>({ path });
  const [open, setOpen] = useState(false);
  const handleChange = (color: any) => {
    setValue(color.hex);
  };
  const toggleRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toggleRef.current &&
        !(toggleRef.current as HTMLElement).contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p>
        Background color picker <span className="text-red-500">*</span>
      </p>
      <div className="parent-input flex w-fit flex-col gap-2">
        <p
          onClick={() => setOpen(!open)}
          style={{ background: value, border: `1px solid ${value}` }}
          className={`${value === "#ffffff" ? "text-black" : ""} ${value === "#000000" ? "bg-white" : ""} flex w-21 cursor-pointer items-center justify-center rounded p-2 font-medium`}
        >
          {value}
        </p>
        {open && (
          <div ref={toggleRef}>
            <TwitterPicker
              color={value || "#ffffff"}
              colors={[
                "#FF6900",
                "#FCB900",
                "#7BDCB5",
                "#00D084",
                "#8ED1FC",
                "#0693E3",
                "#ABB8C3",
                "#EB144C",
                "#F78DA7",
                "#9900EF",
                "#000000",
                "#333333",
                "#666666",
                "#FFFFFF",
              ]}
              onChangeComplete={(color: any) => handleChange(color)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
