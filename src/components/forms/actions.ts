"use server";
export default async function sendMessage(formData: FormData) {
  const res = await fetch(process.env.APP_SCRIPT_URL as string, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to send message");
  }
  return res.json();
}
