'use client';

/**
 * Site language: DE / FR / IT / EN.
 *
 * This controls the page chrome only. The agent detects the caller's language
 * from speech on its own — switching the site language does not force the
 * agent into it, which is deliberate: the demo should show detection working,
 * not a language being handed to it.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

export type Lang = 'de' | 'fr' | 'it' | 'en';

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'de', label: 'DE', native: 'Deutsch' },
  { code: 'fr', label: 'FR', native: 'Français' },
  { code: 'it', label: 'IT', native: 'Italiano' },
  { code: 'en', label: 'EN', native: 'English' },
];

/** BCP 47 tags for date formatting. Swiss variants, so 31.12.2026 not 12/31/2026. */
export const LOCALES: Record<Lang, string> = {
  de: 'de-CH',
  fr: 'fr-CH',
  it: 'it-CH',
  en: 'en-GB',
};

export interface Scenario {
  id: string;
  title: string;
  caller: string;
  situation: string;
  say: string;
  expect: string;
  /** What the agent is actually doing — written for a non-technical viewer. */
  mechanism: string;
}

export interface Dict {
  nav: { brand: string; product: string; demo: string; how: string; backendUp: string; backendDown: string };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    stats: { value: string; label: string }[];
    ctaDemo: string;
    ctaHow: string;
  };
  demo: {
    title: string;
    lead: string;
    scenariosTitle: string;
    scenariosHint: string;
    sayLabel: string;
    expectLabel: string;
    mechanismLabel: string;
    start: string;
    end: string;
    connecting: string;
    listening: string;
    speaking: string;
    idleHint: string;
    micDenied: string;
    noAgent: string;
    transcript: string;
    transcriptEmpty: string;
    tools: string;
    toolsEmpty: string;
    toolsHint: string;
    result: string;
    resultEmpty: string;
    you: string;
    agent: string;
    closureOn: string;
    daysLeft: string;
    replacement: string;
    openNow: string;
    closedNow: string;
    until: string;
    minutesWalk: string;
    minuteWalkOne: string;
    liveNote: string;
    liveFrom: string;
    justNow: string;
    minutesAgo: string;
    verifyAtSource: string;
    demoDate: string;
    detectedNote: string;
  };
  how: {
    title: string;
    lead: string;
    steps: { title: string; body: string }[];
    toolsTitle: string;
    toolsLead: string;
    tools: { name: string; body: string }[];
    integrationTitle: string;
    integration: { term: string; body: string }[];
  };
  footer: { disclaimer: string; data: string; builtBy: string; preparedFor: string; voiceAi: string; rights: string };
}

