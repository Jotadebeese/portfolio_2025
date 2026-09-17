import { getBlogBySlug, getBlogSlugs } from "@/lib/payload/actions";
import { notFound } from "next/navigation";
import Hero from "@/components/common/hero";
import BlockContent from "@/components/common/block-content";
import { Metadata } from "next";
import { Media } from "@/payload-types";
import { extractHeadingsFromBlocks } from "@/lib/payload/utils/extract-headings";
import TableOfContents from "@/components/blogs/components/table-of-contents";
import clsx from "clsx";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const notes = await getBlogSlugs();

  return (notes || []).map((note) => ({
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
      card: "summary_large_image",
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
  const baseUrl = process.env.NEXT_WEB_APP_PUBLIC_URL || "http://localhost:3000";

  const postUrl = `${baseUrl}/notes/${blog.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: blog.title,
        description: blog.metaDescription || "Read this note on my portfolio.",
        image: image?.url ? [image.url] : undefined,
        datePublished: blog.publishedAt,
        dateModified: blog.updatedAt || blog.publishedAt,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": postUrl,
        },
        author: {
          "@type": "Person",
          name: "Juan Bedoya",
          url: baseUrl,
          sameAs: [
            "https://github.com/Jotadebeese",
            "https://www.linkedin.com/in/jotadebeese/",
          ],
        },
        publisher: {
          "@type": "Person",
          name: "Juan Bedoya",
          url: baseUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Notes",
            item: `${baseUrl}/notes`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: blog.title,
            item: postUrl,
          },
        ],
      },
    ],
  };

  const headings = extractHeadingsFromBlocks(blog.content);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero
        title={blog.title}
        description={blog.shortDescription}
        image={image}
        goBack={true}
      />
      <div className="flex flex-col-reverse md:grid md:grid-cols-12 md:gap-5">
        <main
          className={clsx(
            "flex justify-start",
            headings.length > 0 ? "md:col-span-9" : "md:col-span-12",
          )}
        >
          <BlockContent data={blog.content} />
        </main>
        <TableOfContents headings={headings} />
      </div>
    </>
  );
}
