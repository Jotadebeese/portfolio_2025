import Image from "next/image";
import bowser from "@/assets/error.png";
import BlogsSection from "@/components/blogs/layout/blogs-section";
export default function Blog() {
  return (
    <div className="w-full sm:px-5 sm:pt-20">
      <div className="sm:border-border-color relative flex h-80 w-full max-w-3xl items-end overflow-hidden p-2.5 sm:rounded-2xl sm:border sm:p-5 sm:shadow-sm">
        <Image
          src={bowser}
          alt={"Bowser in Lego eating my hand"}
          fill
          className="w-full max-w-6xl object-cover object-center"
        />
        <div className="relative rounded-2xl border-2 border-white bg-[#ffffff67] p-2 shadow-sm">
          <h1 className="text-3xl font-medium! text-white">BLOGS</h1>
          <p className="max-w-lg text-white">
            Here are some writes about thenology, personal topics and anything
            that catch my attention.
          </p>
        </div>
      </div>
      <BlogsSection />
    </div>
  );
}
