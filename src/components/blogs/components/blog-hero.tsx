import { Media } from "@/payload-types";
import { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { ChevronLeft } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";

export default function BlogHero({
  image,
  title,
  description,
  goBack = false,
}: {
  image: { url: string; alt: string };
  title: string;
  description: string | SerializedEditorState;
  goBack?: boolean;
}) {
  return (
    <div className="sm:border-border-color relative flex h-80 w-full max-w-3xl items-end overflow-hidden p-2.5 sm:rounded-lg sm:border sm:p-5 sm:shadow-sm">
      {goBack && (
        <Link
          href={"/blog"}
          className="text-background border-background hover:border-background absolute top-2 left-2 z-50 flex cursor-pointer items-center gap-1 border-b transition-all ease-in-out sm:border-transparent"
        >
          <ChevronLeft size={14} />
          <small>Back to Blogs</small>
        </Link>
      )}
      <Image
        src={image.url}
        alt={image.alt}
        fill
        className="w-full max-w-6xl object-cover object-center"
      />
      <div className="relative rounded-lg border-2 border-white bg-[#ffffff67] p-2 shadow-sm">
        <h1 className="text-2xl font-medium! text-white">{title}</h1>
        {typeof description === "string" ? (
          <p className="max-w-lg text-white">{description}</p>
        ) : (
          <RichText data={description} className="text-sm text-white" />
        )}
      </div>
    </div>
  );
}
