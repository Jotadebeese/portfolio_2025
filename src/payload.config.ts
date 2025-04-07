import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { Projects } from "./collections/Projects";
import { Tags } from "./collections/Tags";
import { Tech } from "./collections/Tech";
import { BlogTags } from "./collections/BlogTags";
import { Blog } from "./collections/Blog";
import { AboutPage } from "./globals/about-page";
import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { BlogPage } from "./globals/blog-page";
import { HomePage } from "./globals/home-page";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
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
