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
      const path = `/notes/${doc.slug}`;

      payload.logger.info(`Revalidating blog at ${path}`);

      revalidatePath(path);
      revalidatePath("/notes");
      revalidateTag("blogs", { expire: 0 });
    }

    if (previousDoc._status === "published" && doc._status !== "published") {
      const oldPath = `/notes/${previousDoc.slug}`;

      payload.logger.info(`Revalidating old blog at ${oldPath}`);

      revalidatePath(oldPath);
      revalidateTag("blogs", { expire: 0 });
    }
  }
  return doc;
};

export const revalidateDetete: CollectionAfterDeleteHook<Blog> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/notes/${doc?.slug}`;

    payload.logger.info(`Revalidating blog deletion at ${path}`);
    revalidatePath("/notes");
    revalidatePath(path);
    revalidateTag("blogs", { expire: 0 });
  }
  return doc;
};
