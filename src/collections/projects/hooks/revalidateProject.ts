import { Project } from "@/payload-types";
import { revalidatePath, revalidateTag } from "next/cache";
import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

export const revalidateProject: CollectionAfterChangeHook<Project> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (
      doc._status === "published" ||
      (!doc._status && previousDoc?._status === "published")
    ) {
      const slug = doc.slug || previousDoc?.slug;
      const path = `/projects/${slug}`;

      payload.logger.info(`Revalidating project at ${path}`);

      if (slug) revalidatePath(path);
      revalidatePath("/");
      revalidateTag("projects", { expire: 0 });
    }

    if (
      previousDoc?._status === "published" &&
      doc._status &&
      doc._status !== "published"
    ) {
      const oldPath = `/projects/${previousDoc.slug}`;

      payload.logger.info(`Revalidating old project at ${oldPath}`);

      revalidatePath(oldPath);
      revalidatePath("/");
      revalidateTag("projects", { expire: 0 });
    }
  }
  return doc;
};

export const revalidateDelete: CollectionAfterDeleteHook<Project> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/projects/${doc?.slug}`;

    payload.logger.info(`Revalidating project deletion at ${path}`);

    revalidatePath(path);
    revalidatePath("/");
    revalidateTag("projects", { expire: 0 });
  }
  return doc;
};
