import React from "react";
import logo from "@/assets/jota.png";
import logoDark from "@/assets/jota.png";
import Image from "next/image";

export default function Logo() {
  return (
    <div className="bg-utils-scent-orange border-border-color h-20 w-20 overflow-hidden rounded-full border">
      <Image className="h-20 object-contain dark:hidden" src={logo} alt="" />
      <Image
        className="hidden h-20 object-contain dark:block"
        src={logoDark}
        alt=""
      />
    </div>
  );
}
