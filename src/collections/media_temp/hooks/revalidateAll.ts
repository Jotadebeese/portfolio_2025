import { revalidatePath } from "next/cache";
import { CollectionAfterChangeHook } from "payload";

export const revalidateAll: CollectionAfterChangeHook = async ({ doc }) => {
  try {
    revalidatePath("/", "layout");
    console.log(
      `Successfully triggered site-wide revalidation for layout due to change in: ${doc.filename}`,
    );
  } catch (err) {
    console.error(`Error during site-wide revalidation: ${err}`);
  }
};
