import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiScissors } from 'react-icons/fi';
import { AppFooter } from '../../components/common';
import { legalDocuments, legalConfig } from '../../constants/legal';
import type { LegalBlock } from '../../constants/legal';

interface LegalLayoutProps {
  slug: string;
}

const BlockView: React.FC<{ block: LegalBlock }> = ({ block }) => {
  if (block.kind === 'heading') {
    return <h3 className="mt-5 mb-2 text-[15px] font-bold text-white">{block.text}</h3>;
  }
  if (block.kind === 'list') {
    return (
      <ul className="mb-3 space-y-1.5 text-[14px] leading-relaxed text-[#C9C9C9] list-disc pl-5">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p className="mb-3 text-[14px] leading-relaxed text-[#C9C9C9]">{block.text}</p>;
};

export const LegalLayout: React.FC<LegalLayoutProps> = ({ slug }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const legalDoc = legalDocuments.find((doc) => doc.slug === slug);

  useEffect(() => {
    if (!legalDoc) return;
    const hash = location.hash.replace('#', '');
    if (hash) {
      window.document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash, legalDoc]);

  if (!legalDoc) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-[#8A8A8A]">Documento no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center justify-between border-b border-[#282828] px-6 py-4 sticky top-0 bg-[#050505]/95 backdrop-blur z-20">
        <div
          className="flex cursor-pointer items-center gap-2 text-[16px] font-bold text-white"
          onClick={() => navigate('/')}
        >
          <FiScissors className="text-[#FF5C00]" />
          Barbería SA
        </div>
        <span className="text-[12px] text-[#8A8A8A]">Legal</span>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
        <div className="mb-8 border-b border-[#282828] pb-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 text-[11px] text-[#8A8A8A] mb-3">
            Versión {legalDoc.version} · Actualizado el {legalConfig.lastUpdated}
          </span>
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em] sm:text-[32px]">
            {legalDoc.title}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] text-[#8A8A8A]">{legalDoc.description}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav className="hidden lg:block">
            <ul className="sticky top-20 space-y-2">
              {legalDoc.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block text-[13px] text-[#8A8A8A] hover:text-[#FF5C00] transition-colors"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            {legalDoc.sections.map((section) => (
              <section key={section.id} id={section.id} className="mb-8 scroll-mt-24">
                <h2 className="mb-3 text-[18px] font-bold text-white">{section.heading}</h2>
                {section.blocks.map((block, i) => (
                  <BlockView key={i} block={block} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};
