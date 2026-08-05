"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Line-masked text reveal using SplitText. */
export default function TextReveal({
  text,
  className,
  as: Tag = "h2",
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.firstElementChild as HTMLElement | null;
    if (!el) return;

    let split: SplitText | undefined;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        // The mask wrappers clip to the line box. Uppercase display type with
        // tight leading overflows that box, so the bottom of every line stays
        // clipped after the reveal finishes. Pad each wrapper and pull the
        // padding back out of the layout so nothing shifts.
        onSplit(self) {
          for (const line of self.lines) {
            const wrapper = line.parentElement;
            if (!wrapper) continue;
            wrapper.style.paddingBottom = "0.14em";
            wrapper.style.marginBottom = "-0.14em";
          }
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            delay,
            stagger: 0.08,
            ease: "power4.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        },
      });
    }, ref);

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [delay, text]);

  return (
    <div ref={ref}>
      <Tag className={cn(className)}>{text}</Tag>
    </div>
  );
}
