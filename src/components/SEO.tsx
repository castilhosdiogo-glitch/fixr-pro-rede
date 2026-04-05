import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  type?: string;
  image?: string;
  url?: string;
  canonicalUrl?: string;
  schema?: Record<string, unknown>;
  keywords?: string[];
}

export const SEO = ({
  title = "Fixr — Conectando Você aos Melhores Profissionais",
  description = "Fixr é a plataforma que conecta clientes a profissionais autônomos verificados. Encontre eletricistas, encanadores, pintores e muito mais. Crie seu perfil grátis e receba clientes.",
  type = "website",
  image = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3f45a7a9-2c91-4de7-b68e-1c6f51d09bd1/id-preview-6fda0cae--7861afd0-bb2a-4dfe-9cef-56b7ddf79a73.lovable.app-1773269197454.png",
  url = "https://fixr.com.br", // Recomenda-se trocar pelo domínio final quando existir
  canonicalUrl,
  schema,
  keywords = ["serviços domésticos", "profissionais", "eletricista", "encanador", "pintor", "diarista", "fixr", "marketplace de serviços"],
}: SEOProps) => {
  const currentUrl = canonicalUrl || url;

  // Schema Markup Base (Organization) - Crucial para o Google entender que o Fixr é uma Entidade
  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Fixr",
    url: "https://fixr.com.br",
    logo: image,
    description: "Plataforma de intermediação de serviços domésticos que conecta clientes a profissionais verificados.",
  };

  // Se a página atual passar um Schema específico (ex: Person para o Perfil do Profissional), usamos ele
  const finalSchema = schema || defaultSchema;

  return (
    <Helmet htmlAttributes={{ lang: 'pt-BR' }}>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && <meta name="keywords" content={keywords.join(", ")} />}
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook (Compartilhamento Perfeito no WhatsApp/Insta) */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content="Fixr" />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter (X) */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Structured Data (JSON-LD) para Resultados Ricos no Google */}
      <script type="application/ld+json">
        {JSON.stringify(finalSchema)}
      </script>
    </Helmet>
  );
};
