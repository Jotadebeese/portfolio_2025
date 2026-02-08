import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { AboutPage } from "./globals/about-page";
import { BlogPage } from "./globals/blog-page";
import { HomePage } from "./globals/home-page";

import { Media } from "./collections/media";
import { Projects } from "./collections/projects";
import { Tech } from "./collections/tech";
import { BlogTags } from "./collections/blogtags";
import { Blog } from "./collections/blog";
import { Tags } from "./collections/tags";
import { Users } from "./collections/users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      graphics: {
        Logo: "/components/payload/logo",
        Icon: "/components/payload/icon",
      },
    },
    avatar: {
      Component: "/components/payload/custom-avatar",
    },
    meta: {
      titleSuffix: "- Admin Jota",
      icons: [
        {
          rel: "icon",
          type: "image/ico",
          url: "/assets/favicon.ico",
        },
      ],
      openGraph: {
        images: [
          {
            url: "/assets/bowser.jpeg",
            alt: "Lego set of Bowser from Mario.",
          },
        ],
      },
    },
  },
  collections: [Users, Media, Projects, Tags, Tech, BlogTags, Blog],
  globals: [AboutPage, BlogPage, HomePage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
    autoGenerate: true,
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      enabled: true,
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
});
