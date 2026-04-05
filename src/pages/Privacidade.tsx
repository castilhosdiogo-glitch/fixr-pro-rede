import { Helmet } from "react-helmet-async";

export default function Privacidade() {
  return (
    <>
      <Helmet>
        <title>Política de Privacidade - Fixr</title>
        <meta name="description" content="Saiba como protegemos seus dados no Fixr" />
      </Helmet>
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto prose prose-invert dark:prose-invert">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">Política de Privacidade</h1>
            <p className="text-muted-foreground">
              Como coletamos, usamos e protegemos seus dados
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Versão 1.0 — 02 de abril de 2026
            </p>
          </div>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introdução</h2>
              <p>
                A Fixrapp Tecnologia Ltda, operadora da plataforma Fixr, está comprometida com a proteção da privacidade e dos dados pessoais de seus Usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD) e demais legislações aplicáveis.
              </p>
              <p>
                Esta Política de Privacidade descreve como coletamos, usamos, armazenamos, compartilhamos e protegemos suas informações ao utilizar a Plataforma Fixr.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Dados que Coletamos</h2>

              <h3 className="text-xl font-semibold mb-2">2.1 Dados fornecidos por você</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dados de identificação:</strong> nome completo, CPF, data de nascimento, foto de perfil.</li>
                <li><strong>Dados de contato:</strong> endereço de e-mail, número de telefone, endereço residencial ou comercial.</li>
                <li><strong>Dados de documentos:</strong> RG, CNH ou outro documento oficial com foto (para Profissionais).</li>
                <li><strong>Dados financeiros:</strong> chave PIX ou dados bancários para recebimento (para Profissionais).</li>
                <li><strong>Dados da conta:</strong> nome de usuário, senha (armazenada de forma criptografada), preferências da conta.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Dados coletados automaticamente</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dados de uso:</strong> páginas acessadas, funcionalidades utilizadas, tempo de sessão, cliques.</li>
                <li><strong>Dados de dispositivo:</strong> modelo, sistema operacional, identificador único do dispositivo.</li>
                <li><strong>Dados de localização:</strong> localização aproximada ou precisa, conforme permissão concedida.</li>
                <li><strong>Dados de transações:</strong> histórico de serviços solicitados, contratados e pagamentos realizados.</li>
                <li><strong>Dados de avaliações:</strong> notas e comentários emitidos e recebidos na Plataforma.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.3 Dados de terceiros</h3>
              <p>
                Quando você utiliza login social (Google, Apple), recebemos informações básicas de perfil conforme as permissões que você concede a esses serviços.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Como Usamos seus Dados</h2>
              <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Criação e gerenciamento da sua conta na Plataforma.</li>
                <li>Verificação de identidade e prevenção de fraudes.</li>
                <li>Conexão entre Clientes e Profissionais para prestação de serviços.</li>
                <li>Processamento de pagamentos e repasses financeiros.</li>
                <li>Envio de notificações sobre pedidos, serviços e atualizações da Plataforma.</li>
                <li>Cálculo de score interno para concessão de crédito pelo Fixx (quando disponível).</li>
                <li>Melhoria contínua da Plataforma mediante análise de uso e comportamento.</li>
                <li>Cumprimento de obrigações legais e regulatórias.</li>
                <li>Comunicações de marketing, com possibilidade de descadastramento a qualquer momento.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Base Legal para o Tratamento</h2>
              <p>
                O tratamento dos seus dados pessoais pela Fixr é realizado com base nas seguintes hipóteses legais previstas na LGPD:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Execução de contrato:</strong> para prestação dos serviços da Plataforma.</li>
                <li><strong>Legítimo interesse:</strong> para melhoria da Plataforma, segurança e prevenção de fraudes.</li>
                <li><strong>Consentimento:</strong> para envio de comunicações de marketing e uso de localização precisa.</li>
                <li><strong>Cumprimento de obrigação legal:</strong> para atendimento de exigências regulatórias e fiscais.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Compartilhamento de Dados</h2>
              <p>Seus dados podem ser compartilhados com:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Outros Usuários:</strong> nome, foto de perfil, avaliações e informações do serviço são compartilhadas entre Cliente e Profissional para viabilizar a prestação do serviço.</li>
                <li><strong>Parceiros de pagamento:</strong> Infinitepay e outros processadores de pagamento para processamento de transações financeiras.</li>
                <li><strong>Parceiros de verificação:</strong> serviços de verificação de identidade e análise de documentos.</li>
                <li><strong>Parceiros técnicos:</strong> provedores de infraestrutura em nuvem, armazenamento e comunicação.</li>
                <li><strong>Autoridades públicas:</strong> quando exigido por lei, decisão judicial ou regulamentação aplicável.</li>
              </ul>
              <p className="mt-4">
                A Fixr não vende seus dados pessoais a terceiros para fins comerciais.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Retenção de Dados</h2>
              <p>Seus dados são mantidos pelo tempo necessário para as finalidades descritas nesta Política, observando:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dados da conta:</strong> mantidos enquanto a conta estiver ativa e por até 5 anos após o encerramento.</li>
                <li><strong>Dados financeiros:</strong> mantidos por até 10 anos conforme exigência da legislação fiscal brasileira.</li>
                <li><strong>Dados de logs e segurança:</strong> mantidos por até 6 meses.</li>
              </ul>
              <p>
                Após os prazos acima, os dados são excluídos ou anonimizados de forma segura.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Seus Direitos como Titular</h2>
              <p>
                Nos termos da LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Confirmação:</strong> saber se tratamos seus dados.</li>
                <li><strong>Acesso:</strong> obter cópia dos seus dados tratados.</li>
                <li><strong>Correção:</strong> solicitar atualização de dados incompletos, inexatos ou desatualizados.</li>
                <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou tratados em desconformidade com a LGPD.</li>
                <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado e interoperável.</li>
                <li><strong>Revogação do consentimento:</strong> para tratamentos baseados em consentimento.</li>
                <li><strong>Oposição:</strong> ao tratamento realizado com base em legítimo interesse.</li>
              </ul>
              <p className="mt-4">
                Para exercer seus direitos, entre em contato pelo e-mail: privacidade@fixrapp.com.br
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Segurança dos Dados</h2>
              <p>
                A Fixr adota medidas técnicas e administrativas para proteger seus dados pessoais, incluindo:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Criptografia de dados em trânsito (TLS/HTTPS) e em repouso.</li>
                <li>Autenticação segura com tokens JWT e refresh tokens.</li>
                <li>Controle de acesso baseado em funções (RBAC).</li>
                <li>Monitoramento contínuo de segurança e detecção de anomalias.</li>
                <li>Política interna de acesso mínimo aos dados pessoais.</li>
              </ul>
              <p>
                Em caso de incidente de segurança que possa afetar seus dados, você será notificado dentro dos prazos exigidos pela LGPD.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Cookies e Tecnologias Similares</h2>
              <p>
                Utilizamos cookies e tecnologias similares para:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Manter sua sessão ativa na Plataforma.</li>
                <li>Lembrar suas preferências e configurações.</li>
                <li>Analisar o desempenho e uso da Plataforma.</li>
              </ul>
              <p>
                Você pode configurar seu navegador para recusar cookies, mas isso pode limitar algumas funcionalidades da Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Transferência Internacional de Dados</h2>
              <p>
                Alguns de nossos parceiros técnicos operam fora do Brasil. Quando necessária a transferência internacional de dados, garantimos que ela ocorra em conformidade com as exigências da LGPD, mediante cláusulas contratuais padrão ou outros mecanismos de proteção adequados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Encarregado de Dados (DPO)</h2>
              <p>
                O Encarregado pelo Tratamento de Dados Pessoais (Data Protection Officer) da Fixr pode ser contactado pelo e-mail: dpofixrapp@gmail.com.br
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Atualizações desta Política</h2>
              <p>
                Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos você sobre alterações relevantes por e-mail ou notificação na Plataforma. A data da última atualização sempre estará indicada no início do documento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Contato</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>E-mail geral:</strong> privacidadefixrapp@gmail.com.br</li>
                <li><strong>DPO:</strong> dpofixrapp@gmail.com.br</li>
                <li><strong>Site:</strong> www.fixrapp.com.br</li>
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
