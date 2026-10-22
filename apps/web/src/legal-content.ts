// Shared by the rendered policies and their canonical Markdown exports.
export const legalPages = [
  {
    path: "/privacy", title: "Privacy policy", description: "How Belweave handles information when you use searchsdk.dev, its playground, and its public MCP endpoint.",
    updated: "October 22, 2026",
    sections: [
      { id: "operator", title: "Who operates this service", paragraphs: [
        "Belweave, based in Virginia, USA, operates searchsdk.dev and is responsible for the personal information processed through this website. Contact info@belweave.com for privacy questions or requests.",
        "This policy covers the website, live playground, and public documentation MCP endpoint. When you install the open-source SDK and run it in your own application, your application controls its data handling. The SDK does not send telemetry to Belweave. Search providers, GitHub, npm, and other linked services have their own policies.",
      ] },
      { id: "playground", title: "Live searches and provider keys", paragraphs: [
        "When you run a live search, your browser sends your query, selected provider, result limit, and that provider’s API key to our server over HTTPS. If you choose a backup, its identity and key are included too. We use this information to perform the search you requested and return results and an attempt trace. A backup receives the query and its own key only if a qualifying failure triggers fallback.",
        "The application processes keys and queries in memory for the request. It does not write them to a database, application logs, cookies, or browser storage. Search responses are not cached by the application and are sent with no-store headers. Key fields clear on submission and when the page is left; queries and results remain visible in the current page until replaced or the page is closed. Memory is released through normal runtime cleanup; this is not a guarantee of immediate secure erasure.",
        "The selected provider receives your query and authentication key and processes them under its own privacy, retention, and account terms. Search results may contain personal information or third-party content. Submit only information and credentials you are authorized to use. Do not include sensitive personal information in test queries. Cancelling or closing the page cannot retract information already received by a provider.",
      ] },
      { id: "technical-data", title: "Connection data and abuse prevention", paragraphs: [
        "Vercel hosts the site and server endpoints. Hosting infrastructure processes connection and request metadata, such as IP addresses, requested paths, timestamps, user-agent information, response status, and timing, to deliver and protect the service. Infrastructure logs are separate from application logs and follow the hosting provider’s configuration and retention practices. Our application does not deliberately include query text, keys, or result bodies in logs.",
        "The playground keeps temporary, salted hashes derived from provider keys, with request counts and active-request counts, to limit abuse. The public MCP endpoint similarly uses salted hashes of connection addresses. These bounded records are held in a running server instance, become eligible for removal after their rate-limit window, and are cleared when that instance ends. They are not a saved search history or a cross-service tracking identifier.",
        "The public MCP endpoint accepts documentation requests and returns bundled public documentation, provider descriptions, and examples. It does not perform provider searches, require an account, or accept API credentials. Do not include private information in documentation searches.",
      ] },
      { id: "browser-storage", title: "Browser storage and analytics", paragraphs: [
        "We store your appearance choice in local storage under searchsdk-theme so the site can remember System, Light, or Dark. This preference remains until you change it or clear site data. It is not sent to our server. The site works when local storage is unavailable.",
        "The current application does not set advertising cookies or embed third-party advertising or analytics scripts. Fonts and site assets are served with the site. We do not sell personal information, share it for cross-context behavioral advertising, or use playground searches to build advertising profiles.",
      ] },
      { id: "purposes", title: "Why we process information", paragraphs: [
        "We process requested searches to provide the service you choose to use. We process limited technical information to operate the website, prevent abuse, diagnose faults, and protect users. We use messages you send us to respond to your questions and handle requests. We may also process information to comply with applicable law and establish, exercise, or defend legal claims.",
        "Where European or UK data-protection law applies, our bases are performance of a requested service or contract, our legitimate interests in operating and securing the service and responding to communications, and compliance with legal obligations, as applicable. Where consent is legally required for a particular use, we will request it before that use. You may object to processing based on legitimate interests.",
      ] },
      { id: "sharing-retention", title: "Recipients, retention, and transfers", paragraphs: [
        "Information is processed by Belweave, Vercel as hosting infrastructure, the providers you select for a live search, and communication providers when you email us. We may disclose information when required by law or where reasonably necessary to protect rights, security, or the service. If the service changes ownership, information may be transferred subject to applicable law and appropriate notice.",
        "Application search data is transient as described above. Theme preferences remain in your browser until cleared. We retain correspondence only as needed to resolve the request, maintain necessary business records, and meet legal obligations; relevant records may be retained longer for a dispute or legal requirement. Provider-side and hosting-infrastructure records follow their respective retention practices. Deleting a browser page does not delete a provider’s records.",
        "Belweave operates in the United States, and hosting and search providers may process information in other countries. Data-protection laws may differ from those in your location. Where applicable law requires safeguards for an international transfer, we use the required safeguards, including appropriate contractual protections. Contact us for information about a transfer relevant to your request.",
      ] },
      { id: "rights", title: "Your choices and rights", paragraphs: [
        "You can use the documentation and fixture demo without supplying provider credentials. You can clear keys from the playground, clear your browser’s site data, stop using the service, and manage or revoke keys in your provider account.",
        "Depending on your location and applicable law, you may request access, correction, deletion, portability, or restriction of personal information, object to processing, withdraw consent where processing relies on it, and appeal a privacy-request decision. Email info@belweave.com with your request and enough context for us to locate relevant information. Do not email API keys or sensitive identification documents. We may request proportionate verification and will respond within the applicable legal period. We will not discriminate against you for exercising applicable rights.",
        "You may complain to your local data-protection authority. If we decline a request and an appeal right applies, reply to our decision asking for an appeal. We cannot delete information held independently by a search provider; contact that provider about its records.",
      ] },
      { id: "security-updates", title: "Security, children, and policy updates", paragraphs: [
        "We use HTTPS, request limits, restricted provider destinations, response bounds, and credential-redaction measures. No online service can promise absolute security. Report a suspected exposure to info@belweave.com without including the exposed credential, and revoke that credential with its provider.",
        "The service is intended for adults developing software, not children. We do not knowingly collect personal information from children under 13. Contact us if you believe a child has submitted personal information so we can address it.",
        "We may update this policy as the service or applicable requirements change. The date above identifies the current version. We will provide additional notice of material changes where required by law.",
      ] },
    ],
    links: [{ label: "Terms of service", href: "/terms" }, { label: "Vercel privacy notice", href: "https://vercel.com/legal/privacy-notice" }, { label: "Provider directory", href: "/providers" }],
  },
  {
    path: "/terms", title: "Terms of service", description: "Terms for using the searchSDK website, live playground, and public documentation MCP endpoint operated by Belweave.",
    updated: "October 22, 2026",
    sections: [
      { id: "agreement", title: "Your agreement with Belweave", paragraphs: [
        "These terms govern your use of searchsdk.dev, its hosted playground, and its public documentation MCP endpoint, operated by Belweave in Virginia, USA. By using these services, you agree to these terms. If you do not agree, do not use the hosted services. Contact info@belweave.com with questions.",
        "You must be at least 18 and able to enter a binding agreement to use the hosted playground. If you act for an organization, you represent that you have authority to bind it, and references to you include that organization. Mandatory rights available under applicable law remain unaffected.",
      ] },
      { id: "scope", title: "Hosted services and open-source software", paragraphs: [
        "The website provides documentation, provider information, code examples, and a live search playground. The public MCP endpoint provides read-only documentation, provider capabilities, examples, and an integration skill. It does not execute examples or perform provider searches.",
        "The searchSDK source code and npm package are licensed separately under the MIT license included with the software. These website terms do not replace or restrict rights granted by that license. Third-party code, fonts, trademarks, and other assets retain their respective notices and terms. Documentation describes the stated SDK contracts; it is not a guarantee of a provider’s live behavior.",
      ] },
      { id: "keys-charges", title: "Your keys, provider accounts, and charges", paragraphs: [
        "You are responsible for having permission to use each provider account, API key, query, and other material you submit. Keep credentials confidential and use appropriately restricted keys. You authorize Belweave to transmit your query and the relevant key to the provider you select to fulfill your request, including an explicitly selected backup when fallback is triggered.",
        "Search providers may charge your account for requests, including failed requests, work completed after cancellation, and fallback attempts. You are responsible for those provider charges and for complying with the provider’s terms. Belweave does not control provider prices, quotas, refunds, retention, or availability. The hosted playground itself currently has no usage fee; any future paid offering will disclose pricing and applicable terms before you incur a charge.",
        "Cancellation, timeouts, redaction, and retry limits reduce certain risks but do not guarantee that a remote request did not run or was not billed. Do not use the playground for sensitive data or workloads requiring a contractual service level, guaranteed retention period, or guaranteed availability.",
      ] },
      { id: "acceptable-use", title: "Acceptable use", paragraphs: [
        "Use the service lawfully and within its published limits. Do not submit stolen credentials, infringe another person’s rights, seek unauthorized access, distribute malware through the service, evade request limits, or interfere with other users or infrastructure. Do not attempt to turn the playground or MCP endpoint into an arbitrary proxy, code runner, or file reader.",
        "Automated access to public documentation and the MCP endpoint is permitted within their limits. Respect rate-limit responses and retry instructions. Report security concerns privately to info@belweave.com and avoid accessing other people’s data or disrupting the service.",
      ] },
      { id: "content", title: "Results and third-party services", paragraphs: [
        "You retain rights you hold in your submitted queries and other material. You grant Belweave only the permission needed to process that material to provide, secure, and operate the service as described in the privacy policy. You are responsible for ensuring you have the necessary rights to submit it.",
        "Search results, excerpts, generated answers, and linked pages come from third parties and may be inaccurate, incomplete, outdated, offensive, or subject to separate restrictions. Verify information before relying on it, especially for consequential decisions. A result or provider listing is not an endorsement, partnership claim, or grant of rights to third-party content. Your use of external services, including GitHub, npm, and Boat, is governed by their own terms.",
        "Benchmark methodology and fixture tests do not establish measured live-provider quality, speed, reliability, or cost. Only explicitly identified, published measurements should be treated as benchmark results.",
      ] },
      { id: "availability", title: "Availability and changes", paragraphs: [
        "We may change, limit, suspend, or discontinue hosted features. We may restrict access to address abuse, security issues, legal requirements, or excessive load. The current service has no uptime or support-response commitment. We will provide notice where required by law or a separate agreement.",
        "We may update these terms by publishing a revised version with a new date and will give additional notice of material changes where required. Changes apply prospectively. Continued use after the changes take effect constitutes acceptance where permitted by law; otherwise the required consent process applies.",
      ] },
      { id: "disclaimers", title: "Disclaimers and liability", paragraphs: [
        "To the maximum extent permitted by applicable law, the hosted services are provided as is and as available, without warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, or uninterrupted or error-free operation. We do not warrant that results meet your requirements or that third-party services will remain available.",
        "To the maximum extent permitted by law, Belweave will not be liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, goodwill, or business opportunity arising from the hosted services. Belweave’s total liability for claims arising from the hosted services will not exceed the greater of US $100 or the amount you paid Belweave for those services in the 12 months before the event giving rise to the claim.",
        "These exclusions and limits do not apply to liability that cannot lawfully be excluded or limited, including applicable liability for fraud, willful misconduct, or mandatory consumer rights. The separate open-source license governs warranties and liability for the licensed software.",
      ] },
      { id: "law", title: "Governing law and other provisions", paragraphs: [
        "Virginia law governs these terms, excluding its conflict-of-laws rules. Subject to mandatory applicable law, disputes concerning the hosted services will be brought in state or federal courts located in Virginia, USA, and each party submits to their jurisdiction. This does not remove mandatory protections or forum rights available to you under applicable law.",
        "If a provision is unenforceable, the remaining provisions continue to apply. Failure to enforce a provision is not a waiver. These terms and any separately agreed terms for a hosted service form the agreement for that service. The privacy policy describes information handling; the MIT license separately governs the open-source software. Provisions that by their nature should survive termination will survive.",
      ] },
    ],
    links: [{ label: "Privacy policy", href: "/privacy" }, { label: "Software license", href: "https://github.com/Belweave/searchSDK/blob/main/LICENSE" }, { label: "Provider directory", href: "/providers" }],
  },
];
