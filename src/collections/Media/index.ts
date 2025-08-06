import type { CollectionConfig } from "payload";
import { generateBlurData } from "./hooks/generateBlurData";
import { revalidateAll } from "./hooks/revalidateAll";

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [generateBlurData],
    afterChange: [revalidateAll],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
    {
      name: "blurData",
      type: "text",
      required: true,
    },
  ],
  upload: {
    adminThumbnail: "thumbnail",
    imageSizes: [
      {
        name: "thumbnail",
        width: 400,
        height: 300,
        position: "centre",
        formatOptions: {
          format: "webp",
          options: {
            quality: 90,
          },
        },
        generateImageName: ({
          height,
          sizeName,
          extension,
          width,
          originalName,
        }) => {
          return `${originalName}-${sizeName}-${height}-${width}.${extension}`;
        },
      },
      {
        name: "card",
        width: 768,
        height: 1024,
        position: "centre",

        formatOptions: {
          format: "webp",
          options: {
            quality: 90,
          },
        },
        generateImageName: ({
          height,
          sizeName,
          extension,
          width,
          originalName,
        }) => {
          return `${originalName}-${sizeName}-${height}-${width}.${extension}`;
        },
      },
      {
        name: "tablet",
        width: 1024,
        height: undefined,
        position: "centre",
        formatOptions: {
          format: "webp",
          options: {
            quality: 90,
          },
        },
        generateImageName: ({
          height,
          sizeName,
          extension,
          width,
          originalName,
        }) => {
          return `${originalName}-${sizeName}-${height}-${width}.${extension}`;
        },
      },
      {
        name: "desktop",
        width: 1440,
        height: undefined,
        position: "centre",
        formatOptions: {
          format: "webp",
          options: {
            quality: 90,
          },
        },
        generateImageName: ({
          height,
          sizeName,
          extension,
          width,
          originalName,
        }) => {
          return `${originalName}-${sizeName}-${height}-${width}.${extension}`;
        },
      },
    ],
    mimeTypes: ["image/*"],
    displayPreview: true,
    formatOptions: {
      format: "webp",
      options: {
        quality: 90,
      },
    },
  },
};
