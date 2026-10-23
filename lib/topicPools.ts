// Structured topic pools for all four reading types, replacing the old
// flat string arrays / inline comma-lists in lib/storyPrompt.ts. Pure data
// — no I/O, fully unit-testable. See lib/topicSelection.ts for the
// algorithm that picks from these, and lib/topicSelection.server.ts for the
// R2-backed history glue that wires it into generation.
//
// Every item carries a stable `id` (used as the recent-use history key —
// never rename an id without accepting that item's history resets) and a
// `category` (used for cross-type same-day diversity and for rotating
// which kind of content shows up, not just which specific item).

import { ReadingType } from "./types";

export type Factuality = "fiction" | "history" | "verified_fact";

export type TopicItem = {
  id: string;
  category: string;
  subcategory?: string;
  premise: string;
  format?: string;
  factuality?: Factuality;
  setting?: string;
  centralConflict?: string;
  emotionalTone?: string;
  // Only for factuality "history" / "verified_fact" — true, high-confidence
  // background facts supplied by a human (not generated), so the model
  // paraphrases/simplifies known facts instead of inventing dates, names,
  // or quotes. Never auto-populate this from a live source — see
  // buildNewsPrompt's authenticity rules for why.
  verifiedBackground?: string[];
  // Dialogue/speaking only — the communicative act the scenario practises
  // (asking for information, declining politely, giving advice, ...).
  purpose?: string;
};

