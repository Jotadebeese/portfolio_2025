import { getBlogBySlug, getBlogSlugs } from "@/lib/payload/actions";
import { notFound } from "next/navigation";
import Hero from "@/components/common/hero";
import BlockContent from "@/components/common/block-content";
import { Metadata } from "next";
import { Media } from "@/payload-types";
import { extractHeadingsFromBlocks } from "@/lib/payload/utils/extract-headings";
import Link from "next/link";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const notes = await getBlogSlugs();

  return notes.map((note) => ({
    slug: note.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const note = await getBlogBySlug(slug);

  if (!note) {
    notFound();
  }

  const metaImage = note.metaImage as Media;

  const title = note.metaTitle || note.title;
  const description = note.metaDescription || "Read this note on my portfolio.";
  const imageUrl = metaImage?.url || "/assets/bowser.jpeg";

  return {
    title,
    description,
    alternates: {
      canonical: `/notes/${slug}`,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: metaImage?.alt || "Lego set of Bowser from Mario.",
        },
      ],
    },
    twitter: {
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function BlogsPage({ params }: Props) {
  const { slug } = await params;

  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return notFound();
  }

  const image = blog.featuredImage as Media;

  const headings = extractHeadingsFromBlocks(blog.content);

  return (
    <>
      <Hero
        title={blog.title}
        description={blog.shortDescription}
        image={image}
        goBack={true}
      />
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 lg:gap-5">
        <main className="flex justify-start lg:col-span-9">
          <BlockContent data={blog.content} />
        </main>
        <aside className="mt-5 max-w-3xl lg:col-span-3 lg:block">
          <div className="sticky top-24 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h4 className="mb-4 border-b pb-2 font-bold text-gray-900">
              Contents
            </h4>
            <nav className="flex flex-col gap-3">
              {headings.length === 0 && (
                <p className="text-sm text-gray-400">No sections</p>
              )}

              {headings.map((heading) => (
                <Link
                  key={heading.id}
                  href={`#${heading.id}`}
                  className="text-sm text-gray-500 transition-all hover:pl-1 hover:text-amber-600"
                >
                  {heading.text}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </>
  );
}
