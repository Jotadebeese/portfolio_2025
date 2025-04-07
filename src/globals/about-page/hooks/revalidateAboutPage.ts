import { revalidateTag } from "next/cache";
import { GlobalAfterChangeHook } from "payload";

export const revalidateAboutPage: GlobalAfterChangeHook = async ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = "/about";

    payload.logger.info(`Revalidating about page at ${path}`);
    revalidateTag("about-page");
  }
  return doc;
};
