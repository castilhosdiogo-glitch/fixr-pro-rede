import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      category: "Para Clientes",
      items: [
        {
          question: "O que é o Fixr?",
          answer:
            "O Fixr é uma plataforma que conecta você a profissionais autônomos verificados para serviços domésticos como instalações elétricas, encanamento, faxina, pintura, alvenaria e muito mais. Tudo de forma segura, rápida e com pagamento protegido.",
        },
        {
          question: "Como faço para solicitar um serviço?",
          answer:
            "É simples: baixe o aplicativo Fixr, crie sua conta, escolha a categoria do serviço que precisa, descreva o problema e informe o endereço e urgência. Profissionais verificados próximos a você receberão seu pedido e entrarão em contato.",
        },
        {
          question: "Como funciona o pagamento?",
          answer:
            "O pagamento é feito diretamente pela Plataforma, de forma segura. Você paga antes do início do serviço e o valor fica retido pela Fixr. O profissional só recebe após você confirmar que o serviço foi concluído satisfatoriamente. Isso garante sua segurança.",
        },
        {
          question: "O que acontece se eu não estiver satisfeito com o serviço?",
          answer:
            "Se o serviço não for realizado conforme combinado, você pode abrir uma disputa diretamente no aplicativo. Nossa equipe de suporte irá mediar o caso e, conforme análise, poderá reter o pagamento até a resolução ou realizar o reembolso.",
        },
        {
          question: "Os profissionais são verificados?",
          answer:
            "Sim. Todos os profissionais cadastrados no Fixr passam por um processo de verificação de identidade com envio de documento oficial e selfie. Além disso, cada profissional tem um histórico público de avaliações de clientes reais.",
        },
        {
          question: "Posso cancelar um pedido?",
          answer:
            "Sim. Você pode cancelar um pedido antes do início do serviço e receberá reembolso integral. Cancelamentos após o início do serviço estão sujeitos à política de cancelamento vigente, disponível no aplicativo.",
        },
        {
          question: "Como avalio um profissional?",
          answer:
            "Após a conclusão do serviço, você receberá uma notificação para avaliar o profissional. A avaliação inclui uma nota geral (1 a 5 estrelas) e avaliações específicas sobre pontualidade, qualidade, comunicação e preço. Suas avaliações ajudam outros clientes a escolherem bem.",
        },
        {
          question: "O Fixr atende minha cidade?",
          answer:
            "O Fixr está em expansão contínua. Iniciamos em Porto Alegre e região metropolitana e estamos crescendo para outras cidades do Brasil. Baixe o app e veja se há cobertura na sua região — ou se cadastre na lista de espera para ser avisado quando chegarmos.",
        },
        {
          question: "Meus dados estão seguros?",
          answer:
            "Sim. A Fixr segue rigorosamente a Lei Geral de Proteção de Dados (LGPD) e adota criptografia e as melhores práticas de segurança para proteger suas informações. Seus dados nunca são vendidos para terceiros.",
        },
      ],
    },
    {
      category: "Para Profissionais",
      items: [
        {
          question: "Como me cadastro como profissional no Fixr?",
          answer:
            "Baixe o aplicativo Fixr, selecione 'Sou Profissional' no cadastro, preencha seus dados pessoais, escolha suas especialidades e envie os documentos solicitados para verificação. Após aprovação (em até 24 horas), seu perfil ficará visível para os clientes.",
        },
        {
          question: "Quais documentos preciso enviar?",
          answer:
            "Para se tornar um Profissional Verificado Fixr você precisará enviar: documento oficial com foto (RG ou CNH, frente e verso), selfie segurando o documento e comprovante de residência. Para algumas categorias podem ser solicitados certificados técnicos adicionais.",
        },
        {
          question: "Quanto custa usar o Fixr?",
          answer:
            "O cadastro é gratuito no plano Explorador, com comissão de 15% sobre cada serviço. O plano Parceiro (R$ 29,90/mês) reduz a comissão para 10% e libera recursos extras como áudio, vídeo no chat, agenda e hub fiscal.",
        },
        {
          question: "Como e quando recebo o pagamento?",
          answer:
            "O pagamento é repassado para sua chave PIX cadastrada em até 24 horas após o cliente confirmar a conclusão do serviço. Você acompanha todos os seus recebimentos no painel financeiro do aplicativo.",
        },
        {
          question: "Posso recusar pedidos?",
          answer:
            "Sim. Você escolhe quais pedidos aceitar. No entanto, uma taxa de recusa muito alta pode impactar seu posicionamento nos resultados de busca da Plataforma. Recomendamos aceitar apenas pedidos que você realmente pode atender.",
        },
        {
          question: "O que é o Plano Parceiro?",
          answer:
            "O Plano Parceiro (R$ 29,90/mês) oferece comissão reduzida de 10%, solicitações ilimitadas, destaque nos resultados de busca, chat com áudio e vídeo, agenda integrada, hub fiscal e muito mais. O plano Explorador é gratuito e permite até 8 solicitações por mês.",
        },
        {
          question: "Posso abrir meu MEI pelo Fixr?",
          answer:
            "Sim! O Fixr oferece um módulo de formalização integrado onde você pode abrir seu MEI, emitir notas fiscais e acompanhar suas obrigações fiscais — tudo sem sair do aplicativo. A formalização aumenta suas chances de conquistar clientes empresariais.",
        },
        {
          question: "O que é o Fixx?",
          answer:
            "O Fixx é a plataforma financeira do ecossistema Fixr, em desenvolvimento. Com o Fixx você terá acesso a conta digital, cartão, crédito baseado no seu histórico de serviços, antecipação de recebíveis e seguro para autônomos. Em breve disponível para profissionais cadastrados.",
        },
        {
          question: "Como funciona o sistema de avaliações?",
          answer:
            "Após cada serviço, o cliente avalia você com notas de 1 a 5 estrelas em pontualidade, qualidade, comunicação e preço. Sua média geral fica visível no seu perfil público. Profissionais com notas altas têm mais destaque na Plataforma e conquistam mais clientes.",
        },
        {
          question: "O que fazer se tiver um conflito com um cliente?",
          answer:
            "Se houver divergência com o cliente sobre o serviço prestado, abra um chamado de disputa no aplicativo. Nossa equipe de suporte irá analisar o histórico de conversas, fotos e avaliações para mediar o caso de forma justa para ambas as partes.",
        },
      ],
    },
    {
      category: "Sobre a Plataforma",
      items: [
        {
          question: "O Fixr está disponível em quais plataformas?",
          answer:
            "O Fixr está disponível como aplicativo para iOS (App Store) e Android (Google Play), além de versão web acessível pelo navegador em www.fixrapp.com.br.",
        },
        {
          question: "Como entro em contato com o suporte?",
          answer:
            "Você pode falar com nosso suporte pelo chat dentro do aplicativo, pelo e-mail suporte@fixrapp.com.br ou pelas redes sociais @fixrapp. Nosso atendimento funciona de segunda a sexta das 8h às 20h.",
        },
        {
          question: "O Fixr vai expandir para outras cidades?",
          answer:
            "Sim! O plano é expandir por todo o Brasil e futuramente para América Latina e África. Siga nossas redes sociais para acompanhar as novidades de expansão.",
        },
        {
          question: "Como reporto um comportamento inadequado?",
          answer:
            "Qualquer comportamento inadequado — seja de clientes ou profissionais — pode ser reportado diretamente pelo aplicativo no perfil do usuário ou pelo e-mail suporte@fixrapp.com.br. Todos os reportes são investigados pela equipe Fixr.",
        },
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>FAQ - Perguntas Frequentes | Fixr</title>
        <meta name="description" content="Encontre respostas para suas dúvidas sobre a plataforma Fixr" />
      </Helmet>
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">Perguntas Frequentes</h1>
            <p className="text-muted-foreground text-lg">
              Tudo o que você precisa saber sobre o Fixr
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Versão 1.0 — 02 de abril de 2026
            </p>
          </div>

          <div className="space-y-12">
            {faqs.map((section, idx) => (
              <section key={idx}>
                <h2 className="text-2xl font-bold mb-6 text-primary">
                  {section.category}
                </h2>

                <Accordion type="single" collapsible className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <AccordionItem
                      key={itemIdx}
                      value={`${idx}-${itemIdx}`}
                      className="border border-border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <span className="text-left font-semibold text-foreground">
                          {item.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>

          <div className="mt-16 p-8 bg-muted rounded-lg">
            <h3 className="text-xl font-bold mb-4">Não encontrou sua resposta?</h3>
            <p className="text-muted-foreground mb-6">
              Se você tem dúvidas que não estão na FAQ, entre em contato com nosso time de suporte.
            </p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>E-mail:</strong>{" "}
                <a
                  href="mailto:suporte@fixrapp.com.br"
                  className="text-primary hover:underline"
                >
                  suporte@fixrapp.com.br
                </a>
              </p>
              <p>
                <strong>Chat:</strong> Disponível no aplicativo
              </p>
              <p>
                <strong>Horário:</strong> Segunda a sexta, das 8h às 20h
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>Fixr — Fixrapp Tecnologia Ltda</p>
          </div>
        </div>
      </div>
    </>
  );
}