const de: Dict = {
  nav: { brand: 'Filialnetz-Assistent', product: 'Demo für die Schweizerische Post', demo: 'Demo', how: 'Funktionsweise', backendUp: 'Backend verbunden', backendDown: 'Backend offline' },
  hero: {
    eyebrow: 'Sprachagent für die Grundversorgung',
    title: 'Jede Filiale. Jeder Status. Jede Alternative.',
    lead: 'Anrufende, die von den Anpassungen im Filialnetz betroffen sind, erreichen einen Sprachagenten, der jeden Standort kennt: Status, Schliessungsdatum, nächste Alternative, Öffnungszeiten der Partnerfiliale, Paketabholstellen und digitale Alternativen. In vier Sprachen, mit automatischer Erkennung.',
    stats: [
      { value: '170', label: 'Filialen bis 2028' },
      { value: '155', label: 'betroffene Gemeinden' },
      { value: '4', label: 'Sprachen, automatisch erkannt' },
    ],
    ctaDemo: 'Demo starten',
    ctaHow: 'Wie es funktioniert',
  },
  demo: {
    title: 'Mit dem Agenten sprechen',
    lead: 'Wählen Sie ein Szenario, starten Sie das Gespräch und sprechen Sie in einer beliebigen der vier Sprachen. Der Agent erkennt die Sprache selbst.',
    scenariosTitle: 'Szenarien',
    scenariosHint: 'Typische Anrufe aus dieser Sprachregion.',
    sayLabel: 'Sagen Sie',
    expectLabel: 'Erwartet',
    mechanismLabel: 'Was dabei passiert',
    start: 'Gespräch starten',
    end: 'Gespräch beenden',
    connecting: 'Verbindung wird aufgebaut …',
    listening: 'Der Agent hört zu',
    speaking: 'Der Agent spricht',
    idleHint: 'Mikrofon wird beim Start angefragt.',
    micDenied: 'Kein Mikrofonzugriff. Bitte im Browser erlauben und erneut starten.',
    noAgent: 'Keine Agent-ID konfiguriert. Setzen Sie NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local.',
    transcript: 'Gespräch',
    transcriptEmpty: 'Noch kein Gespräch. Starten Sie den Anruf, um den Verlauf hier zu sehen.',
    tools: 'Werkzeugaufrufe',
    toolsEmpty: 'Noch keine Aufrufe.',
    toolsHint: 'Jede Zeile ist ein Serveraufruf, den der Agent während des Gesprächs ausgelöst hat.',
    result: 'Ergebnis',
    resultEmpty: 'Sobald der Agent einen Standort nachschlägt, erscheint das Ergebnis hier.',
    you: 'Anrufer',
    agent: 'Agent',
    closureOn: 'Schliessung am',
    daysLeft: 'Tage verbleibend',
    replacement: 'Ersatzstandorte',
    openNow: 'Jetzt geöffnet',
    closedNow: 'Zurzeit geschlossen',
    until: 'bis',
    minutesWalk: 'rund {n} Minuten zu Fuss',
    minuteWalkOne: 'rund 1 Minute zu Fuss',
    liveNote: 'Standortdaten live von der Schweizerischen Post.',
    liveFrom: 'Live von der Schweizerischen Post',
    justNow: 'gerade eben',
    minutesAgo: 'vor {n} Min.',
    verifyAtSource: 'Auf post.ch prüfen',
    demoDate: 'Demo-Datum',
    detectedNote: 'Die Sprache des Gesprächs wird vom Agenten erkannt und ist unabhängig von der Sprache dieser Seite.',
  },
  how: {
    title: 'Funktionsweise',
    lead: 'Eine Wissensdatenbank für die Programmfragen, fünf Werkzeuge für die Standortdaten. Keine transaktionale Anbindung, keine Kundendaten.',
    steps: [
      { title: 'Anruf trifft ein', body: 'Über eine SIP-Nummer oder direkt im Browser. Der Agent begrüsst neutral und erkennt die Sprache aus den ersten Äusserungen.' },
      { title: 'Standort auflösen', body: 'Gemeinde, Postleitzahl oder Filialname — auch unvollständig oder falsch verstanden. Bei echter Mehrdeutigkeit fragt der Agent nach.' },
      { title: 'Status und Alternative', body: 'Der Agent nennt den Status, das Datum und im selben Atemzug den nächstgelegenen Ersatz mit Distanz und Öffnungszeiten.' },
      { title: 'Digital ablenken oder übergeben', body: 'Lässt sich das Anliegen ohne Schaltergang lösen, schlägt der Agent den digitalen Weg vor. Sonst übergibt er an einen Menschen.' },
    ],
    toolsTitle: 'Die fünf Werkzeuge',
    toolsLead: 'Alle lesend, alle auf öffentlichen Daten.',
    tools: [
      { name: 'find_location', body: 'Löst gesprochene Ortsangaben in bekannte Standorte auf — Postleitzahl, Gemeinde, Filialname, unscharf.' },
      { name: 'get_branch_status', body: 'Status, Schliessungsdatum, verbleibende Tage und die offiziell bezeichneten Nachfolgestandorte.' },
      { name: 'find_alternatives', body: 'Nächste nutzbare Zugangsstellen, nach Distanz sortiert, optional nach benötigter Dienstleistung gefiltert.' },
      { name: 'get_opening_hours', body: 'Öffnungszeiten für einen Tag, inklusive Feiertagskalender und kantonaler Ausnahmen.' },
      { name: 'get_digital_alternative', body: 'Ordnet das Anliegen den digitalen Diensten zu: Post-App, digitale Briefe, Hausservice, eBill.' },
    ],
    integrationTitle: 'Integration',
    integration: [
      { term: 'Wissensdatenbank', body: 'Markdown-Dateien in DE/FR/IT/EN, direkt in die Plattform geladen — Programmfragen, Verpflichtungen, Partnerfilialen, digitale Dienste.' },
      { term: 'SIP-Nummer', body: 'Der Agent nimmt Anrufe über eine SIP-Nummer entgegen. Keine Anbindung an Kernsysteme nötig.' },
      { term: 'Werkzeuge', body: 'Fünf Server-Webhooks auf dieser FastAPI-Anwendung, HMAC-signiert.' },
      { term: 'Datenquelle', body: 'Standardmässig ein lokaler Datensatz. Für einen Pilot wird die produktive Standortquelle angebunden — ein einziger Adapter.' },
    ],
  },
  footer: {
    disclaimer: 'Demonstrationsanwendung. Kein offizielles Angebot der Schweizerischen Post.',
    builtBy: 'Entwickelt von',
    preparedFor: 'Erstellt für',
    voiceAi: 'Voice AI',
    rights: 'Alle Rechte vorbehalten.',
    data: 'Alle Filialstatus, Schliessungsdaten und Nachfolgestandorte in dieser Demo sind erfunden und bilden keine tatsächliche Ankündigung ab.',
  },
};

