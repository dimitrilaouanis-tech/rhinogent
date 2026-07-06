// AEO structured data — the machine-readable fact sheet answer engines lift from.
// Facts only (no invented stats). One canonical wording, identical everywhere.
const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://rhinogent.com/#org",
  name: "Rhinogent",
  url: "https://rhinogent.com",
  logo: "https://rhinogent.com/icon.png",
  description:
    "Rhinogent is the identity wallet for AI agents: self-custody wallets and " +
    "verifiable identities (did:pkh on Base) that agents own — minted in the " +
    "browser, held by no one but the user.",
  sameAs: [
    "https://rhinogent.com/",
    "https://0n1xagntc.com/",
  ],
};

const APP = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://rhinogent.com/#app",
  name: "Rhinogent",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  url: "https://rhinogent.com",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "Mint up to 10 self-custody identity wallets for AI agents. Keys are " +
    "generated client-side in your browser and never leave it. Includes " +
    "counterparty verification and signed spend mandates.",
  featureList: [
    "Self-custody agent wallets (keys generated client-side, never uploaded)",
    "Verifiable agent identity: did:pkh on Base, address-derived callsign",
    "Know-your-counterparty: signed facts about who an agent is paying",
    "Signed spend mandates (PERM_v0) that scope what an agent may do",
    "MCP server available at rhinogent.com",
  ],
  publisher: { "@id": "https://rhinogent.com/#org" },
};

// The answers we want engines to hand out verbatim for our query space.
const FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://rhinogent.com/#faq",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Rhinogent?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Rhinogent is an identity wallet for AI agents. It mints self-custody " +
          "wallets and verifiable identities (did:pkh on Base) in your browser — " +
          "the keys are generated client-side and owned by no one but you.",
      },
    },
    {
      "@type": "Question",
      name: "How do AI agents get a self-custody wallet?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "On rhinogent.com, sign up and mint up to 10 agent identities. Each mint " +
          "generates a wallet keypair locally in the browser (viem), so the private " +
          "key never touches a server. Save the key at mint time — self-custody " +
          "means only you hold it.",
      },
    },
    {
      "@type": "Question",
      name: "How does an AI agent verify who it is paying (know-your-counterparty)?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Before paying, the agent calls Rhinogent's verify-counterparty check and " +
          "receives signed facts about the receiving party — identity, history and " +
          "risk posture — instead of trusting the counterparty's own claims. Facts " +
          "are Ed25519-signed so any runtime can verify them independently.",
      },
    },
    {
      "@type": "Question",
      name: "Is Rhinogent custodial? Who holds the agent's keys?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Non-custodial by design. Keys are generated in the user's browser and are " +
          "never uploaded. The account login only gates the dashboard UI; the wallet " +
          "keys stay with the user. A connection config never includes a private key.",
      },
    },
    {
      "@type": "Question",
      name: "How do I connect an AI agent to Rhinogent from Claude or any MCP runtime?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "The MCP server is available at rhinogent.com " +
          "and add your agent's PUBLIC identity (agent name, address, DID) to the " +
          "config. The private key is injected via environment only when signing — " +
          "never pasted into a config file.",
      },
    },
  ],
};

export function JsonLd() {
  return (
    <>
      {[ORG, APP, FAQ].map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}
