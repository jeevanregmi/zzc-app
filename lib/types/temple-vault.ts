/**
 * Temple Vault — type definitions.
 *
 * The sacred, founder-only spiritual sanctuary inside ZZC.
 * See docs/TEMPLE_VAULT.md for full architecture and philosophy.
 *
 * IMPORTANT:
 * - All Temple Vault types are PRIVATE to the founder (isOwner() only)
 * - No public export, no sharing, no recommendation systems
 * - AI draft meanings must be clearly marked as such
 * - Audio sources require explicit public domain verification
 *
 * Collections (Phase 2+, not created yet):
 *   - temple_chambers   (static chamber definitions per founder)
 *   - temple_content    (texts, shlokas, stotras, bhajan references)
 *   - temple_notes      (personal spiritual reflections — always private)
 *   - semantic_dictionary (shared with civic domain — domain: "spiritual")
 */

import type { SpiritualTradition, SpiritualSemanticAtom, MultilingualText } from "./semantic-atom";

// ─── Chamber ──────────────────────────────────────────────────────────────────

export type ChamberTheme =
  | "shiva"         // deep blue-grey, ash, crescent moon
  | "krishna"       // midnight blue, gold, lotus
  | "devi"          // deep rose, crimson, marigold
  | "hanuman"       // saffron, vermilion, strength
  | "buddha"        // stone grey, pale gold, stillness
  | "advaita"       // deep indigo, formless, silence
  | "vedic"         // ancient ochre, fire, dawn
  | "bhakti"        // warm amber, devotional warmth
  | "mantra"        // deep violet, vibration
  | "default";      // neutral sacred — dark with warm accent

export interface TempleChamberId {
  id:          string;   // "shiva", "krishna", "devi", "vedas", "bhajans" etc.
  ownerId:     string;
  name:        string;   // "Shiva Mandir"
  nameNepali:  string;   // "शिव मन्दिर"
  nameSanskrit?: string; // "शिवालय"
  tradition:   SpiritualTradition;
  theme:       ChamberTheme;
  description: string;   // short description of this chamber's purpose
  icon:        string;   // emoji or symbol
  isActive:    boolean;  // founder-toggled
  order:       number;   // display order
  createdAt:   string;
}

// ─── Temple Content ───────────────────────────────────────────────────────────
// Texts, shlokas, stotras, scripture excerpts stored in a chamber.

export type ContentType =
  | "shloka"          // a specific verse from scripture
  | "stotra"          // a complete hymn or praise text
  | "mantra"          // a sacred sound formula
  | "upanishad_excerpt" // passage from an Upanishad
  | "gita_verse"      // Bhagavad Gita verse
  | "vedic_hymn"      // Rigveda/Samaveda/Yajurveda/Atharvaveda
  | "bhajan_text"     // devotional song text (text only until audio strategy resolved)
  | "commentary"      // Shankaracharya or other acharya commentary
  | "prayer"          // personal or traditional prayer text
  | "reference";      // a reference/pointer to an external text

export type ContentLanguage = "sanskrit" | "nepali" | "hindi" | "english" | "mixed";

export interface TempleContent {
  id?:           string;
  ownerId:       string;
  chamberId:     string;        // which chamber this belongs to

  // ── Identity ──────────────────────────────────────────────────────────────
  type:          ContentType;
  title?:        string;        // "Mahamrityunjaya Mantra"
  titleDevanagari?: string;     // "महामृत्युञ्जय मन्त्र"

  // ── Text layers ───────────────────────────────────────────────────────────
  textOriginal:  string;        // verbatim original (Sanskrit Devanagari preferred)
  transliteration?: string;     // IAST for Sanskrit
  textNepali?:   string;        // Nepali translation or rendering
  textHindi?:    string;
  textEnglish?:  string;        // meaning/translation

  // ── Meaning layers ────────────────────────────────────────────────────────
  meaningNepali?: string;       // founder's understanding or translation
  meaningEnglish?: string;
  personalNote?:  string;       // private reflection on this content

  // ── Source ────────────────────────────────────────────────────────────────
  sourceText?:   string;        // "Rigveda 7.59.12", "Bhagavad Gita 2.47"
  sourceUrl?:    string;        // must be public domain if linked
  isPublicDomain: boolean;      // must be verified before storing

