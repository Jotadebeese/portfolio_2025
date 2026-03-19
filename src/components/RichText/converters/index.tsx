import { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import { headingConverter } from "./heading-converter";
import { codeConverter } from "./code-converter";
import { linkConverter } from "./link-converter";

export const jsxConverter: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...headingConverter,
  ...codeConverter,
  ...linkConverter,
});
