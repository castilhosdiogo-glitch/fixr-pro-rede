import { Helmet } from "react-helmet-async";

export default function TermosDeUso() {
  return (
    <>
      <Helmet>
        <title>Termos de Uso - Fixr</title>
        <meta name="description" content="Leia os termos de uso da plataforma Fixr" />
      </Helmet>
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto prose prose-invert dark:prose-invert">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">Termos de Uso</h1>
            <p className="text-muted-foreground">
              Leia atentamente antes de utilizar a plataforma
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Versão 1.0 — 02 de abril de 2026
            </p>
          </div>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Sobre a Fixr</h2>
              <p>
                A Fixr é uma plataforma digital de intermediação de serviços domésticos, operada pela Fixrapp Tecnologia Ltda, com sede em Gravataí, Rio Grande do Sul, Brasil.
              </p>
              <p>
                A Fixr conecta clientes que precisam de serviços domésticos com profissionais autônomos verificados, facilitando o agendamento, a comunicação e o pagamento de forma segura e transparente.
              </p>
              <p>
                Ao criar uma conta e utilizar a plataforma Fixr, você concorda integralmente com estes Termos de Uso. Caso não concorde, não utilize nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Definições</h2>
              <p>Para fins destes Termos, adotam-se as seguintes definições:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Plataforma:</strong> o aplicativo móvel e o site da Fixr, disponíveis nas versões iOS, Android e web.</li>
                <li><strong>Cliente:</strong> pessoa física ou jurídica que solicita serviços domésticos por meio da Plataforma.</li>
                <li><strong>Profissional:</strong> prestador de serviços autônomo devidamente cadastrado e verificado na Plataforma.</li>
                <li><strong>Serviço:</strong> atividade prestada pelo Profissional ao Cliente mediante contratação pela Plataforma.</li>
                <li><strong>Usuário:</strong> qualquer pessoa que acessa ou utiliza a Plataforma, seja como Cliente ou Profissional.</li>
                <li><strong>Contrato de Serviço:</strong> acordo celebrado diretamente entre Cliente e Profissional para execução de um Serviço.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Cadastro e Conta</h2>

              <h3 className="text-xl font-semibold mb-2">3.1 Requisitos</h3>
              <p>Para utilizar a Fixr é necessário:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Ter no mínimo 18 anos de idade ou ser emancipado legalmente.</li>
                <li>Fornecer informações verdadeiras, completas e atualizadas no cadastro.</li>
                <li>Possuir CPF válido e número de telefone ativo.</li>
                <li>Concordar com estes Termos de Uso e com a Política de Privacidade.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">3.2 Verificação</h3>
              <p>
                A Fixr realiza verificação de identidade dos Profissionais mediante envio de documentos oficiais com foto (RG ou CNH) e selfie. Clientes podem ter verificação adicional solicitada conforme necessidade da plataforma.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">3.3 Responsabilidade da Conta</h3>
              <p>
                Você é o único responsável por manter a confidencialidade de suas credenciais de acesso. Qualquer atividade realizada com sua conta é de sua responsabilidade. Em caso de uso não autorizado, notifique a Fixr imediatamente pelo canal de suporte.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Natureza da Plataforma</h2>
              <p>A Fixr é uma plataforma de intermediação tecnológica. Isso significa que:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>A Fixr não é parte dos Contratos de Serviço celebrados entre Clientes e Profissionais.</li>
                <li>Os Profissionais cadastrados são prestadores autônomos e independentes, não sendo empregados, sócios, representantes ou agentes da Fixr.</li>
                <li>A Fixr não garante a disponibilidade de Profissionais em determinados horários ou regiões.</li>
                <li>A responsabilidade pela execução, qualidade e entrega do Serviço é exclusivamente do Profissional contratado.</li>
              </ul>
              <p>
                A Fixr atua como intermediadora e se compromete a oferecer ferramentas de segurança — como verificação de identidade, sistema de avaliações e suporte à mediação de conflitos — para proporcionar a melhor experiência possível.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Pagamentos e Intermediação Financeira</h2>

              <h3 className="text-xl font-semibold mb-2">5.1 Modelo de Pagamento</h3>
              <p>
                O pagamento pelos Serviços é realizado através da Plataforma Fixr, que atua como intermediadora financeira. O valor é retido pela Fixr após a confirmação do pedido e repassado ao Profissional após a confirmação de conclusão do Serviço pelo Cliente.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">5.2 Comissão</h3>
              <p>
                A Fixr cobra uma comissão sobre o valor de cada Serviço realizado, conforme tabela vigente disponível na Plataforma. A comissão é deduzida automaticamente do valor repassado ao Profissional.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">5.3 Prazo de Repasse</h3>
              <p>
                O valor líquido (descontada a comissão da Fixr) será repassado ao Profissional em até 24 horas após a confirmação de conclusão do Serviço pelo Cliente, conforme método de recebimento cadastrado.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">5.4 Cancelamentos e Reembolsos</h3>
              <p>
                Cancelamentos realizados pelo Cliente antes do início do Serviço serão reembolsados integralmente. Cancelamentos após o início do Serviço estão sujeitos à política de cancelamento específica disponível na Plataforma. Disputas entre Cliente e Profissional relacionadas ao pagamento serão mediadas pela equipe de suporte da Fixr.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Obrigações dos Usuários</h2>

              <h3 className="text-xl font-semibold mb-2">6.1 Obrigações do Cliente</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fornecer informações precisas sobre o Serviço solicitado.</li>
                <li>Garantir acesso ao local de execução do Serviço no horário agendado.</li>
                <li>Tratar o Profissional com respeito e urbanidade.</li>
                <li>Realizar o pagamento conforme acordado na Plataforma.</li>
                <li>Confirmar a conclusão do Serviço na Plataforma após sua realização.</li>
                <li>Avaliar o Profissional de forma honesta e construtiva após o Serviço.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">6.2 Obrigações do Profissional</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Manter seus dados cadastrais atualizados e verídicos.</li>
                <li>Apresentar-se no local e horário agendados ou comunicar antecipadamente qualquer impedimento.</li>
                <li>Executar o Serviço com qualidade, segurança e dentro das normas técnicas aplicáveis.</li>
                <li>Tratar o Cliente com respeito e urbanidade.</li>
                <li>Possuir as habilitações, certificações e equipamentos necessários para execução do Serviço.</li>
                <li>Não solicitar ou aceitar pagamentos fora da Plataforma para Serviços originados na Fixr.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Conduta Proibida</h2>
              <p>É expressamente proibido aos Usuários:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fornecer informações falsas, enganosas ou fraudulentas no cadastro ou nas avaliações.</li>
                <li>Utilizar a Plataforma para atividades ilegais, fraudulentas ou que violem direitos de terceiros.</li>
                <li>Assediar, ameaçar, discriminar ou intimidar outros Usuários.</li>
                <li>Burlar o sistema de pagamento da Fixr combinando pagamentos diretamente fora da Plataforma.</li>
                <li>Criar múltiplas contas para contornar suspensões ou restrições.</li>
                <li>Coletar dados de outros Usuários sem autorização.</li>
                <li>Interferir no funcionamento técnico da Plataforma.</li>
              </ul>
              <p className="mt-4">
                O descumprimento destas regras pode resultar em suspensão ou exclusão permanente da conta, sem prejuízo das medidas legais cabíveis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Sistema de Avaliações</h2>
              <p>
                A Fixr mantém um sistema de avaliações mútuas entre Clientes e Profissionais. As avaliações devem ser honestas, baseadas na experiência real com o Serviço, e livres de linguagem ofensiva ou discriminatória.
              </p>
              <p>
                A Fixr reserva-se o direito de remover avaliações que violem estas diretrizes, sem que isso implique manipulação ou censura do sistema de avaliações.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Suspensão e Encerramento de Conta</h2>
              <p>A Fixr pode suspender ou encerrar contas de Usuários que:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violem estes Termos de Uso ou a Política de Privacidade.</li>
                <li>Apresentem comportamento fraudulento ou prejudicial à Plataforma ou a outros Usuários.</li>
                <li>Recebam avaliações consistentemente negativas que comprometam a qualidade da Plataforma.</li>
              </ul>
              <p>
                O Usuário pode solicitar o encerramento de sua conta a qualquer momento pelo canal de suporte, respeitados os compromissos financeiros pendentes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Limitação de Responsabilidade</h2>
              <p>A Fixr não se responsabiliza por:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Danos causados por Profissionais durante ou após a execução do Serviço.</li>
                <li>Descumprimento de obrigações contratuais entre Cliente e Profissional.</li>
                <li>Interrupções temporárias na disponibilidade da Plataforma por motivos técnicos ou de manutenção.</li>
                <li>Perdas indiretas, lucros cessantes ou danos morais decorrentes do uso da Plataforma.</li>
              </ul>
              <p>
                A responsabilidade total da Fixr perante qualquer Usuário, em qualquer circunstância, fica limitada ao valor das comissões pagas pelo Usuário nos últimos 3 meses.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo da Plataforma Fixr — incluindo marca, logo, design, código, textos e funcionalidades — é propriedade exclusiva da Fixrapp Tecnologia Ltda e protegido pelas leis de propriedade intelectual aplicáveis.
              </p>
              <p>
                É vedada a reprodução, cópia, modificação ou distribuição do conteúdo da Fixr sem autorização expressa e por escrito.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Alterações nos Termos</h2>
              <p>
                A Fixr reserva-se o direito de atualizar estes Termos de Uso a qualquer momento. Alterações relevantes serão comunicadas aos Usuários com antecedência mínima de 15 dias por e-mail ou notificação na Plataforma. O uso continuado da Plataforma após a vigência das alterações constitui aceitação dos novos Termos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Lei Aplicável e Foro</h2>
              <p>
                Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Gravataí, Rio Grande do Sul, para dirimir quaisquer controvérsias oriundas destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">14. Contato</h2>
              <p>Em caso de dúvidas sobre estes Termos de Uso, entre em contato:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>E-mail: suportefixrapp@gmail.com.br</li>
                <li>Site: www.fixrapp.com.br</li>
                <li>Horário de atendimento: segunda a sexta, das 8h às 20h</li>
              </ul>
            </section>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Fixr — Fixrapp Tecnologia Ltda
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