// ---------------------------------------------------------------------
// STORY (B1) — concrete premises across 12 categories. Majority real/
// factual by design (per the brief: "do not make every story fictional");
// fiction is one category among several, not the default.
// ---------------------------------------------------------------------
export const STORY_POOL: TopicItem[] = [
  // Real historical events and discoveries
  {
    id: "story-kalkriese-discovery",
    category: "historical-events",
    premise: "How a British army officer's hobby of metal-detecting in a Lower Saxony field in 1987 led to the rediscovery of the lost site of the Varus battle, overturning a 500-year-old historical guess.",
    format: "historical_reconstruction",
    factuality: "history",
    emotionalTone: "quietly astonishing",
    verifiedBackground: [
      "In 9 AD, Germanic tribes under Arminius destroyed three Roman legions in the Teutoburg Forest (Varusschlacht) — one of Rome's worst defeats.",
      "For centuries the exact battlefield location was debated and unconfirmed.",
      "In 1987, British amateur archaeologist Tony Clunn, searching with a metal detector near Kalkriese (Lower Saxony), found Roman coins and sling bullets.",
      "Subsequent excavations at Kalkriese uncovered a Roman rampart, more coins, and skeletal remains, making it the leading candidate site today.",
    ],
  },
  {
    id: "story-berlin-wall-fall",
    category: "historical-events",
    premise: "A press-conference slip of the tongue on the evening of 9 November 1989 — a spokesman misstating when a new travel rule would take effect — sent thousands of East Berliners to the checkpoints that same night.",
    format: "historical_reconstruction",
    factuality: "history",
    emotionalTone: "tense, then euphoric",
    verifiedBackground: [
      "On 9 November 1989, GDR spokesman Günter Schabowski announced new travel rules at a press conference.",
      "When asked when they took effect, he said 'immediately' — a misstatement of the intended start date.",
      "Crowds gathered at the border crossings that night; overwhelmed guards opened the gates.",
      "The Berlin Wall effectively fell that night, ahead of German reunification on 3 October 1990.",
    ],
  },
  {
    id: "story-gutenberg-press",
    category: "historical-events",
    premise: "A Mainz goldsmith's gamble on a wine-press design to mass-produce text changed how ideas moved across Europe forever.",
    format: "historical_reconstruction",
    factuality: "history",
    emotionalTone: "inventive, high-stakes",
    verifiedBackground: [
      "Johannes Gutenberg, a goldsmith from Mainz, developed a movable-type printing press around 1450.",
      "He adapted mechanical principles from wine and olive presses already in use.",
      "His workshop produced the Gutenberg Bible, among the first major books printed this way in Europe.",
      "The technology spread rapidly across Europe within decades, transforming the spread of books and ideas.",
    ],
  },

  // Curious facts about Germany / German-speaking countries
  {
    id: "story-ampelmann",
    category: "curious-facts",
    premise: "A tiny pedestrian-crossing figure designed for East Berlin almost got deleted after reunification — until public protest turned him into one of the most recognisable souvenirs in the country.",
    format: "human_interest",
    factuality: "verified_fact",
    emotionalTone: "nostalgic, a little funny",
    verifiedBackground: [
      "The Ampelmännchen (little traffic-light man), with his hat, was designed in 1961 for East German pedestrian signals.",
      "After reunification in 1990, West German standard signals began replacing East German ones, including the Ampelmännchen.",
      "Public campaigns (notably by designer Markus Heckhausen) saved and later commercialised the figure.",
      "Today it appears on everything from street signs to souvenirs, especially in Berlin.",
    ],
  },
  {
    id: "story-autobahn-speed",
    category: "curious-facts",
    premise: "Why large stretches of German motorways still have no general speed limit, and what actually happens on the sections that do.",
    format: "explainer_narrative",
    factuality: "verified_fact",
    emotionalTone: "curious, a bit wry",
    verifiedBackground: [
      "Roughly a large share of the German Autobahn network has no blanket speed limit, though recommended speeds and local limits apply in many sections.",
      "Sections near cities, construction zones, tight curves, or known accident spots do have posted limits.",
      "The lack of a nationwide limit is a recurring political debate in Germany.",
    ],
  },
  {
    id: "story-kummerspeck",
    category: "curious-facts",
    premise: "A German compound word that literally means 'grief bacon' turns out to describe something every language has a word for, just not this vividly.",
    format: "explainer_narrative",
    factuality: "verified_fact",
    emotionalTone: "light, amused",
    verifiedBackground: [
      "'Kummerspeck' (literally 'grief bacon') is a real German word for weight gained from emotional overeating.",
      "German is known for long, precise compound nouns that bundle a whole idea into one word.",
    ],
  },

  // Science, inventions, technology, unexpected discoveries
  {
    id: "story-benz-patent-wagon",
    category: "science-and-invention",
    premise: "A Mannheim engineer's three-wheeled vehicle looked like a toy to his neighbours — until his wife secretly drove it on the first long-distance car trip in history to prove it worked.",
    format: "historical_reconstruction",
    factuality: "history",
    emotionalTone: "bold, a little mischievous",
    verifiedBackground: [
      "Carl Benz patented the Benz Patent-Motorwagen in Mannheim in 1886, widely regarded as the first purpose-built automobile.",
      "In 1888, his wife Bertha Benz drove it roughly 100 km from Mannheim to Pforzheim without his knowledge, to prove the vehicle's practicality — the first long-distance automobile journey.",
      "Along the way she improvised fixes (including using a hatpin and asking a cobbler for leather) for mechanical problems.",
    ],
  },
  {
    id: "story-contact-lens-accident",
    category: "science-and-invention",
    premise: "A routine lab accident gives a researcher an idea that eventually changes how millions of people see without glasses.",
    format: "human_interest",
    factuality: "fiction",
    centralConflict: "whether to pursue a risky, unfunded side project",
    emotionalTone: "hopeful, curious",
  },
  {
    id: "story-ai-translation-mixup",
    category: "science-and-invention",
    premise: "A small German company's new translation app mistranslates one crucial word in a business contract — and the resulting scramble reveals how much trust people now place in software.",
    format: "narrative",
    factuality: "fiction",
    centralConflict: "a costly technical mistake nobody wants to own",
    emotionalTone: "tense, a little comic",
  },

  // Unusual true events and human-interest stories
  {
    id: "story-leipzig-library-return",
    category: "human-interest-true",
    premise: "A library book is returned decades overdue with a short note — and the librarian's search for who sent it uncovers more than anyone expected.",
    format: "human_interest",
    factuality: "fiction",
    emotionalTone: "warm, mysterious",
  },
  {
    id: "story-lost-wallet-returned",
    category: "human-interest-true",
    premise: "A tourist loses a wallet in a German train station; what happens to it over the next 48 hours changes their opinion of the city.",
    format: "narrative",
    factuality: "fiction",
    centralConflict: "assumptions about honesty being tested",
    emotionalTone: "touching, understated",
  },

  // Social trends, public debates, internet culture
  {
    id: "story-four-day-week-trial",
    category: "social-trends",
    premise: "A mid-sized German company tries a four-day work week for six months — and the surprising part isn't productivity, it's what employees do with the extra day.",
    format: "human_interest",
    factuality: "fiction",
    centralConflict: "whether the experiment should become permanent",
    emotionalTone: "optimistic but uncertain",
  },
  {
    id: "story-neighbourhood-app-dispute",
    category: "social-trends",
    premise: "A neighbourhood app meant to help people lend tools and share news turns into an unexpected battleground over a parking dispute.",
    format: "narrative",
    factuality: "fiction",
    centralConflict: "a small disagreement escalating online",
    emotionalTone: "wry, relatable",
  },
  {
    id: "story-digital-detox-weekend",
    category: "social-trends",
    premise: "A group of friends agree to a phone-free weekend in the countryside — and one of them secretly struggles far more than they expected to admit.",
    format: "narrative",
    factuality: "fiction",
    centralConflict: "pride versus honesty about a hard time",
    emotionalTone: "gently funny, then sincere",
  },

  // Regional traditions, local festivals, cultural differences
  {
    id: "story-oktoberfest-origin",
    category: "regional-traditions",
    premise: "Munich's most famous festival didn't start as a beer festival at all — it began as a royal wedding party that the whole city was invited to.",
    format: "historical_reconstruction",
    factuality: "history",
    emotionalTone: "festive, surprising",
    verifiedBackground: [
      "Oktoberfest began in October 1810 as a celebration of the wedding of Crown Prince Ludwig (later King Ludwig I) of Bavaria to Princess Therese von Sachsen-Hildburghausen.",
      "The citizens of Munich were invited to the festivities on the fields in front of the city gates, later named Theresienwiese after the princess.",
      "Horse races at the original celebration became an annual tradition, which gradually grew into the beer festival known today.",
    ],
  },
  {
    id: "story-karneval-reasons",
    category: "regional-traditions",
    premise: "Why cities along the Rhine take Karneval so seriously that schools and offices plan around it — and what the tradition is actually about beneath the costumes.",
    format: "explainer_narrative",
    factuality: "verified_fact",
    emotionalTone: "lively, warm",
    verifiedBackground: [
      "Karneval (also called Fasching or Fastnacht in other regions) is especially prominent in Rhineland cities like Cologne, Düsseldorf, and Mainz.",
      "It traditionally precedes the Christian fasting period of Lent.",
      "Rosenmontag (Rose Monday) is the peak day, with large street parades in these cities.",
    ],
  },
  {
    id: "story-small-town-festival-origin",
    category: "regional-traditions",
    premise: "A traveller passing through a small German town is confused by an odd annual tradition — until a local explains the surprisingly practical reason it started centuries ago.",
    format: "narrative",
    factuality: "fiction",
    emotionalTone: "curious, charming",
  },

  // Travel, unusual places, unfamiliar customs
  {
    id: "story-village-silence-hour",
    category: "travel-and-customs",
    premise: "A visitor to a small Bavarian village is baffled by the strict afternoon 'quiet hours' — until missing one explains exactly why they matter.",
    format: "narrative",
    factuality: "fiction",
    centralConflict: "an outsider unknowingly breaking a local norm",
    emotionalTone: "awkward, then understanding",
  },
  {
    id: "story-hostel-stranger-advice",
    category: "travel-and-customs",
    premise: "A solo traveller in Hamburg takes directions from a stranger at a hostel that lead somewhere far more interesting than the planned tourist stop.",
    format: "first_person",
    factuality: "fiction",
    emotionalTone: "adventurous, light",
  },

  // Work, friendships, family, relationships
  {
    id: "story-honest-mistake-report",
    category: "work-and-relationships",
    premise: "An employee notices their own costly billing mistake that nobody else has spotted yet, and has to decide what to do before the end of the day.",
    format: "personal_dilemma",
    factuality: "fiction",
    centralConflict: "honesty versus self-protection",
    emotionalTone: "tense, principled",
  },
  {
    id: "story-sibling-inheritance-house",
    category: "work-and-relationships",
    premise: "Two siblings clearing out their late grandmother's house disagree about what to keep — until they find something that changes what the argument was really about.",
    format: "narrative",
    factuality: "fiction",
    centralConflict: "grief disguised as a disagreement over objects",
    emotionalTone: "bittersweet",
  },
  {
    id: "story-mentor-reconnect",
    category: "work-and-relationships",
    premise: "A former apprentice runs into their old, famously difficult trainer years later — and finally understands why they were trained so strictly.",
    format: "narrative",
    factuality: "fiction",
    emotionalTone: "reflective, warm",
  },

  // Everyday problems requiring a decision or solution
  {
    id: "story-shared-garden-fence",
    category: "everyday-decisions",
    premise: "Two neighbours disagree for months over a shared garden fence, until an unexpected solution comes from neither of their original plans.",
    format: "narrative",
    factuality: "fiction",
    centralConflict: "stubbornness on both sides",
    emotionalTone: "wry, then satisfying",
  },
  {
    id: "story-broken-appliance-warranty",
    category: "everyday-decisions",
    premise: "A newly bought washing machine breaks down after one use, and the buyer has to navigate a surprisingly tricky warranty process to get it fixed.",
    format: "narrative",
    factuality: "fiction",
    emotionalTone: "frustrated, then resourceful",
  },
  {
    id: "story-roommate-chores-standoff",
    category: "everyday-decisions",
    premise: "Three roommates finally confront the unspoken chore imbalance that's been building for months — and the conversation doesn't go how any of them expected.",
    format: "narrative",
    factuality: "fiction",
    emotionalTone: "awkward, honest",
  },

  // Mystery, coincidence, misunderstandings, unexpected outcomes
  {
    id: "story-old-photograph-detail",
    category: "mystery-and-coincidence",
    premise: "Someone finds an old photograph of their street from decades ago and notices a small detail that doesn't match anything anyone remembers.",
    format: "mystery",
    factuality: "fiction",
    emotionalTone: "intriguing, quiet",
  },
  {
    id: "story-wrong-address-package",
    category: "mystery-and-coincidence",
    premise: "A package delivered to the wrong address turns out to connect two strangers in a way neither expected.",
    format: "mystery",
    factuality: "fiction",
    emotionalTone: "charming, coincidental",
  },
  {
    id: "story-coincidental-reunion",
    category: "mystery-and-coincidence",
    premise: "Two people keep running into each other by coincidence across a single week in the same city, until one of them starts to wonder if it's really chance.",
    format: "mystery",
    factuality: "fiction",
    emotionalTone: "light, intriguing",
  },

  // Personal dilemmas and conflicting opinions
  {
    id: "story-job-offer-relocate",
    category: "personal-dilemmas",
    premise: "Someone has 48 hours to decide whether to take a job offer that would mean moving away from an aging parent.",
    format: "personal_dilemma",
    factuality: "fiction",
    centralConflict: "ambition versus obligation",
    emotionalTone: "weighty, sincere",
  },
  {
    id: "story-friend-business-loan",
    category: "personal-dilemmas",
    premise: "A close friend asks to borrow money for a plan that sounds genuinely risky — and saying no feels like it could cost more than the money.",
    format: "personal_dilemma",
    factuality: "fiction",
    centralConflict: "friendship versus financial judgment",
    emotionalTone: "uncomfortable, honest",
  },

  // Light humour and awkward social situations
  {
    id: "story-wrong-group-chat",
    category: "light-humour",
    premise: "A message meant for one group chat gets sent to a very different one, and the fallout is more awkward — and funnier — than expected.",
    format: "message_thread",
    factuality: "fiction",
    emotionalTone: "comic, cringe-then-funny",
  },
  {
    id: "story-double-booked-table",
    category: "light-humour",
    premise: "A restaurant double-books the same table for two very different occasions at once, and both parties have to figure out what to do.",
    format: "narrative",
    factuality: "fiction",
    emotionalTone: "farcical, good-natured",
  },
  {
    id: "story-costume-mixup-party",
    category: "light-humour",
    premise: "Someone shows up to a party in completely the wrong kind of costume — and has to decide whether to leave or own it.",
    format: "first_person",
    factuality: "fiction",
    emotionalTone: "embarrassing, ultimately funny",
  },
];