const fr: Dict = {
  nav: { brand: 'Assistant réseau de filiales', product: 'Démo pour la Poste Suisse', demo: 'Démo', how: 'Fonctionnement', backendUp: 'Backend connecté', backendDown: 'Backend hors ligne' },
  hero: {
    eyebrow: 'Agent vocal pour le service universel',
    title: 'Chaque filiale. Chaque statut. Chaque alternative.',
    lead: "Les personnes concernées par l'évolution du réseau de filiales joignent un agent vocal qui connaît chaque site: statut, date de fermeture, alternative la plus proche, horaires de la filiale en partenariat, points de retrait de colis et solutions numériques. En quatre langues, avec détection automatique.",
    stats: [
      { value: '170', label: "filiales d'ici 2028" },
      { value: '155', label: 'communes concernées' },
      { value: '4', label: 'langues détectées automatiquement' },
    ],
    ctaDemo: 'Lancer la démo',
    ctaHow: 'Comment ça marche',
  },
  demo: {
    title: "Parler à l'agent",
    lead: "Choisissez un scénario, lancez la conversation et parlez dans l'une des quatre langues. L'agent détecte la langue lui-même.",
    scenariosTitle: 'Scénarios',
    scenariosHint: 'Appels typiques de cette région linguistique.',
    sayLabel: 'Dites',
    expectLabel: 'Attendu',
    mechanismLabel: 'Ce qui se passe',
    start: 'Démarrer la conversation',
    end: 'Terminer la conversation',
    connecting: 'Connexion en cours …',
    listening: "L'agent écoute",
    speaking: "L'agent parle",
    idleHint: 'Le micro sera demandé au démarrage.',
    micDenied: "Pas d'accès au micro. Autorisez-le dans le navigateur puis relancez.",
    noAgent: "Aucun identifiant d'agent configuré. Définissez NEXT_PUBLIC_ELEVENLABS_AGENT_ID dans .env.local.",
    transcript: 'Conversation',
    transcriptEmpty: "Pas encore de conversation. Lancez l'appel pour voir le fil ici.",
    tools: "Appels d'outils",
    toolsEmpty: 'Aucun appel pour le moment.',
    toolsHint: "Chaque ligne est un appel serveur déclenché par l'agent pendant la conversation.",
    result: 'Résultat',
    resultEmpty: "Dès que l'agent consulte un site, le résultat apparaît ici.",
    you: 'Appelant',
    agent: 'Agent',
    closureOn: 'Fermeture le',
    daysLeft: 'jours restants',
    replacement: 'Sites de remplacement',
    openNow: 'Ouvert maintenant',
    closedNow: 'Actuellement fermé',
    until: "jusqu'à",
    minutesWalk: 'environ {n} minutes à pied',
    minuteWalkOne: 'environ 1 minute à pied',
    liveNote: 'Données de sites en direct de la Poste Suisse.',
    liveFrom: 'En direct de la Poste Suisse',
    justNow: "à l'instant",
    minutesAgo: 'il y a {n} min',
    verifyAtSource: 'Vérifier sur post.ch',
    demoDate: 'date de démo',
    detectedNote: "La langue de la conversation est détectée par l'agent, indépendamment de la langue de cette page.",
  },
  how: {
    title: 'Fonctionnement',
    lead: "Une base de connaissances pour les questions de programme, cinq outils pour les données de sites. Aucune intégration transactionnelle, aucune donnée client.",
    steps: [
      { title: "L'appel arrive", body: "Via un numéro SIP ou directement dans le navigateur. L'agent salue de manière neutre et détecte la langue dès les premiers mots." },
      { title: 'Résoudre le site', body: "Commune, code postal ou nom de filiale — même incomplet ou mal transcrit. En cas de vraie ambiguïté, l'agent demande une précision." },
      { title: 'Statut et alternative', body: "L'agent annonce le statut, la date, et dans la même phrase le relais le plus proche avec distance et horaires." },
      { title: 'Orienter ou transférer', body: "Si la demande se règle sans guichet, l'agent propose la voie numérique. Sinon il transfère à un conseiller." },
    ],
    toolsTitle: 'Les cinq outils',
    toolsLead: 'Tous en lecture seule, tous sur des données publiques.',
    tools: [
      { name: 'find_location', body: 'Résout une indication orale en site connu — code postal, commune, nom de filiale, approximatif.' },
      { name: 'get_branch_status', body: 'Statut, date de fermeture, jours restants et sites successeurs officiellement désignés.' },
      { name: 'find_alternatives', body: "Points d'accès utilisables les plus proches, triés par distance, filtrables par prestation requise." },
      { name: 'get_opening_hours', body: 'Horaires pour une date donnée, calendrier des jours fériés et exceptions cantonales inclus.' },
      { name: 'get_digital_alternative', body: 'Associe la demande aux services numériques: app Poste, lettres numériques, service à domicile, eBill.' },
    ],
    integrationTitle: 'Intégration',
    integration: [
      { term: 'Base de connaissances', body: 'Fichiers Markdown en DE/FR/IT/EN chargés dans la plateforme — questions de programme, engagements, filiales en partenariat, services numériques.' },
      { term: 'Numéro SIP', body: "L'agent prend les appels via un numéro SIP. Aucune connexion aux systèmes centraux n'est nécessaire." },
      { term: 'Outils', body: 'Cinq webhooks serveur sur cette application FastAPI, signés en HMAC.' },
      { term: 'Source de données', body: 'Par défaut un jeu de données local. Pour un pilote, la source de sites de production se branche via un seul adaptateur.' },
    ],
  },
  footer: {
    disclaimer: 'Application de démonstration. Ce n\'est pas une offre officielle de la Poste Suisse.',
    builtBy: 'Développé par',
    preparedFor: 'Préparé pour',
    voiceAi: 'Voice AI',
    rights: 'Tous droits réservés.',
    data: "Tous les statuts de filiales, dates de fermeture et sites successeurs de cette démo sont inventés et ne reflètent aucune annonce réelle.",
  },
};