  // ── Audio (Phase 4) ───────────────────────────────────────────────────────
  audioUrl?:     string;        // ONLY if verified public domain recording
  audioCreditNote?: string;     // attribution for audio

  // ── Metadata ─────────────────────────────────────────────────────────────
  language:      ContentLanguage;
  tradition?:    SpiritualTradition;
  dictionaryRefs?: string[];    // semantic_dictionary term IDs
  addedAt:       string;
  isFavorite:    boolean;
  visibility:    TempleVisibility; // default: "private"
  bhaktiAtomId?: string;          // set when visibility==="published"
}

// ─── Visibility state (three-state publishing pipeline) ──────────────────────
// private   → founder-only forever (default)
// review    → founder is considering this for Bhakti Chautari someday
// published → approved; a bhakti_atom has been created from this
//
// Transitions are always founder-initiated. Nothing auto-advances.
// See docs/ZZC_TWO_WORLDS.md for full pipeline architecture.

export type TempleVisibility = "private" | "review" | "published";

// ─── Temple Note ─────────────────────────────────────────────────────────────
// Personal spiritual reflections. Private by default.
// May advance to "review" or "published" if the founder chooses to share.

export type NoteType =
  | "reflection"    // personal thought or realization
  | "shloka"        // a memorized or favorite verse
  | "mantra"        // personal mantra practice note
  | "prayer"        // personal prayer in any language
  | "dream"         // spiritual dream or vision record
  | "teaching"      // guru teaching or remembered lesson
  | "bhajan_note"   // connection to a specific bhajan or chant
  | "gratitude"     // gratitude practice entry
  | "question"      // open spiritual question / inquiry
  | "insight";      // sudden realization

export interface TempleNote {
  id?:           string;
  ownerId:       string;
  chamberId?:    string;         // optional — some notes are general, not chamber-specific
  contentRef?:   string;        // optional link to a TempleContent item
  dictionaryRefs?: string[];    // terms this note relates to

  // ── Content ──────────────────────────────────────────────────────────────
  type:          NoteType;
  title?:        string;
  body:          string;        // free text — any language
  language?:     ContentLanguage;

  // ── Context ──────────────────────────────────────────────────────────────
  mood?:         "calm" | "turbulent" | "elevated" | "questioning" | "grateful";
  tags:          string[];

  // ── Metadata ─────────────────────────────────────────────────────────────
  createdAt:     string;
  updatedAt:     string;
  visibility:    TempleVisibility; // default: "private" — founder advances deliberately
  bhaktiAtomId?: string;          // set when visibility==="published"; points to bhakti_atoms doc
}

// ─── Mantra Practice ─────────────────────────────────────────────────────────
// A mantra the founder is actively practicing or has dedicated.

export interface MantraPractice {
  id?:           string;
  ownerId:       string;
  contentRef?:   string;        // links to TempleContent of type "mantra"

  mantraText:    string;        // Devanagari
  mantraIAST?:   string;        // transliteration
  deity?:        string;        // "Shiva", "Ganesha", etc.
  tradition?:    SpiritualTradition;
  purpose?:      string;        // personal intention for this practice

  // Practice record (optional — no pressure to track)
  japa?:         number;        // total count (if founder chooses to record)
  startedAt:     string;
  notes?:        string;
}

// ─── Sacred Chamber Metadata ──────────────────────────────────────────────────
// The built-in chambers available in every Temple Vault.

