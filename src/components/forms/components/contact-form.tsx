import { useActionState } from "react";
import sendMessage, { ActionResult } from "../actions";
import Image from "next/image";
import bowserGif from "../../../../public/assets/temp.gif";

export default function ContactForm() {
  const initialState: ActionResult | null = null;

  const [state, formAction, pending] = useActionState(
    sendMessage,
    initialState,
  );

  return (
    <>
      {/* Success State */}
      {state?.result === "success" && (
        <div className="flex flex-col items-center justify-center">
          <h3>Thank you!</h3>
          <p className="text-foreground text-sm">
            {state.message || "Your message has been sent successfully."}
          </p>
        </div>
      )}

      {pending && (
        <div className="flex w-full max-w-md flex-col items-center justify-center gap-2.5 divide-dashed rounded-2xl p-5 text-sm">
          <Image
            unoptimized
            src={bowserGif}
            alt="Loading..."
            className="h-20 w-20"
          />
          <div className="text-foreground h-4 w-4 animate-spin bg-amber-700"></div>
          <div className="text-foreground text-sm">Sending message...</div>
        </div>
      )}
      {!pending && state?.result !== "success" && (
        <form
          action={formAction}
          className="flex w-full max-w-md flex-col divide-dashed rounded-[18px]"
          noValidate
        >
          <h3 className="px-5 py-2.5">Send me a message if you feel like:</h3>
          {/* Display general server errors or validation summary messages */}
          {state?.result === "error" && state.message && (
            <div className="mb-4 rounded-xl bg-red-100 px-5 py-2.5 text-xs text-red-600">
              {state.message}
              {state.errors?.server && (
                <p className="mt-1">({state.errors.server})</p>
              )}
            </div>
          )}
          <div className="contact-form text-foreground bg-background flex w-full max-w-md flex-col gap-2.5 divide-dashed rounded-2xl p-5 text-sm">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="A name or nickname."
              required
              defaultValue={state?.submittedData?.name ?? ""}
              aria-invalid={!!state?.errors?.name}
              aria-describedby="name-error"
              className="text-base"
            />
            {state?.errors?.name && (
              <p id="name-error" className="mt-1 text-xs text-red-600">
                {state.errors.name.join(", ")}
              </p>
            )}
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Any email will do it, not required."
              defaultValue={state?.submittedData?.email ?? ""}
              aria-invalid={!!state?.errors?.email}
              aria-describedby="email-error"
              className="text-base"
            />
            {state?.errors?.email && (
              <p id="email-error" className="mt-1 text-xs text-red-600">
                {state.errors.email.join(", ")}
              </p>
            )}
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              placeholder="Could be a joke"
              required
              defaultValue={state?.submittedData?.message ?? ""}
              aria-invalid={!!state?.errors?.message}
              aria-describedby="message-error"
              className="min-h-24 text-base"
            ></textarea>
            {state?.errors?.message && (
              <p id="message-error" className="mt-1 text-xs text-red-600">
                {state.errors.message.join(", ")}
              </p>
            )}
            <button
              type="submit"
              className="bg-foreground cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:bg-emerald-800"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </>
  );
}
