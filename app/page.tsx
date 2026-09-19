import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import VoiceDemo from '@/components/VoiceDemo';
import HowItWorks from '@/components/HowItWorks';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/lib/i18n';

export default function Home() {
  return (
    <LanguageProvider>
      <main className="min-h-screen bg-bg-base">
        <Navbar />
        <Hero />
        <VoiceDemo />
        <HowItWorks />
        <Footer />
      </main>
    </LanguageProvider>
  );
}