export const SACRED_CHAMBERS: Array<Omit<TempleChamberId, "id" | "ownerId" | "createdAt" | "isActive">> = [
  { name: "Shiva",          nameNepali: "शिव",            nameSanskrit: "शिव",           tradition: "shaiva",          theme: "shiva",   icon: "🕉",  order: 1, description: "Transformation, consciousness, stillness. Mahadeva." },
  { name: "Adi Shankaracharya", nameNepali: "आदि शंकराचार्य", nameSanskrit: "आद्यशंकराचार्य", tradition: "advaita_vedanta", theme: "advaita", icon: "📿", order: 2, description: "Advaita Vedanta. Non-duality. Vivekachudamani. Bhaja Govindam." },
  { name: "Krishna",        nameNepali: "कृष्ण",           nameSanskrit: "कृष्ण",          tradition: "vaishnava",       theme: "krishna", icon: "🪷", order: 3, description: "Bhagavad Gita. Leela. Bhakti. The Eternal Friend." },
  { name: "Devi",           nameNepali: "देवी",            nameSanskrit: "देवी",           tradition: "shakta",          theme: "devi",    icon: "🌸", order: 4, description: "Divine Feminine. Durga, Kali, Saraswati, Lakshmi. Shakti." },
  { name: "Hanuman",        nameNepali: "हनुमान",          nameSanskrit: "हनुमान्",         tradition: "vaishnava",       theme: "hanuman", icon: "🌟", order: 5, description: "Devotion, strength, service. Rama's messenger." },
  { name: "Buddha",         nameNepali: "बुद्ध",           nameSanskrit: "बुद्ध",          tradition: "buddhist",        theme: "buddha",  icon: "☮",  order: 6, description: "Dharma, impermanence, compassion. The Middle Way." },
  { name: "Vedas",          nameNepali: "वेद",             nameSanskrit: "वेद",            tradition: "vedic",           theme: "vedic",   icon: "🔥", order: 7, description: "Rig, Sama, Yajur, Atharva. Primordial revelation." },
  { name: "Upanishads",     nameNepali: "उपनिषद्",         nameSanskrit: "उपनिषद्",         tradition: "upanishadic",     theme: "default", icon: "🌿", order: 8, description: "Brahma-vidya. Tat tvam asi. Aham Brahmasmi." },
  { name: "Bhajans",        nameNepali: "भजन",             nameSanskrit: "भजन",            tradition: "bhakti",          theme: "bhakti",  icon: "🎵", order: 9, description: "Devotional music. Mirabai, Kabir, Tukaram, Surdas." },
  { name: "Sanskrit Stotras", nameNepali: "संस्कृत स्तोत्र", nameSanskrit: "संस्कृत स्तोत्र", tradition: "general",         theme: "mantra",  icon: "✨", order: 10, description: "Sacred hymns and prayers in Sanskrit." },
  { name: "Guru Parampara", nameNepali: "गुरु परम्परा",    nameSanskrit: "गुरुपरम्परा",     tradition: "general",         theme: "default", icon: "🙏", order: 11, description: "Teacher lineage. Received teachings. Guru dakshina." },
  { name: "Rishi Traditions",nameNepali: "ऋषि परम्परा",   nameSanskrit: "ऋषिपरम्परा",     tradition: "vedic",           theme: "default", icon: "📖", order: 12, description: "Forest seers. Vedantic inquiry. Timeless wisdom." },
];

// ─── Temple Vault State ──────────────────────────────────────────────────────
// Computed view for the Temple Vault page.

export interface TempleVaultState {
  chambers:      TempleChamberId[];
  recentNotes:   TempleNote[];     // last 3
  favoritContent: TempleContent[]; // isFavorite === true
  activePractices: MantraPractice[];
  totalContent:  number;
  totalNotes:    number;
}

// ─── Bhakti Atom ─────────────────────────────────────────────────────────────
// The public expression layer for ZZ Bhakti Chautari.
// Architectural role: same as media_atoms in the civic world.
// Created deliberately by the founder from a temple_note/content with visibility==="published".
// The bhakti_atom IS the public content — not a reference to the private note.
// Firestore collection: bhakti_atoms
// Rules: owner write, public read when isPublic===true (Phase 5+)
// See docs/ZZC_TWO_WORLDS.md for full pipeline.

export type BhaktiAtomType =
  | "shloka_breakdown"       // verse with multilingual meaning layers
  | "mantra_explainer"       // mantra with grammar, meaning, tradition
  | "bhajan_text"            // devotional song text + context
  | "meaning_card"           // single Sanskrit term deep meaning
  | "leela_story"            // divine play narrative
  | "devotional_reflection"  // founder spiritual insight made public-safe
  | "teaching_note";         // received teaching with source

export interface BhaktiAtom {
  id?:              string;
  ownerId:          string;
  sourceNoteId?:    string;        // which temple_note inspired this (private — never exposed)
  sourceContentId?: string;        // which temple_content inspired this

  // ── Type and tradition ────────────────────────────────────────────────────
  type:             BhaktiAtomType;
  tradition?:       SpiritualTradition;

