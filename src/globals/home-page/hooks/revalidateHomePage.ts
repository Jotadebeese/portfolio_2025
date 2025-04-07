import { revalidateTag } from "next/cache";
import { GlobalAfterChangeHook } from "payload";

export const revalidateHomePage: GlobalAfterChangeHook = async ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = "/";

    payload.logger.info(`Revalidating home page at ${path}`);
    revalidateTag("home-page");
  }
  return doc;
};
