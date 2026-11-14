import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { Lock } from "lucide-react";
import Hero from "@/components/common/hero";
import BlockContent from "@/components/common/block-content";
import TableOfContents from "@/components/blogs/components/table-of-contents";
import PrivateNoteGate from "@/components/blogs/components/private-note-gate";
import { getPrivateBlogBySlug } from "@/lib/payload/actions";
import { extractHeadingsFromBlocks } from "@/lib/payload/utils/extract-headings";
import { extractTextFromRichText } from "@/lib/payload/utils/extract-text";
import {
  getPrivateNoteCookieName,
  verifyPrivateNoteCookie,
  verifyPrivateNoteToken,
} from "@/lib/private-notes";
import type { Blog, Media } from "@/payload-types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

function extractTokenParam(token: string | string[] | undefined): string {
  if (typeof token === "string") return token.trim();
  if (Array.isArray(token) && typeof token[0] === "string") {
    return token[0].trim();
  }
  return "";
}

async function resolveAuthorizedNote(
  slug: string,
  tokenParam: string,
): Promise<{ blog: Blog | null; authorized: boolean; invalidTokenParam: boolean }> {
  const blog = await getPrivateBlogBySlug(slug);

  if (tokenParam) {
    const valid = Boolean(
      blog && verifyPrivateNoteToken(blog.accessToken, tokenParam),
    );
    return {
      blog,
      authorized: valid,
      invalidTokenParam: !valid,
    };
  }

  if (!blog) {
    return { blog: null, authorized: false, invalidTokenParam: false };
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(getPrivateNoteCookieName(slug))?.value;
  const cookieValid = verifyPrivateNoteCookie(
    slug,
    blog.accessToken,
    cookieValue,
  );

  return {
    blog,
    authorized: cookieValid,
    invalidTokenParam: false,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const tokenParam = extractTokenParam(sp.token);

  const { blog, authorized } = await resolveAuthorizedNote(slug, tokenParam);

  if (!authorized || !blog) {
    return {
      title: "Private Note",
      description: "Access token required.",
      robots: NOINDEX_ROBOTS,
    };
  }

  const description =
    blog.metaDescription ||
    extractTextFromRichText(blog.shortDescription) ||
    "Private note.";

  return {
    title: blog.metaTitle || blog.title,
    description,
    robots: NOINDEX_ROBOTS,
  };
}

export default async function PrivateBlogPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const tokenParam = extractTokenParam(sp.token);

  const { blog, authorized, invalidTokenParam } = await resolveAuthorizedNote(
    slug,
    tokenParam,
  );

  if (invalidTokenParam) {
    notFound();
  }

  if (!authorized || !blog) {
    return <PrivateNoteGate slug={slug} />;
  }

  const image = (blog.featuredImage || blog.metaImage) as Media;
  const headings = extractHeadingsFromBlocks(blog.content);
  const hasWorkbench = Boolean(
    Array.isArray(blog.content) &&
      blog.content.some(
        (b: any) => b.blockType === "tools-workbench" && !b.hideSelector,
      ),
  );
  const hasSidebar = headings.length > 0 || hasWorkbench;

  return (
    <>
      <div className="mb-3 flex items-center gap-1.5 px-2.5 text-xs text-foreground/60 sm:px-0">
        <Lock className="text-utils-scent-orange h-3.5 w-3.5" />
        <span>Private note · Unlisted &amp; not indexed</span>
      </div>
      <Hero
        title={blog.title}
        description={blog.shortDescription}
        image={image}
        goBack={false}
      />
      <div className="flex flex-col-reverse md:grid md:grid-cols-12 md:gap-5">
        <main
          className={clsx(
            "flex justify-start",
            hasSidebar ? "md:col-span-9" : "md:col-span-12",
          )}
        >
          <BlockContent data={blog.content} />
        </main>
        <TableOfContents headings={headings} />
      </div>
    </>
  );
}
