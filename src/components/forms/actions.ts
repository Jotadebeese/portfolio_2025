"use server";

import { z } from "zod";

// Define the shaoe of the state returned by the action
export interface ActionResult {
  result: "success" | "error";
  message?: string;
  errors?: {
    name?: string[];
    email?: string[];
    message?: string[];
    server?: string;
  };
  submittedData?: {
    name: string;
    email: string;
    message: string;
  };
}

// Define the Zod schema for validation
const ContactFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z
    .string()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),
  message: z.string().min(5, "Message must be at least 5 characters long."),
});

export default async function sendMessage(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const rawFormData = {
    name: (formData.get("name") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    message: (formData.get("message") as string) ?? "",
  };

  const validatedFields = ContactFormSchema.safeParse(rawFormData);

  // If validation fails, return errors
  if (!validatedFields.success) {
    console.error(
      "Validation Errors:",
      validatedFields.error.flatten().fieldErrors,
    );
    return {
      result: "error",
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Fix the errors in the form and try again.",
      submittedData: rawFormData,
    };
  }

  // 2. If validation succeeds, proceed to send data
  const { name, email, message } = validatedFields.data;
  const appScriptUrl = process.env.APP_SCRIPT_URL;

  if (!appScriptUrl) {
    console.error("App Script URL environment variable is not set.");
    return {
      result: "error",
      message: "Server configuration error.",
      errors: { server: "Server configuration error." },
      submittedData: rawFormData,
    };
  }

  const dataToSend = new FormData();
  dataToSend.append("name", name);
  if (email) {
    dataToSend.append("email", email);
  }
  dataToSend.append("message", message);

  try {
    const res = await fetch(appScriptUrl, {
      method: "POST",
      body: dataToSend,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        "Failed to send message to Apps Script:",
        res.status,
        errorText,
      );
      return {
        result: "error",
        message: `Failed to send message (Status: ${res.status}). Try again.`,
        errors: { server: `API error: ${res.status}` },
        submittedData: rawFormData,
      };
    }

    const responseJson = await res.json();
    console.log("Apps Script Response:", responseJson);

    if (responseJson.result === "success") {
      return {
        result: "success",
        message: "Your message has been sent successfully.",
      };
    } else {
      return {
        result: "error",
        message:
          responseJson.message || "An unexpected error occurred from the API.",
        errors: { server: responseJson.message || "API processing error." },
        submittedData: rawFormData,
      };
    }
  } catch (error) {
    console.error("Error sending message:", error);
    let errorMessage = "An unexpected error occurred. Please try again later.";
    if (error instanceof Error) {
      errorMessage = error.message; // More specific error if available
    }
    return {
      result: "error",
      message: errorMessage,
      errors: { server: errorMessage },
      submittedData: rawFormData,
    };
  }
}