const it: Dict = {
  nav: { brand: 'Assistente rete di filiali', product: 'Demo per la Posta Svizzera', demo: 'Demo', how: 'Come funziona', backendUp: 'Backend collegato', backendDown: 'Backend offline' },
  hero: {
    eyebrow: 'Agente vocale per il servizio universale',
    title: 'Ogni filiale. Ogni stato. Ogni alternativa.',
    lead: "Chi è interessato dall'evoluzione della rete di filiali raggiunge un agente vocale che conosce ogni sede: stato, data di chiusura, alternativa più vicina, orari della filiale in partenariato, punti di ritiro pacchi e soluzioni digitali. In quattro lingue, con riconoscimento automatico.",
    stats: [
      { value: '170', label: 'filiali entro il 2028' },
      { value: '155', label: 'comuni interessati' },
      { value: '4', label: 'lingue riconosciute automaticamente' },
    ],
    ctaDemo: 'Avvia la demo',
    ctaHow: 'Come funziona',
  },
  demo: {
    title: "Parlare con l'agente",
    lead: "Scelga uno scenario, avvii la conversazione e parli in una delle quattro lingue. L'agente riconosce la lingua da solo.",
    scenariosTitle: 'Scenari',
    scenariosHint: 'Chiamate tipiche di questa regione linguistica.',
    sayLabel: 'Dica',
    expectLabel: 'Atteso',
    mechanismLabel: 'Cosa succede',
    start: 'Avvia la conversazione',
    end: 'Termina la conversazione',
    connecting: 'Connessione in corso …',
    listening: "L'agente ascolta",
    speaking: "L'agente parla",
    idleHint: "Il microfono verrà richiesto all'avvio.",
    micDenied: 'Nessun accesso al microfono. Lo autorizzi nel browser e riavvii.',
    noAgent: "Nessun ID agente configurato. Imposti NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local.",
    transcript: 'Conversazione',
    transcriptEmpty: 'Nessuna conversazione. Avvii la chiamata per vedere qui il filo.',
    tools: 'Chiamate agli strumenti',
    toolsEmpty: 'Ancora nessuna chiamata.',
    toolsHint: "Ogni riga è una chiamata al server attivata dall'agente durante la conversazione.",
    result: 'Risultato',
    resultEmpty: "Appena l'agente consulta una sede, il risultato appare qui.",
    you: 'Chiamante',
    agent: 'Agente',
    closureOn: 'Chiusura il',
    daysLeft: 'giorni rimanenti',
    replacement: 'Sedi sostitutive',
    openNow: 'Aperto ora',
    closedNow: 'Attualmente chiuso',
    until: 'fino alle',
    minutesWalk: 'circa {n} minuti a piedi',
    minuteWalkOne: 'circa 1 minuto a piedi',
    liveNote: 'Dati delle sedi in diretta dalla Posta Svizzera.',
    liveFrom: 'In diretta dalla Posta Svizzera',
    justNow: 'poco fa',
    minutesAgo: '{n} min fa',
    verifyAtSource: 'Verifica su post.ch',
    demoDate: 'data dimostrativa',
    detectedNote: "La lingua della conversazione è riconosciuta dall'agente, indipendentemente dalla lingua di questa pagina.",
  },
  how: {
    title: 'Come funziona',
    lead: 'Una base di conoscenza per le domande sul programma, cinque strumenti per i dati delle sedi. Nessuna integrazione transazionale, nessun dato dei clienti.',
    steps: [
      { title: 'Arriva la chiamata', body: "Tramite un numero SIP o direttamente nel browser. L'agente saluta in modo neutro e riconosce la lingua dalle prime parole." },
      { title: 'Risolvere la sede', body: "Comune, codice postale o nome della filiale — anche incompleto o trascritto male. In caso di vera ambiguità l'agente chiede conferma." },
      { title: 'Stato e alternativa', body: "L'agente indica lo stato, la data e nella stessa frase il punto sostitutivo più vicino con distanza e orari." },
      { title: 'Deviare o trasferire', body: "Se la richiesta si risolve senza sportello, l'agente propone la via digitale. Altrimenti trasferisce a un collaboratore." },
    ],
    toolsTitle: 'I cinque strumenti',
    toolsLead: 'Tutti in sola lettura, tutti su dati pubblici.',
    tools: [
      { name: 'find_location', body: 'Risolve un\'indicazione parlata in una sede nota — codice postale, comune, nome della filiale, approssimativo.' },
      { name: 'get_branch_status', body: 'Stato, data di chiusura, giorni rimanenti e sedi successore ufficialmente designate.' },
      { name: 'find_alternatives', body: 'Punti di accesso utilizzabili più vicini, ordinati per distanza, filtrabili per prestazione richiesta.' },
      { name: 'get_opening_hours', body: 'Orari per una data, con calendario dei giorni festivi ed eccezioni cantonali.' },
      { name: 'get_digital_alternative', body: "Associa la richiesta ai servizi digitali: app della Posta, lettere digitali, servizio a domicilio, eBill." },
    ],
    integrationTitle: 'Integrazione',
    integration: [
      { term: 'Base di conoscenza', body: 'File Markdown in DE/FR/IT/EN caricati nella piattaforma — domande sul programma, impegni, filiali in partenariato, servizi digitali.' },
      { term: 'Numero SIP', body: "L'agente riceve le chiamate tramite un numero SIP. Non serve alcun collegamento ai sistemi centrali." },
      { term: 'Strumenti', body: 'Cinque webhook server su questa applicazione FastAPI, firmati con HMAC.' },
      { term: 'Fonte dati', body: 'Di default un set di dati locale. Per un pilota si collega la fonte di sedi produttiva tramite un unico adattatore.' },
    ],
  },
  footer: {
    disclaimer: 'Applicazione dimostrativa. Non è un\'offerta ufficiale della Posta Svizzera.',
    builtBy: 'Sviluppato da',
    preparedFor: 'Preparato per',
    voiceAi: 'Voice AI',
    rights: 'Tutti i diritti riservati.',
    data: 'Tutti gli stati delle filiali, le date di chiusura e le sedi successore di questa demo sono inventati e non rispecchiano alcun annuncio reale.',
  },
};

