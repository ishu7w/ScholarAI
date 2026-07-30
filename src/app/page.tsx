import SmoothScroll from "@/components/providers/SmoothScroll";
import CursorGlow from "@/components/effects/CursorGlow";
import LoadingScreen from "@/components/effects/LoadingScreen";
import ScrollProgress from "@/components/effects/ScrollProgress";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing/Hero";
import { Features, HowItWorks, Stats } from "@/components/landing/Sections";
import { FAQ, FinalCTA, Footer, Pricing, Testimonials } from "@/components/landing/Social";
import ChatAssistant from "@/components/chat/ChatAssistant";

export default function Home() {
  return (
    <SmoothScroll>
      <LoadingScreen />
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <Testimonials />
        <FAQ />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
      <ChatAssistant />
    </SmoothScroll>
  );
}