// ---------------------------------------------------------------------
// NEWS (B1) — evergreen, verifiable explainer angles rather than
// "invent today's plausible event." See buildNewsPrompt in storyPrompt.ts
// for how factuality shapes the instructions.
// ---------------------------------------------------------------------
export const NEWS_POOL: TopicItem[] = [
  {
    id: "news-bundestag-lawmaking",
    category: "politics-explainer",
    premise: "How a law actually moves from a first draft to taking effect in Germany — the real steps, not a simplified civics-class version.",
    factuality: "verified_fact",
  },
  {
    id: "news-coalition-basics",
    category: "politics-explainer",
    premise: "Why German federal governments are almost always coalitions of multiple parties, and what that structurally changes about how policy gets made.",
    factuality: "verified_fact",
  },
  {
    id: "news-duale-ausbildung",
    category: "education-explainer",
    premise: "How Germany's dual vocational training system (duale Ausbildung) actually works — splitting time between a company and a trade school.",
    factuality: "verified_fact",
  },
  {
    id: "news-krankenversicherung-structure",
    category: "health-explainer",
    premise: "How Germany's statutory health insurance system (gesetzliche Krankenversicherung) is funded and what it actually covers.",
    factuality: "verified_fact",
  },
  {
    id: "news-energiewende-basics",
    category: "climate-explainer",
    premise: "What the 'Energiewende' actually refers to, and the real trade-offs Germany has faced in shifting its energy mix over the past two decades.",
    factuality: "verified_fact",
  },
  {
    id: "news-eu-presidency-role",
    category: "eu-explainer",
    premise: "What it actually means when a country 'holds the EU Council presidency,' and what changes (and doesn't) during Germany's turn.",
    factuality: "verified_fact",
  },
  {
    id: "news-bundesliga-structure",
    category: "sports-explainer",
    premise: "How German football's promotion-and-relegation system works between the Bundesliga, 2. Bundesliga, and lower divisions, and why it creates such high stakes at the end of a season.",
    factuality: "verified_fact",
  },
  {
    id: "news-mindestlohn-history",
    category: "economy-explainer",
    premise: "Germany didn't have a nationwide statutory minimum wage until relatively recently — the real history of when and why it was introduced.",
    factuality: "history",
    verifiedBackground: [
      "Germany introduced a nationwide statutory minimum wage (Mindestlohn) for the first time in 2015.",
      "Before that, wage floors were set by sector-specific collective bargaining agreements, not a single national rate.",
    ],
  },
  {
    id: "news-digitalization-schools",
    category: "education-explainer",
    premise: "Germany's school system has historically been slower to digitize than many neighbours — the structural reasons why, and what's changed recently.",
    factuality: "verified_fact",
  },
  {
    id: "news-deutsche-bahn-punctuality",
    category: "technology-explainer",
    premise: "Why Deutsche Bahn's punctuality has become such a persistent public talking point, and what the company has said about the underlying causes.",
    factuality: "verified_fact",
  },
  {
    id: "news-eu-founding-basics",
    category: "eu-explainer",
    premise: "The real, often-misremembered story of how European integration started after the Second World War — coal and steel, not a grand political union, first.",
    factuality: "history",
    verifiedBackground: [
      "European integration began with the European Coal and Steel Community (1951), founded by six countries including West Germany and France.",
      "The 1957 Treaty of Rome created the European Economic Community, a precursor to today's EU.",
      "The Maastricht Treaty (1992/1993) formally established the European Union as such.",
    ],
  },
  {
    id: "news-oktoberfest-security-scale",
    category: "culture-explainer",
    premise: "What actually goes into organizing and securing an event the size of Oktoberfest each year — the logistics most visitors never think about.",
    factuality: "verified_fact",
  },
];