  // ── Multilingual text layers ──────────────────────────────────────────────
  textOriginal:     string;        // Devanagari (Sanskrit/Nepali primary)
  transliteration?: string;        // IAST for Sanskrit
  textNepali?:      string;
  textHindi?:       string;
  textEnglish?:     string;

  // ── Meaning ───────────────────────────────────────────────────────────────
  meaningNepali:    string;        // public-safe meaning in Nepali
  meaningEnglish?:  string;

  // ── Source grounding (required before isPublic=true) ─────────────────────
  sourceRef?:       string;        // "Rigveda 7.59.12", "Bhagavad Gita 2.47"
  isSourceGrounded: boolean;       // verified against a published source

  // ── Semantic links ────────────────────────────────────────────────────────
  dictionaryRefs:   string[];      // semantic_dictionary term IDs

  // ── Media generation (Phase 6) ────────────────────────────────────────────
  mediaPrompt?:     string;        // visual/audio generation prompt for devotional reel

  // ── Publishing ────────────────────────────────────────────────────────────
  isPublic:         boolean;       // false until founder explicitly publishes
  addedAt:          string;
  publishedAt?:     string;        // ISO — set when isPublic becomes true
}

// ─── Re-export spiritual semantic type ───────────────────────────────────────
export type { SpiritualSemanticAtom };

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — SPIRITUAL CHARACTER INTELLIGENCE GRAPH
// ═══════════════════════════════════════════════════════════════════════════════
//
// Spiritual parallel to janta_intelligence in the civic world.
// Characters are full intelligence nodes — not just UI containers.
//
// Each SpiritualCharacter stores names, forms, symbols, relationships, leelas,
// emotional tone, visual identity, connected scriptures, bhajans, and festivals.
// Firestore collection: spiritual_characters (owner write, public read Phase 5+)
//
// IMPORTANT: Sacred Chambers are UI surfaces. SpiritualCharacter records are
// the intelligence layer. A chamber "Shiva" loads its SpiritualCharacter node.

export type CharacterType =
  | "deity"           // Shiva, Vishnu, Lakshmi, Devi — primary cosmic beings
  | "avatar"          // Krishna, Rama, Parashurama — divine incarnations
  | "sage_acharya"    // Adi Shankaracharya, Patanjali, Valmiki — realized teachers
  | "devotee_saint"   // Mirabai, Tukaram, Andal, Kabir — bhakta-poets
  | "scripture"       // Bhagavad Gita, Upanishads — scriptures as graph nodes
  | "event_place"     // Kurukshetra, Vrindavan — places/events that anchor stories
  | "festival";       // Navaratri, Diwali — festivals as cultural anchors

// The nine devotional moods (nava-rasas of bhakti tradition)
export type DevotionalRasa =
  | "shanta"     // peaceful equanimity — Upanishadic meditation
  | "dasya"      // servant devotion — Hanuman to Rama
  | "sakhya"     // friendship — Arjuna to Krishna
  | "vatsalya"   // parental love — Yashoda to Krishna
  | "madhurya"   // lover devotion — Radha to Krishna, Mirabai to Krishna
  | "vira"       // heroic devotion — Durga, warrior Shiva
  | "rudra"      // fierce / transformative — Kali, Nataraja's dance
  | "karuna"     // compassion — Buddha, Annapurna
  | "adbhuta";   // wonder/awe — cosmic Vishwaroopa

export interface SpiritualCharacter {
  id?:             string;
  ownerId:         string;

  // ── Identity ───────────────────────────────────────────────────────────────
  characterType:   CharacterType;
  primaryName:     MultilingualText;    // canonical name in all languages
  alternateNames:  MultilingualText[];  // Mahadeva, Nataraja, Mahakala, Pashupati...
  epithets:        string[];            // "Destroyer", "Consciousness", "Auspicious"

  // ── Tradition context ──────────────────────────────────────────────────────
  traditions:      SpiritualTradition[];
  primaryTradition: SpiritualTradition;

  // ── Essence / meaning ──────────────────────────────────────────────────────
  essence:         MultilingualText;    // what this character represents / embodies
  philosophicalNote?: string;           // Vedantic or Puranic significance
  devotionalNote?: string;              // how devotees relate — heart context

