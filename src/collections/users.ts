import type { CollectionConfig } from "payload";
import { buildResetPasswordEmail, resolveAdminBaseUrl } from "@/lib/email";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: {
    forgotPassword: {
      generateEmailSubject: () => "Reset your Jota Admin password",
      generateEmailHTML: (args) => {
        const token = args?.token ?? "";
        const baseUrl = resolveAdminBaseUrl(args?.req);
        const resetUrl = `${baseUrl}/admin/reset/${encodeURIComponent(token)}`;
        const userName =
          typeof args?.user?.name === "string" && args.user.name.trim()
            ? args.user.name.trim()
            : undefined;

        return buildResetPasswordEmail({
          resetUrl,
          userName,
          expiresIn: "1 hour",
        });
      },
    },
  },
  fields: [
    {
      name: "name",
      type: "text",
    },
  ],
};
