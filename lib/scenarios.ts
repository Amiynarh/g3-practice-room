export type ScenarioDifficulty = "beginner" | "intermediate" | "advanced";
export type ScenarioCategory = "career" | "freelance" | "workplace" | "entrepreneurship";

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: ScenarioDifficulty;
  category: ScenarioCategory;
  durationMin: number;
  durationMax: number;
  roleTitle: string;
  persona: string;
  openingLine: Record<string, string>;
  evaluationFocus: string[];
  tips: string[];
  proOnly: boolean;
}

export const SCENARIOS: Record<string, Scenario> = {
  tech_interview: {
    id: "tech_interview",
    title: "Tech Job Interview",
    description: "Practice for a technical or behavioral interview at a Nigerian or international tech company.",
    icon: "Briefcase",
    difficulty: "intermediate",
    category: "career",
    durationMin: 15,
    durationMax: 20,
    roleTitle: "Interviewer",
    // Name and company come from the session brief — do not hardcode here
    persona: "a professional HR manager and technical interviewer at a Lagos-based tech company. You are conducting a structured interview. You ask probing but fair questions. You are looking for clarity, confidence, and concrete examples. You push back on vague answers and ask follow-up questions.",
    openingLine: {
      en: "Good morning! Thank you for coming in. I'm from the hiring team. Please have a seat. Can you start by introducing yourself and telling me why you're interested in this position?",
      ha: "Ina kwana! Na gode da zuwan ku. Ni ne daga ƙungiyar hiring. Don Allah ku zauna. Shin za ku iya fara gabatar da kanku kuma ku gaya mana dalilin da ya sa kuke sha'awar wannan matsayi?",
      yo: "Ẹ káàárọ̀! E ṣéun fún ìwọlé. Èmi ni láti ẹgbẹ́ ìgbàṣẹ́. Jọ̀wọ́ jókòó. Ṣé o lè bẹ̀rẹ̀ pẹ̀lú ìfihàn ara rẹ àti ìdí tí o fi nífẹ̀ẹ́ ipò yìí?",
      ig: "Ụtụtụ ọma! Daalụ maka ịbịa. A bụ m si na ndị ọrụ ịhụ ndị ọrụ. Biko nọdụ ala. Ị nwere ike ịmalite site na ịkọ onwe gị na ihe mere ị ji nwee mmasị na ọrụ a?",
    },
    evaluationFocus: ["communication", "confidence", "technical knowledge", "problem-solving", "cultural fit"],
    tips: [
      "Use the STAR method for behavioral questions (Situation, Task, Action, Result)",
      "Research the company and role before the interview",
      "Prepare specific examples from your past experience",
      "Ask thoughtful questions at the end",
    ],
    proOnly: false,
  },

  salary_negotiation: {
    id: "salary_negotiation",
    title: "Salary Negotiation",
    description: "Practice negotiating your salary or asking for a raise with confidence and professionalism.",
    icon: "TrendingUp",
    difficulty: "advanced",
    category: "workplace",
    durationMin: 10,
    durationMax: 15,
    roleTitle: "Your Manager",
    // No hardcoded name — session brief provides it
    persona: "a direct line manager at a Nigerian tech company who is generally supportive but careful about budgets and headcount. You are discussing annual performance reviews and compensation. You listen carefully but push back when the justification is weak. You respond better to data and business impact than to personal need.",
    openingLine: {
      en: "Hi, come on in and take a seat. You mentioned you wanted to talk about your compensation package. I have about 20 minutes — what's on your mind?",
      ha: "Sannu, ku shigo ku zauna. Kun ce kuna son magana game da kuɗin albashin ku. Ina da kusan mintoci 20 — me kuke tunani?",
      yo: "Ẹ káàbọ̀, wọlé kí o jókòó. O sọ pé o fẹ́ sọrọ nípa ìsanwó rẹ. Mo ní ìṣẹ́jú 20 nǹkan — kíni o fẹ́ sọ?",
      ig: "Ndewo, bịa nọdụ ala. I kwuru na ị chọrọ ikwu maka ụgwọ gị. Enwere m ihe dị ka nkeji 20 — gịnị nọ n'uche gị?",
    },
    evaluationFocus: ["assertiveness", "preparation", "negotiation tactics", "professionalism", "data-driven arguments"],
    tips: [
      "Research market rates for your role and experience level in Nigeria",
      "Lead with your achievements and value, not personal needs",
      "Have a specific number in mind, not a range",
      "Be prepared to counter and stay calm",
    ],
    proOnly: false,
  },

  client_pitch: {
    id: "client_pitch",
    title: "Client Pitch",
    description: "Present your freelance services or a business idea to a potential client or investor.",
    icon: "Target",
    difficulty: "intermediate",
    category: "freelance",
    durationMin: 15,
    durationMax: 20,
    roleTitle: "Potential Client",
    // Name comes from the session brief — removed hardcoded "Mrs Okafor"
    persona: "a skeptical but open-minded Nigerian business owner considering hiring a freelance tech professional for the first time. You are not very tech-savvy, somewhat traditional in business approach, and need genuine convincing. You ask pointed questions about cost, trust, and proof of results. You warm up when the pitch is clear and relatable.",
    openingLine: {
      en: "Good afternoon. My business associate referred you to me. I've been told you do something in technology — websites and such? I honestly don't know much about these things, but my competitors seem to be pulling ahead. Convince me why I should work with you.",
      ha: "Barka da rana. Abokin kasuwancina ya tsokane ni zuwa gare ku. An gaya mani kuna yin wani abu a fasahar zamani — gidajen yanar gizo da makamantansu? Honestly ban san da yawa game da waɗannan abubuwa ba, amma abokan hamayyar na suna gaba. Ku shawo kan ni dalilin da ya sa ya kamata in yi aiki da ku.",
      yo: "Ẹ káàárọ̀. Òré iṣòwò mi tọ́ka mọ́ yín. Wọ́n sọ fún mi pé ẹ ń ṣe ohun kan nínú ẹ̀rọ — àwọn ògiri ayélujára àti bẹ́ẹ̀ bẹ́ẹ̀ lọ? Honestly, mi ò mọ̀ ohun púpọ̀ nípa àwọn nǹkan wọ̀nyí, ṣùgbọ́n àwọn olódi mi ń jáde wájú. Fi ìdí múlẹ̀ fún mi pé kí ni ìdí tó fi yẹ kí n ṣiṣẹ́ pẹ̀lú yín.",
      ig: "Ehihie ọma. Onye mmekọ azụmaahịa m nyere m aha gị. A gwara m na ị na-arụ ọrụ na teknoloji — weebụsaịtị na ihe ndị ya? Eziokwu, amaghị m ihe ọtụtụ maka ihe ndị a, mana ndị asọmpi m na-aga n'ihu. Na-akọnye m ihe mere ị kwesịrị ịrụ ọrụ ya.",
    },
    evaluationFocus: ["pitching skills", "handling objections", "value proposition", "building trust", "simplifying tech concepts"],
    tips: [
      "Explain technical concepts in simple, relatable terms",
      "Use real examples and case studies from similar businesses",
      "Address the 'why should I trust you?' question proactively",
      "Have a clear next step to propose at the end",
    ],
    proOnly: false,
  },

  promotion_request: {
    id: "promotion_request",
    title: "Asking for a Promotion",
    description: "Make your case for a promotion or a more senior role at your current company.",
    icon: "Award",
    difficulty: "advanced",
    category: "workplace",
    durationMin: 10,
    durationMax: 15,
    roleTitle: "Your Manager",
    // No hardcoded name — session brief provides it
    persona: "a busy but fair senior manager at a Nigerian tech company who genuinely likes the user but has limited headcount budget and needs strong, data-backed justification for any promotion. You will push back respectfully. You respond well to specific achievements and business impact. You are not dismissive — you give honest, constructive responses.",
    openingLine: {
      en: "Hey, thanks for setting this up. I've got back-to-back meetings today so let's make the most of our time. You mentioned you wanted to discuss your career progression — go ahead, I'm listening.",
      ha: "Sannu, na gode da saita wannan. Ina da tarurruka masu jeri yau don haka bari mu yi amfani da lokacin mu da kyau. A cikin takardar ku kun ambaci cewa kuna son tattauna ci gaban sana'ar ku — ci gaba, ina sauraron ku.",
      yo: "Ẹ jọ̀wọ́, dúpẹ́ fún gbíga ipade yi. Mo ní àwọn ìpàdé tí wọ́n yọra wọn pọ̀ lónìí nítorí náà ẹ jẹ́ kí a lo àkókò wa dára. O mẹ́nu kan nínú àkọsílẹ̀ rẹ pé o fẹ́ jíròrò nípa ìtẹsíwájú iṣẹ́ rẹ — tẹ̀síwájú, mo ń gbọ́.",
      ig: "Nne, daalụ maka ịtọ nke a. Enwere m ọtụtụ nnọkọ taa ya mere ka anyị jiri oge anyị nke ọma. I kwuru na nọtụ gị na ị chọrọ ikwu maka ọganihu ọrụ gị — gaa n'ihu, m na-ege ntị.",
    },
    evaluationFocus: ["self-advocacy", "quantifying achievements", "strategic thinking", "confidence", "handling pushback"],
    tips: [
      "Come with specific, quantifiable achievements",
      "Show how your work has impacted the team or business",
      "Have a clear idea of what the next role looks like",
      "Be ready for 'not yet' and ask what it would take",
    ],
    proOnly: true,
  },

  networking: {
    id: "networking",
    title: "Tech Networking Event",
    description: "Practice introducing yourself and owning your expertise in a professional networking setting.",
    icon: "Users",
    difficulty: "beginner",
    category: "career",
    durationMin: 10,
    durationMax: 15,
    roleTitle: "Fellow Professional",
    // Removed hardcoded name and "subtly test" instruction — brief provides the persona.
    // Core fix: reciprocal peer conversation, not interrogation.
    persona: "a fellow Nigerian tech professional at a conference or networking event who just met the user. You are warm, curious, and genuinely supportive. You share your own experiences, career journey, and challenges openly when relevant — this is a two-way conversation, not an interrogation. You celebrate the user's achievements and offer practical advice or insights from your own experience when it could help them. You ask follow-up questions out of genuine curiosity, not to test or challenge. If the user mentions a goal or challenge, you engage with it meaningfully — offer a perspective, share what worked for you, or suggest someone they should meet. The tone should feel like two professionals who hit it off at an event, not a job interview.",
    openingLine: {
      en: "Hey! I don't think we've met — I just joined this session. It's a bit of a whirlwind today, honestly! What do you do?",
      ha: "Haba! Ban yi tunanin mun taɗi ba — yanzu na shiga wannan zaman. Yana da ɗan damuwa yau, honestly! Me kuke yi?",
      yo: "Ẹ jọ̀wọ́! Mi ò rò pé a ti pàdé — ìṣẹ́jú díẹ̀ ni mo wọlé sínú ìpàdé yìí. Ó ń yára gan-an lónìí, honestly! Kíni iṣẹ́ rẹ?",
      ig: "Nna! Echeghị m na anyị tụkọọla — ọ bụ ugbu a m bata na nzukọ a. Ọ na-aga ngwa ngwa taa, honestly! Gịnị ka ị na-arụ?",
    },
    evaluationFocus: [
      "self-presentation and clarity",
      "owning achievements without downplaying",
      "asking good questions and showing curiosity",
      "making a memorable impression",
      "articulating career goals and transitions",
    ],
    tips: [
      "Prepare a clear 30-second intro — who you are, what you do, and what you're working on",
      "Share specific projects or achievements, not just job titles",
      "Good networking goes both ways — ask about their work too",
      "If you have a career goal (e.g. switching roles), mention it — people can only help if they know",
      "Don't downplay your expertise with 'just' or 'only'",
    ],
    proOnly: false,
  },

  difficult_conversation: {
    id: "difficult_conversation",
    title: "Handling a Difficult Conversation",
    description: "Practice addressing a workplace conflict, miscommunication, or unfair situation professionally.",
    icon: "MessageCircle",
    difficulty: "advanced",
    category: "workplace",
    durationMin: 15,
    durationMax: 20,
    roleTitle: "Your Colleague",
    // Removed hardcoded name "Deji" — session brief provides it
    persona: "a senior male colleague who has been subtly taking credit for the user's ideas in team meetings. You are not malicious — you are oblivious and used to dominating conversations. When confronted, you are initially defensive but not aggressive. You can be reasoned with if the user is specific and calm. You respond poorly to vagueness or emotional escalation but respond well to clear, specific examples.",
    openingLine: {
      en: "Oh, hi! I was just heading to lunch. What's up? Everything okay?",
      ha: "Oh, sannu! Ina tafiya cin abinci. Me kuke so? Komai lafiya?",
      yo: "Oh, ẹ káàbọ̀! Mo ń lọ jẹun báyìí. Kíni ọ̀rọ̀? Gbogbo nǹkan ń lọ dáadáa ni?",
      ig: "Oh, ndewo! Abịara m iri nri. Gịnị dị? Ihe ọ bụla dị mma?",
    },
    evaluationFocus: ["assertiveness", "emotional intelligence", "conflict resolution", "professionalism", "clarity"],
    tips: [
      "Use 'I' statements to describe impact without attacking",
      "Be specific about the behavior, not the person's character",
      "Stay calm and focus on resolution, not blame",
      "Have a clear outcome in mind before the conversation",
    ],
    proOnly: true,
  },
};

export const FREE_SESSIONS_PER_MONTH = 3;
export const MAX_TURNS_PER_SESSION = 20;
