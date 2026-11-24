import CTAButton from "@/components/common/cta-button";
import { ChevronLeft } from "lucide-react";

export default function ForthwebNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl md:text-[10rem]">404</h1>
      <p className="text-foreground mb-8">
        That tool or page doesn&apos;t exist on forthweb.
      </p>
      <CTAButton href="/" variant="secondary">
        <ChevronLeft
          size={16}
          aria-hidden="true"
          className="transition-transform duration-150 ease-out group-hover:-translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
        />
        <span>Back to Workbench</span>
      </CTAButton>
    </div>
  );
}
