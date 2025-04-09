export default function ContactForm() {
  return (
    <form className="flex w-full max-w-md flex-col divide-dashed rounded-[18px]">
      <h3 className="px-5 py-2.5">Send me a message if you feel like:</h3>
      <div className="contact-form text-foreground bg-background flex w-full max-w-md flex-col gap-2.5 divide-dashed rounded-2xl p-5 text-sm">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="A name or nickname."
          required
        />
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Any email will do it, not required."
        />
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          placeholder="Could be a joke"
          required
        ></textarea>
        <button
          type="submit"
          className="bg-foreground cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:bg-emerald-800"
        >
          Send
        </button>
      </div>
    </form>
  );
}
