import { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText as RichTextConverter } from "@payloadcms/richtext-lexical/react";
import clsx from "clsx";
import { jsxConverter } from "./converters";

const CARD_PROSE_CLASSES = clsx(
  "prose prose-sm text-foreground w-full max-w-prose break-words",
  "[--tw-prose-body:var(--foreground)] [--tw-prose-headings:var(--foreground)] [--tw-prose-bold:var(--foreground)]",
  "prose-p:my-1.5 prose-p:leading-normal prose-p:text-pretty",
  "prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-li:leading-normal prose-li:text-pretty prose-li:marker:text-foreground/70",
  "prose-headings:my-1.5",
  "prose-a:text-code-rust prose-a:no-underline hover:prose-a:underline",
  "prose-code:text-code-rust prose-code:bg-code-light-gray prose-code:border-code-silver prose-code:rounded prose-code:border prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
);

type Props = {
  data: SerializedEditorState;
  variant?: "default" | "card";
} & React.HTMLAttributes<HTMLDivElement>;

export function RichText(props: Props) {
  const { className, variant = "default", ...rest } = props;

  return (
    <RichTextConverter
      {...rest}
      className={clsx(variant === "card" && CARD_PROSE_CLASSES, className)}
      converters={jsxConverter}
    />
  );
}