const en: Dict = {
  nav: { brand: 'Branch Network Assistant', product: 'Demo for Swiss Post', demo: 'Demo', how: 'How it works', backendUp: 'Backend connected', backendDown: 'Backend offline' },
  hero: {
    eyebrow: 'Voice agent for universal service',
    title: 'Every branch. Every status. Every alternative.',
    lead: 'Callers affected by the branch network changes reach a voice agent that knows every location: status, closure date, nearest alternative, partner branch hours, parcel pickup points and digital alternatives. In four languages, detected automatically.',
    stats: [
      { value: '170', label: 'branches through 2028' },
      { value: '155', label: 'municipalities affected' },
      { value: '4', label: 'languages, auto-detected' },
    ],
    ctaDemo: 'Start the demo',
    ctaHow: 'How it works',
  },
  demo: {
    title: 'Talk to the agent',
    lead: 'Pick a scenario, start the conversation and speak in any of the four languages. The agent works out the language itself.',
    scenariosTitle: 'Scenarios',
    scenariosHint: 'Typical calls from this language region.',
    sayLabel: 'Say',
    expectLabel: 'Expect',
    mechanismLabel: 'What happens',
    start: 'Start conversation',
    end: 'End conversation',
    connecting: 'Connecting …',
    listening: 'Agent is listening',
    speaking: 'Agent is speaking',
    idleHint: 'The microphone is requested on start.',
    micDenied: 'No microphone access. Allow it in the browser and start again.',
    noAgent: 'No agent ID configured. Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local.',
    transcript: 'Conversation',
    transcriptEmpty: 'No conversation yet. Start the call to see the thread here.',
    tools: 'Tool calls',
    toolsEmpty: 'No calls yet.',
    toolsHint: 'Each row is a server call the agent triggered during the conversation.',
    result: 'Result',
    resultEmpty: 'As soon as the agent looks up a location, the result appears here.',
    you: 'Caller',
    agent: 'Agent',
    closureOn: 'Closing on',
    daysLeft: 'days left',
    replacement: 'Replacement locations',
    openNow: 'Open now',
    closedNow: 'Currently closed',
    until: 'until',
    minutesWalk: 'about {n} minutes on foot',
    minuteWalkOne: 'about 1 minute on foot',
    liveNote: 'Location data live from Swiss Post.',
    liveFrom: 'Live from Swiss Post',
    justNow: 'just now',
    minutesAgo: '{n} min ago',
    verifyAtSource: 'Check on post.ch',
    demoDate: 'demo date',
    detectedNote: 'The conversation language is detected by the agent, independently of this page’s language.',
  },
  how: {
    title: 'How it works',
    lead: 'One knowledge base for the programme questions, five tools for the location data. No transactional integration, no customer data.',
    steps: [
      { title: 'Call arrives', body: 'Over a SIP number or straight in the browser. The agent greets neutrally and detects the language from the first utterances.' },
      { title: 'Resolve the location', body: 'Municipality, postcode or branch name — even partial or mistranscribed. On genuine ambiguity the agent asks which one.' },
      { title: 'Status and alternative', body: 'The agent gives the status, the date, and in the same breath the nearest replacement with distance and opening hours.' },
      { title: 'Deflect or hand over', body: 'If the errand can be done without a counter, the agent offers the digital route. Otherwise it hands over to a person.' },
    ],
    toolsTitle: 'The five tools',
    toolsLead: 'All read-only, all on public data.',
    tools: [
      { name: 'find_location', body: 'Resolves a spoken place reference into a known location — postcode, municipality, branch name, approximate.' },
      { name: 'get_branch_status', body: 'Status, closure date, days remaining and the officially designated successor locations.' },
      { name: 'find_alternatives', body: 'Nearest usable access points, ranked by distance, optionally filtered by the service needed.' },
      { name: 'get_opening_hours', body: 'Hours for a given date, with the holiday calendar and cantonal exceptions applied.' },
      { name: 'get_digital_alternative', body: 'Maps the errand onto digital services: Post App, digital letters, home service, eBill.' },
    ],
    integrationTitle: 'Integration',
    integration: [
      { term: 'Knowledge base', body: 'Markdown files in DE/FR/IT/EN uploaded to the platform — programme questions, commitments, partner branches, digital services.' },
      { term: 'SIP number', body: 'The agent answers calls over a SIP number. No connection to core systems is required.' },
      { term: 'Tools', body: 'Five server webhooks on this FastAPI application, HMAC-signed.' },
      { term: 'Data source', body: 'A local dataset by default. For a pilot, the production location source is connected through a single adapter.' },
    ],
  },
  footer: {
    disclaimer: 'Demonstration application. Not an official Swiss Post offering.',
    builtBy: 'Built by',
    preparedFor: 'Prepared for',
    voiceAi: 'Voice AI',
    rights: 'All rights reserved.',
    data: 'Every branch status, closure date and successor location in this demo is invented and does not reflect any real announcement.',
  },
};