// ---------------------------------------------------------------------
// DIALOGUE (B1) — richer negotiation/opinion/conflict than the A2
// speaking pool. Tagged by purpose/conflict/tone/format for diversity
// rotation and to keep it visibly distinct from the A2 pool below.
// ---------------------------------------------------------------------
export const DIALOGUE_POOL: TopicItem[] = [
  { id: "dlg-customer-complaint-handling", category: "work", premise: "two colleagues arguing (politely) about how to handle a difficult customer at work", purpose: "disagreeing and finding a compromise", centralConflict: "different approaches to conflict", emotionalTone: "professional tension" },
  { id: "dlg-flatmates-dog-rules", category: "home", premise: "flatmates negotiating new house rules after one of them gets a dog", purpose: "making a request", centralConflict: "competing needs under one roof", emotionalTone: "exasperated but fond" },
  { id: "dlg-road-trip-budget", category: "travel", premise: "two friends planning a road trip across Germany — disagreeing on the route and budget", purpose: "comparing options", centralConflict: "money versus adventure", emotionalTone: "playful disagreement" },
  { id: "dlg-insurance-rejected-claim", category: "bureaucracy", premise: "a person calling their insurance company about a rejected claim", purpose: "explaining a problem", centralConflict: "a system versus an individual", emotionalTone: "frustrated, persistent" },
  { id: "dlg-university-major-change", category: "education", premise: "two students discussing whether to change their university major", purpose: "giving advice", centralConflict: "fear of the wrong choice", emotionalTone: "uncertain, supportive" },
  { id: "dlg-mock-interview-prep", category: "work", premise: "a job applicant and a friend doing a mock interview to prepare", purpose: "giving advice", emotionalTone: "nervous, encouraging" },
  { id: "dlg-noise-complaint-neighbours", category: "home", premise: "two neighbours dealing with a noise complaint and trying to find a solution", purpose: "resolving a misunderstanding", centralConflict: "comfort versus courtesy", emotionalTone: "tense, then conciliatory" },
  { id: "dlg-anniversary-party-plan", category: "family", premise: "siblings planning their parents' surprise anniversary party and disagreeing on details", purpose: "making a decision together", centralConflict: "different visions for the event", emotionalTone: "warm bickering" },
  { id: "dlg-move-city-for-work", category: "work", premise: "two friends debating whether to move to a new city for work", purpose: "giving an opinion", centralConflict: "ambition versus roots", emotionalTone: "reflective" },
  { id: "dlg-landlord-explain-situation", category: "bureaucracy", premise: "a person trying to explain a complicated situation to their landlord", purpose: "explaining a problem", emotionalTone: "anxious, hopeful" },
  { id: "dlg-office-christmas-party", category: "work", premise: "two colleagues planning an office Christmas party with very different ideas", purpose: "comparing options", emotionalTone: "mildly comic clash" },
  { id: "dlg-vegan-cooking-negotiation", category: "home", premise: "two friends — one vegan, one not — cooking together and negotiating the menu", purpose: "finding a compromise", emotionalTone: "lighthearted" },
  { id: "dlg-doctor-lifestyle-change", category: "health", premise: "a person and their doctor discussing a lifestyle change and the patient's resistance", purpose: "giving advice", centralConflict: "medical advice versus personal habit", emotionalTone: "candid, a little stubborn" },
  { id: "dlg-social-media-debate", category: "social", premise: "two friends debating whether social media is good or bad, using personal examples", purpose: "giving an opinion", emotionalTone: "animated debate" },
  { id: "dlg-move-back-home-money", category: "family", premise: "a parent and adult child discussing whether the child should move back home to save money", purpose: "giving advice", centralConflict: "independence versus practicality", emotionalTone: "tender, a little awkward" },
  { id: "dlg-remote-vs-office-complaint", category: "work", premise: "two colleagues, one working from home and one in-office, complaining to each other", purpose: "sharing an experience", emotionalTone: "commiserating humour" },
  { id: "dlg-delayed-train-strangers", category: "travel", premise: "two strangers stuck together at a delayed train station passing the time", purpose: "sharing an experience", emotionalTone: "unexpectedly warm" },
  { id: "dlg-pay-rise-negotiation", category: "work", premise: "a person negotiating a pay rise with their manager", purpose: "making a request", centralConflict: "self-worth versus budget constraints", emotionalTone: "nervous but assertive" },
  { id: "dlg-reunion-dinner-catchup", category: "friendship", premise: "two friends who haven't seen each other in a year catching up over dinner", purpose: "sharing an experience", emotionalTone: "warm nostalgia" },
  { id: "dlg-adopt-pet-complications", category: "home", premise: "a couple deciding between adopting a pet and the complications that come with it", purpose: "making a decision together", emotionalTone: "excited but cautious" },
  { id: "dlg-apology-missed-event", category: "friendship", premise: "a person apologising to a friend for missing an important event and explaining what happened", purpose: "apologizing and explaining why", centralConflict: "guilt versus a legitimate reason", emotionalTone: "regretful, relieved" },
  { id: "dlg-unexpected-job-loss", category: "work", premise: "a person telling a close friend they unexpectedly lost their job, and the friend trying to help without being patronising", purpose: "describing an unexpected event", emotionalTone: "shaken, supportive" },
  { id: "dlg-compare-two-flats", category: "home", premise: "two friends comparing two apartments they both viewed, weighing price against location", purpose: "comparing options", emotionalTone: "practical, a little stressed" },
  { id: "dlg-surprise-promotion-reaction", category: "work", premise: "a person telling their partner about a surprise promotion that also means more travel, and how they both feel about it", purpose: "expressing surprise, disappointment, or excitement", centralConflict: "good news with a real cost", emotionalTone: "mixed emotions" },
];

