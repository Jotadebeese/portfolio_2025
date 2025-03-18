import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
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
        generateImageName: ({ height, sizeName, extension, width }) => {
          return `custom-${sizeName}-${height}-${width}.${extension}`;
        },
      },
      {
        name: "card",
        width: 768,
        height: 1024,
        position: "centre",
        generateImageName: ({ height, sizeName, extension, width }) => {
          return `custom-${sizeName}-${height}-${width}.${extension}`;
        },
      },
      {
        name: "tablet",
        width: 1024,
        height: undefined,
        position: "centre",
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
  },
};
