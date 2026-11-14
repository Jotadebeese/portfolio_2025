"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPrivateBlogBySlug } from "@/lib/payload/actions";
import {
  getPrivateNoteCookieName,
  signPrivateNoteCookie,
  verifyPrivateNoteToken,
} from "@/lib/private-notes";

export interface UnlockState {
  error?: string;
}

export async function unlockPrivateNote(
  slug: string,
  _prevState: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const rawToken = formData.get("token");
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  if (!token) {
    return { error: "Please enter an access token." };
  }

  const blog = await getPrivateBlogBySlug(slug);
  if (!blog || !verifyPrivateNoteToken(blog.accessToken, token)) {
    return { error: "Invalid access token." };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    getPrivateNoteCookieName(slug),
    signPrivateNoteCookie(slug, blog.accessToken!),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/notes/p/${encodeURIComponent(slug)}`,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  );

  redirect(`/notes/p/${encodeURIComponent(slug)}`);
}
