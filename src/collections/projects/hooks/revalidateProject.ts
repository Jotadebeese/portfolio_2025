import { Project } from "@/payload-types";
import { revalidatePath, revalidateTag } from "next/cache";
import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

export const revalidateProject: CollectionAfterChangeHook<Project> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === "published") {
      const path = `/projects/${doc.slug}`;

      payload.logger.info(`Revalidating project at ${path}`);

      revalidatePath(path);
      revalidateTag("projects");
    }

    if (previousDoc._status === "published" && doc._status !== "published") {
      const oldPath = `/projects/${previousDoc.slug}`;

      payload.logger.info(`Revalidating old project at ${oldPath}`);

      revalidatePath(oldPath);
      revalidateTag("projects");
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
    revalidateTag("projects");
  }
  return doc;
};
