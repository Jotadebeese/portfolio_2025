import { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import { headingConverter } from "./heading-converter";
import { codeConverter } from "./code-converter";

export const jsxConverter: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...headingConverter,
  ...codeConverter,
});