// ---------------------------------------------------------------------
// SPEAKING (A2) — organized by communicative purpose, not just setting,
// so the pool can't collapse into "ask a shop/office for information"
// repeatedly. Contexts deliberately span work, home, transport, shopping,
// hobbies, local events, travel, appointments, relationships, and the
// unexpected.
// ---------------------------------------------------------------------
export const SPEAKING_POOL: TopicItem[] = [
  // Asking for information
  { id: "spk-train-station-directions", category: "transport", purpose: "asking for information", premise: "a tourist asking a local for directions to the nearest train station" },
  { id: "spk-exchange-student-routine", category: "home", purpose: "asking for information", premise: "someone describing their daily routine to a new exchange student who's curious about everyday German life" },

  // Explaining a problem
  { id: "spk-broken-item-return", category: "shopping", purpose: "explaining a problem", premise: "a customer returning a broken item to a shop and explaining what went wrong" },
  { id: "spk-running-late-explain", category: "relationships", purpose: "explaining a problem", premise: "a person explaining to a friend why they are running late to meet them" },

  // Making a request
  { id: "spk-neighbour-water-plants", category: "home", purpose: "making a request", premise: "a person asking a neighbour to water their plants while they're on holiday" },
  { id: "spk-coworker-explain-machine", category: "work", purpose: "making a request", premise: "someone asking a colleague to explain how the coffee machine works" },

  // Declining politely
  { id: "spk-decline-weekend-invite", category: "relationships", purpose: "declining politely", premise: "a person politely declining a friend's invitation to a weekend trip because they already have plans" },
  { id: "spk-decline-extra-shift", category: "work", purpose: "declining politely", premise: "an employee politely explaining to a colleague why they can't cover an extra shift this week" },

  // Giving an opinion
  { id: "spk-favourite-season", category: "hobbies", purpose: "giving an opinion", premise: "two friends comparing their favourite season and why" },
  { id: "spk-tv-show-opinion", category: "hobbies", purpose: "giving an opinion", premise: "two friends talking about a TV show or film they both like and what they think of the ending" },

  // Disagreeing and finding a compromise
  { id: "spk-film-choice-disagreement", category: "hobbies", purpose: "disagreeing and finding a compromise", premise: "two friends arguing (nicely) about which film to watch tonight" },
  { id: "spk-dinner-menu-disagreement", category: "home", purpose: "disagreeing and finding a compromise", premise: "two friends planning what to cook for a small dinner party and disagreeing on the menu" },

  // Describing an unexpected event
  { id: "spk-missed-bus-story", category: "transport", purpose: "describing an unexpected event", premise: "someone telling a friend about missing their bus and how they ended up getting to work a different way" },
  { id: "spk-surprise-package", category: "home", purpose: "describing an unexpected event", premise: "a person telling a neighbour about an unexpected package that arrived at their door" },

  // Asking for clarification
  { id: "spk-homework-clarification", category: "education", purpose: "asking for clarification", premise: "a student asking a teacher for help understanding a homework assignment" },
  { id: "spk-appointment-confirm-details", category: "appointments", purpose: "asking for clarification", premise: "a person calling a doctor's office to confirm the exact time and address of an appointment" },

  // Giving advice
  { id: "spk-german-learning-advice", category: "education", purpose: "giving advice", premise: "a person asking a friend for advice on learning German faster" },
  { id: "spk-chores-schedule-advice", category: "home", purpose: "giving advice", premise: "two roommates discussing a fairer way to split chores this week" },

  // Apologizing and explaining why
  { id: "spk-apology-forgot-plan", category: "relationships", purpose: "apologizing and explaining why", premise: "a person apologising to a friend for forgetting about a plan they made together" },
  { id: "spk-apology-wrong-order", category: "shopping", purpose: "apologizing and explaining why", premise: "a shop assistant apologising to a customer for a mixed-up order and explaining how they'll fix it" },

  // Comparing options
  { id: "spk-birthday-gift-choice", category: "shopping", purpose: "comparing options", premise: "a person choosing a birthday gift for a friend with a shop assistant's advice" },
  { id: "spk-weekend-trip-cities", category: "travel", purpose: "comparing options", premise: "two friends planning a simple weekend trip and choosing between two cities" },

  // Expressing surprise, disappointment, or excitement
  { id: "spk-exciting-weekend-news", category: "relationships", purpose: "expressing surprise, disappointment, or excitement", premise: "a person telling a coworker excitedly about their weekend plans" },
  { id: "spk-disappointing-weather-event", category: "local-events", purpose: "expressing surprise, disappointment, or excitement", premise: "two friends reacting to a local outdoor event being cancelled because of bad weather" },

  // Resolving a misunderstanding
  { id: "spk-mixed-up-meeting-time", category: "appointments", purpose: "resolving a misunderstanding", premise: "two colleagues sorting out a mix-up about what time they were supposed to meet" },
  { id: "spk-wrong-table-restaurant", category: "shopping", purpose: "resolving a misunderstanding", premise: "two people in a waiting room chatting and realising they misunderstood why they were both called in" },

  // Sharing an experience
  { id: "spk-weekend-plans-coworker", category: "work", purpose: "sharing an experience", premise: "a person describing their weekend plans to a coworker over coffee" },
  { id: "spk-pet-wishlist-chat", category: "home", purpose: "sharing an experience", premise: "two friends talking about a pet they would like to have" },

  // Making a decision together
  { id: "spk-lunch-spot-decision", category: "work", purpose: "making a decision together", premise: "two colleagues deciding where to go for lunch and having different preferences" },
  { id: "spk-school-trip-packing", category: "family", purpose: "making a decision together", premise: "a parent and child talking about what to pack for a school trip" },

  // Extra contexts to round out travel/appointments/local-events coverage
  { id: "spk-flea-market-bargain", category: "shopping", purpose: "comparing options", premise: "two friends at a flea market — one wants to buy something, the other tries to bargain" },
  { id: "spk-language-exchange-intro", category: "local-events", purpose: "sharing an experience", premise: "two people meeting for the first time at a language exchange event" },
];

export function getPoolForType(type: ReadingType): TopicItem[] {
  switch (type) {
    case "news": return NEWS_POOL;
    case "dialogue": return DIALOGUE_POOL;
    case "story": return STORY_POOL;
    case "speaking": return SPEAKING_POOL;
  }
}