  // ── Visual / symbolic identity ─────────────────────────────────────────────
  symbols:         string[];            // ["trident", "third_eye", "crescent_moon", "damaru"]
  colors:          string[];            // ["ash_white", "deep_blue", "saffron"]
  iconographicDesc?: string;            // canonical visual description for media grounding
  vehicleMount?:   string;             // vahana: "bull (Nandi)", "garuda", "mouse"

  // ── Devotional tone ────────────────────────────────────────────────────────
  primaryRasa:     DevotionalRasa;
  moods:           string[];           // ["shiva_as_nataraja", "shiva_as_ardhanarishvara"]

  // ── Teachings ─────────────────────────────────────────────────────────────
  coreTeachings:   MultilingualText[]; // key philosophical or devotional teachings
  keyShlokas?:     string[];           // important verses (text in Devanagari)

  // ── Story / Leela summaries ────────────────────────────────────────────────
  leelaHighlights: MultilingualText[]; // key divine plays / episodes

  // ── Graph connections (IDs to other SpiritualCharacter records) ───────────
  spouseIds?:       string[];          // Shiva ↔ Parvati
  childIds?:        string[];          // Shiva → Ganesha, Kartikeya
  guruIds?:         string[];          // teacher relationships
  shishyaIds?:      string[];          // student relationships
  manifestationOfId?: string;          // Durga is manifestation of Devi

  // ── Connected content (semantic_dictionary atom IDs) ──────────────────────
  semanticAtomIds:  string[];          // dharma, karma, shakti, maya...

  // ── Connected scriptures, bhajans, festivals ──────────────────────────────
  scriptureRefs:    string[];          // "Shiva Purana", "Rigveda 2.33", "Shaiva Agamas"
  bhajanRefs?:      string[];          // bhajan titles or temple_content IDs
  festivals?:       string[];          // "Mahashivaratri", "Navaratri"
  mantras?:         string[];          // "Om Namah Shivaya", "Om Namo Bhagavate Vasudevaya"

  // ── Media grounding (for Phase 6 bhakti media generation) ─────────────────
  // AI media MUST reference this description — never generate without context
  canonicalMediaContext?: string;      // visual/emotional context for grounded generation

  // ── Source grounding ──────────────────────────────────────────────────────
  primarySources:   string[];          // which scriptures this is drawn from
  verified:         boolean;           // founder-reviewed
  createdAt:        string;
  updatedAt:        string;
  visibility:       TempleVisibility;  // private until founder publishes to Bhakti Chautari
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — STORY / LEELA GRAPH (spiritual_relationships)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Spiritual parallel to janta_relationships in the civic world.
// Graph edges connecting characters, concepts, scriptures, and events.
//
// Example graph path:
//   Krishna → Arjuna (sakhya) → Kurukshetra (set_in) → Bhagavad Gita (reveals)
//   → Dharma conflict (embodies dharma) → Karma Yoga (teaches) → Vishwaroopa (reveals)
//
// Firestore collection: spiritual_relationships (owner write, public read Phase 5+)

export type LeelaRelationType =
  | "participated_in"  // character was present in this event/leela
  | "teaches"          // character taught this concept/person
  | "loves"            // devotional love relationship
  | "embodies"         // character embodies this semantic atom
  | "created"          // created or composed this
  | "destroyed"        // destroyed or transformed
  | "opposes"          // meaningful conflict or opposition
  | "blesses"          // bestowed grace or boon
  | "incarnation_of"   // avatar relationship (Krishna is avatar of Vishnu)
  | "set_in"           // story or event set in this place
  | "reveals"          // character reveals this truth or teaching
  | "companion_of"     // close companion or sakha
  | "composed";        // authored this scripture, bhajan, or stotra

export type LeelaNodeType = "character" | "atom" | "scripture" | "event" | "place" | "festival";

export interface SpiritualRelationship {
  id?:           string;
  ownerId:       string;

  fromId:        string;           // SpiritualCharacter ID or semantic_dictionary ID
  fromType:      LeelaNodeType;
  fromName?:     string;           // denormalized label for display

  toId:          string;           // target node ID
  toType:        LeelaNodeType;
  toName?:       string;           // denormalized label for display

  relationType:  LeelaRelationType;
  contextNote?:  MultilingualText; // narrative context — why/how this relation exists
  scriptureRef?: string;           // which scripture describes this relationship
  leelaEpisode?: string;           // specific episode name if applicable

  verified:      boolean;
  createdAt:     string;
}
