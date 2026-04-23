import { z } from "zod";

export const ContactFormSchema = z.object({
    name: z.string().min(1, "Name is required."),
    email: z
        .string()
        .email("Please enter a valid email address.")
        .optional()
        .or(z.literal("")),
    message: z.string().min(5, "Message must be at least 5 characters long."),
});