import { Blog } from "@/payload-types";
import { revalidatePath, revalidateTag } from "next/cache";
import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

export const revalidateBlog: CollectionAfterChangeHook<Blog> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === "published") {
      const path = `/blog/${doc.slug}`;

      payload.logger.info(`Revalidating blog at ${path}`);

      revalidatePath(path);
      revalidateTag("blogs");
    }

    if (previousDoc._status === "published" && doc._status !== "published") {
      const oldPath = `/blog/${previousDoc.slug}`;

      payload.logger.info(`Revalidating old blog at ${oldPath}`);

      revalidatePath(oldPath);
      revalidateTag("blogs");
    }
  }
  return doc;
};

export const revalidateDetete: CollectionAfterDeleteHook<Blog> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/blog/${doc?.slug}`;

    payload.logger.info(`Revalidating blog deletion at ${path}`);

    revalidatePath(path);
    revalidateTag("blogs");
  }
  return doc;
};