export const DICTS: Record<Lang, Dict> = { de, fr, it, en };

/**
 * Demo scenarios. Each is written in its own language and points at a location
 * in that language region, so a presenter can run the whole set without ever
 * switching context.
 */
export const SCENARIOS: Record<Lang, Scenario[]> = {
  de: [
    {
      id: 'de-closing',
      title: 'Filiale schliesst Ende Jahr',
      caller: 'Anwohnerin aus Burgdorf',
      situation: 'Hat vom Umbau gehört und will wissen, was mit ihrer Filiale passiert.',
      say: '„Guten Tag, ich habe gehört, die Post in Burgdorf schliesst. Stimmt das?"',
      expect: 'Filiale Burgdorf 1, Schliessung am 31. Dezember 2026 — und sofort die nächste Zugangsstelle: My Post 24 in 40 Metern, Partnerfiliale Migros in 200 Metern.',
      mechanism: 'Der Agent schlägt den Standort live bei der Schweizerischen Post nach, nennt Status und Datum und im selben Atemzug die nächste Alternative. Über «Auf post.ch prüfen» lässt sich dieselbe Filiale auf der Website der Post öffnen.',
    },
    {
      id: 'de-service',
      title: 'Wo künftig einzahlen?',
      caller: 'Kunde aus Grenchen',
      situation: 'Braucht eine Alternative für Einzahlungen, nicht nur für Pakete.',
      say: '„Die Post in Grenchen schliesst — wo kann ich danach einzahlen?"',
      expect: 'Nur Standorte mit Zahlungsverkehr, mit Distanz und Öffnungszeiten. Paketautomaten tauchen gar nicht erst auf.',
      mechanism: 'Weil nach Einzahlungen gefragt wird, sucht der Agent gefiltert: Standorte ohne Zahlungsverkehr werden ausgeschlossen. Ein Paketautomat zwei Minuten entfernt wäre hier die falsche Antwort — und der Agent weiss das.',
    },
    {
      id: 'de-mobility',
      title: 'Nicht mehr mobil',
      caller: 'Anrufer, 80 Jahre',
      situation: 'Kann keine Filiale mehr zu Fuss erreichen und ist verunsichert.',
      say: '„Ich bin achtzig und kann nicht mehr weit laufen. Was soll ich jetzt machen?"',
      expect: 'Der Hausservice: Sendungen an der Haustür, Briefmarkenverkauf, Bargeldlieferung — kostenlos, wenn keine Zugangsstelle in zumutbarer Distanz liegt. Und ausdrücklich: niemand braucht ein Smartphone.',
      mechanism: 'Hier wird kein Standort nachgeschlagen — die Antwort kommt aus der Wissensdatenbank. Im Werkzeug-Panel bleibt es deshalb still: Der Agent erkennt, dass es hier nichts abzufragen gibt.',
    },
  ],
  fr: [
    {
      id: 'fr-closing',
      title: 'Fermeture annoncée',
      caller: "Habitant d'Yverdon-les-Bains",
      situation: "A reçu la lettre d'information et cherche le relais le plus proche.",
      say: '« Bonjour, la poste d\'Yverdon ferme bientôt? Où dois-je aller ensuite? »',
      expect: 'Yverdon-les-Bains 1, fermeture le 31 janvier 2027, puis les points d\'accès réels les plus proches.',
      mechanism: "L'agent consulte le site en direct auprès de la Poste Suisse, annonce le statut et la date, puis le relais le plus proche. « Vérifier sur post.ch » ouvre la même filiale sur le site de la Poste.",
    },
    {
      id: 'fr-service',
      title: 'Retirer de l\'argent',
      caller: 'Habitante de Payerne',
      situation: 'Sa filiale a été transformée et elle a besoin d\'espèces.',
      say: '« Je suis allée à la poste de Payerne. Où est-ce que je peux retirer de l\'argent maintenant? »',
      expect: 'Transformée, pas fermée — puis uniquement les points offrant le trafic des paiements.',
      mechanism: "Comme la demande porte sur les espèces, l'agent filtre: les automates à colis sont écartés, seuls les guichets pouvant traiter des paiements sont proposés.",
    },
    {
      id: 'fr-mobility',
      title: 'Mobilité réduite',
      caller: 'Appelant, 80 ans',
      situation: 'Ne peut plus se rendre à pied dans une filiale.',
      say: '« J\'ai quatre-vingts ans et je ne peux plus marcher loin. Que dois-je faire? »',
      expect: 'Le service à domicile: envois pris à la porte, vente de timbres, remise d\'espèces — gratuit sans point d\'accès à distance raisonnable. Aucun smartphone requis.',
      mechanism: "Aucune consultation de site ici — la réponse vient de la base de connaissances. Le panneau d'outils reste vide: l'agent sait qu'il n'y a rien à rechercher.",
    },
  ],
  it: [
    {
      id: 'it-closing',
      title: 'Chiusura imminente',
      caller: 'Residente di Mendrisio',
      situation: 'Vuole sapere fino a quando può usare lo sportello abituale.',
      say: '« Buongiorno, la posta di Mendrisio chiude? Fino a quando resta aperta? »',
      expect: 'Mendrisio Borgo, chiusura il 30 settembre 2026 — pochi giorni, quindi contano i giorni rimanenti.',
      mechanism: "L'agente consulta la sede in diretta presso la Posta Svizzera, indica stato e data e subito l'alternativa più vicina. Con «Verifica su post.ch» si apre la stessa filiale sul sito della Posta.",
    },
    {
      id: 'it-service',
      title: 'Dove fare i versamenti?',
      caller: 'Residente di Mendrisio',
      situation: 'Serve un\'alternativa per i versamenti, non solo per i pacchi.',
      say: '« Dove posso fare i versamenti dopo la chiusura? »',
      expect: 'Solo sedi con traffico dei pagamenti, con distanza e orari. Gli automat per pacchi non compaiono.',
      mechanism: "Poiché la richiesta riguarda i versamenti, l'agente filtra: le sedi senza traffico dei pagamenti vengono escluse. Un automat a due minuti sarebbe la risposta sbagliata.",
    },
    {
      id: 'it-mobility',
      title: 'Mobilità ridotta',
      caller: 'Chiamante, 80 anni',
      situation: 'Non riesce più a raggiungere una filiale a piedi.',
      say: '« Ho ottant\'anni e non riesco più a camminare a lungo. Cosa devo fare? »',
      expect: 'Il servizio a domicilio: invii ritirati alla porta, vendita di francobolli, consegna di contanti — gratuito senza un punto di accesso a distanza ragionevole. Nessuno smartphone necessario.',
      mechanism: "Qui non viene consultata nessuna sede — la risposta arriva dalla base di conoscenza. Il pannello degli strumenti resta vuoto: l'agente sa che non c'è nulla da cercare.",
    },
  ],
  en: [
    {
      id: 'en-closing',
      title: 'Branch closing',
      caller: 'Resident of Uster',
      situation: 'Heard about the changes and wants to know what happens to their branch.',
      say: '"I heard the post office in Uster is closing. Is that right?"',
      expect: 'Uster 1, closing 31 March 2027, and straight away the nearest real access points with distance and opening hours.',
      mechanism: 'The agent looks the location up live at Swiss Post, gives the status and date, then the nearest alternative in the same breath. "Check on post.ch" opens that same branch on Swiss Post\'s own website.',
    },
    {
      id: 'en-service',
      title: 'Paying bills afterwards',
      caller: 'Customer in Uster',
      situation: 'Needs somewhere to pay bills, not just drop off parcels.',
      say: '"Where can I pay bills once it closes?"',
      expect: 'Only locations that actually handle payments, with distance and hours. Parcel terminals never appear.',
      mechanism: 'Because the caller asked about payments, the agent searches with a filter: locations without counter payments are excluded. A parcel terminal two minutes away would be the wrong answer here.',
    },
    {
      id: 'en-mobility',
      title: 'No longer mobile',
      caller: 'Caller, aged 80',
      situation: 'Can no longer reach a branch on foot and is worried.',
      say: '"I\'m eighty and can\'t walk far any more. What should I do?"',
      expect: 'The home service: items collected at the door, stamps sold, cash delivered — free where no access point is within reasonable distance. And explicitly: nobody needs a smartphone.',
      mechanism: 'Nothing is looked up here — the answer comes from the knowledge base. The tool panel stays empty, because the agent recognises there is nothing to query.',
    },
  ],
};

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
  scenarios: Scenario[];
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('de');
  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: DICTS[lang], scenarios: SCENARIOS[lang] }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}
