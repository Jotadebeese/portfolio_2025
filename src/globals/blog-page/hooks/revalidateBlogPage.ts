import { revalidatePath, revalidateTag } from "next/cache";
import { GlobalAfterChangeHook } from "payload";

export const revalidateBlogPage: GlobalAfterChangeHook = async ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = "/notes";

    payload.logger.info(`Revalidating blog page at ${path}`);
    revalidatePath(path);
    revalidateTag("blog-page");
  }
  return doc;
};
