import { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import { headingConverter } from "./heading-converter";
import { codeConverter } from "./code-converter";
import { linkConverter } from "./link-converter";
import { listItemConverter } from "./list-item-converter";
import { paragraphConverter } from "./paragraph-converter";

export const jsxConverter: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...paragraphConverter,
  ...headingConverter,
  ...codeConverter,
  ...linkConverter,
  ...listItemConverter,
});
