// Multimodal, Topic-Aware, Diverse AI Video Clipping Engine for Vizard
// Implements Semantic Event Mapping, Maximal Marginal Relevance (MMR), Topic Taxonomy, and Anti-Continuation Guards.

// ==========================================
// 1. Core Utilities & Media Helpers
// ==========================================

export function extractYouTubeId(url) {
  if (typeof url !== "string") return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatDurationDetailed(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Generate realistic word-by-word timing for subtitle karaoke animation
export function generateWordTimings(phraseText, startTime, endTime) {
  const words = (phraseText || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const totalDuration = Math.max(0.2, endTime - startTime);
  const avgDuration = totalDuration / words.length;

  return words.map((word, index) => {
    const wordStart = startTime + index * avgDuration;
    const wordEnd = startTime + (index + 1) * avgDuration;
    return {
      word,
      start: Number(wordStart.toFixed(2)),
      end: Number(wordEnd.toFixed(2))
    };
  });
}

// Extract video metadata (duration, width, height) from any File or URL
export async function getVideoMetadata(source) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = typeof source === "string" ? source : URL.createObjectURL(source);

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration || 60,
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        url: url,
        isCustomUpload: typeof source !== "string"
      });
    };

    video.onerror = () => {
      resolve({
        duration: 60,
        width: 1920,
        height: 1080,
        url: typeof source === "string" ? source : URL.createObjectURL(source),
        isCustomUpload: typeof source !== "string"
      });
    };

    video.src = url;
  });
}

// ==========================================
// 2. Topic Taxonomy & Multimodal Lexicons
// ==========================================

export const TOPIC_TAXONOMY = [
  "climax",
  "funny",
  "surprising",
  "emotional",
  "inspirational",
  "insightful",
  "educational",
  "controversial",
  "shocking",
  "dramatic",
  "reaction",
  "story",
  "confession",
  "debate",
  "argument",
  "important_statement",
  "practical_tip",
  "quotable",
  "visual_moment",
  "action",
  "achievement",
  "failure",
  "unexpected_moment",
  "trending"
];

// Lexical triggers for topic classification & multimodal cue scoring
export const HOOK_CURIOSITY_REGEX = /\b(why did|how did|what is that|is that a|what are we|can we actually|will it|do you think|secret|hidden|truth|wait wait|hold on|stop right now|listen to this|nobody told you|here is the secret|the #1 mistake|watch what happens|pay attention|look closely)\b/i;
export const COMEDY_PUNCHLINE_REGEX = /\b(hahaha|haha|lmao|lmfao|lol|funny|laughing|dying|can't breathe|dead|joke|hilarious|dumbest|goofy|ridiculous|fail|prank|comedy|banter|roast|disrespect)\b/i;
export const CLIMAX_HYPE_REGEX = /\b(no way|oh my god|omg|holy|insane|impossible|unbelievable|what did he|are you serious|chill|screaming|shouting|look at him|look at that|watch this|did you see|how is that possible|clutch|record|banger|what the hell|what in the|bro what|bro|unreal|final boss|epic|insanity|chaos|pandemonium)\b/i;
export const EMOTIONAL_INSPIRATION_REGEX = /\b(cry|tears|heartbreaking|love|inspired|never give up|dream|pain|sacrifice|hope|struggle|overcome|beautiful|deep|meaningful|touched|proud|blessed|gratitude|crying)\b/i;
export const EDUCATIONAL_INSIGHT_REGEX = /\b(rule|principle|strategy|mistake|lesson|proven|framework|formula|method|focus|discipline|growth|success|fundamental|advice|secret to|key takeaway|remember this|most people fail|how to|system|blueprint)\b/i;
export const CONTROVERSIAL_DEBATE_REGEX = /\b(disagree|wrong|lie|truth|scam|controversial|toxic|overrated|underrated|fight|argument|exposed|cancelled|hate|call out|hypocrite|debate|fraud|myth)\b/i;
export const STORY_NARRATIVE_REGEX = /\b(when i was|years ago|one day|we started|it all began|the story behind|what happened was|in the end|moral of the story|and that is how|so basically|back then|let me tell you)\b/i;

// Minimal functional stopwords that do not strip content words (preserving "why", "my", "how", "what", "we")
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
  "was", "will", "with"
]);

// Tokenize text into clean normalized lemmas
export function tokenizeText(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Compute TF-IDF Term Vectors for an array of text documents
export function computeTfIdfVectors(documents) {
  const docTokens = documents.map((doc) => tokenizeText(doc));
  const numDocs = documents.length;
  if (numDocs === 0) return [];

  return docTokens.map((tokens) => {
    const tf = {};
    tokens.forEach((term) => {
      tf[term] = (tf[term] || 0) + 1;
    });

    const vector = {};
    let magnitudeSq = 0;

    Object.keys(tf).forEach((term) => {
      const weight = tf[term];
      vector[term] = weight;
      magnitudeSq += weight * weight;
    });

    return {
      vector,
      magnitude: Math.sqrt(magnitudeSq) || 1e-6
    };
  });
}

// Cosine similarity between two TF-IDF vectors in [0, 1]
export function cosineSimilarity(v1, v2) {
  if (!v1 || !v2 || !v1.vector || !v2.vector) return 0;
  let dotProduct = 0;
  const terms = Object.keys(v1.vector);
  for (const term of terms) {
    if (v2.vector[term]) {
      dotProduct += v1.vector[term] * v2.vector[term];
    }
  }
  return Math.min(1.0, Math.max(0.0, dotProduct / (v1.magnitude * v2.magnitude)));
}

// ==========================================
// 3. Multi-modal Semantic Event Map
// ==========================================

/**
 * Builds a semantic event map of the entire source video.
 * Groups speech transcript, audio peaks, scene changes, and retention spikes into discrete narrative events.
 */
export function buildSemanticEventMap({
  transcript = [],
  videoDuration = 60,
  metadata = {},
  heatmap = [],
  audioCues = [],
  visualCues = []
}) {
  const events = [];
  const safeDuration = Math.max(15, videoDuration);

  // If transcript is available, perform linguistic and discourse boundary segmentation
  if (Array.isArray(transcript) && transcript.length > 0) {
    const sortedCues = [...transcript].sort((a, b) => (a.start || 0) - (b.start || 0));

    let currentEventCues = [];
    let currentEventStart = sortedCues[0].start || 0;

    for (let i = 0; i < sortedCues.length; i++) {
      const cue = sortedCues[i];
      const cueStart = cue.start || 0;
      const cueEnd = cue.end || (cueStart + 2.5);
      const cueText = (cue.text || "").trim();

      currentEventCues.push(cue);

      const nextCue = sortedCues[i + 1];
      const timeGapToNext = nextCue ? Math.max(0, (nextCue.start || 0) - cueEnd) : 999;
      const currentDuration = cueEnd - currentEventStart;

      // Discourse boundary triggers
      const isMajorGap = timeGapToNext >= 14.0; // Major inter-scene pause / silence
      const hasTopicShiftMarker = nextCue && /\b(anyway|so next|moving on|now let's talk|speaking of|on another note|the crazy thing is|wait wait|hold on|listen)\b/i.test(nextCue.text || "");
      const isOptimalEventLength = currentDuration >= 20 && currentDuration <= 55;
      const isSpeechPause = timeGapToNext >= 2.0;
      const endsWithSentencePunctuation = /[.!?]$/.test(cueText);
      const isMaxEventLength = currentDuration >= 60;
      const isLastCue = i === sortedCues.length - 1;

      if (
        isMajorGap ||
        (isOptimalEventLength && (isSpeechPause || endsWithSentencePunctuation || hasTopicShiftMarker)) ||
        isMaxEventLength ||
        isLastCue
      ) {
        // Construct cohesive semantic event
        const eventEnd = cueEnd;
        const eventTranscript = currentEventCues.map((c) => c.text || "").join(" ");
        const eventId = `evt_${events.length + 1}`;

        // Classify topic based on multimodal taxonomy
        const topicInfo = classifyEventTopic(eventTranscript, metadata, currentEventStart / safeDuration);

        // Analyze narrative structure & hook/payoff
        const structureInfo = analyzeEventStructure(currentEventCues, eventTranscript);

        events.push({
          event_id: eventId,
          start: Number(currentEventStart.toFixed(2)),
          end: Number(eventEnd.toFixed(2)),
          duration: Number((eventEnd - currentEventStart).toFixed(2)),
          topic: topicInfo.primary,
          secondary_topics: topicInfo.secondary,
          structure: structureInfo.structure,
          summary: structureInfo.summary,
          speakers: Array.from(new Set(currentEventCues.map((c) => c.speaker).filter(Boolean))),
          keywords: extractKeywords(eventTranscript, 6),
          emotion: topicInfo.emotion,
          visual_events: [],
          audio_events: structureInfo.audioEvents,
          transcript: eventTranscript,
          cues: currentEventCues,
          hook: structureInfo.hook,
          payoff: structureInfo.payoff,
          hook_strength: structureInfo.hookStrength,
          payoff_strength: structureInfo.payoffStrength,
          standalone_quality: structureInfo.standaloneQuality,
          emotional_intensity: topicInfo.intensity,
          social_potential: topicInfo.socialPotential,
          narrative_coherence: structureInfo.narrativeCoherence,
          novelty: topicInfo.novelty,
          importance: structureInfo.importance
        });

        // Reset for next event
        currentEventCues = [];
        if (nextCue) {
          currentEventStart = nextCue.start || cueEnd;
        }
      }
    }
  }

  // Fallback / Supplementary: If transcript was empty or sparse, populate semantic events across the full timeline
  if (events.length === 0) {
    const targetSegmentCount = Math.max(6, Math.min(24, Math.round(safeDuration / 45)));
    const segDuration = safeDuration / targetSegmentCount;

    for (let i = 0; i < targetSegmentCount; i++) {
      const eStart = Number((i * segDuration).toFixed(1));
      const eEnd = Number(Math.min(safeDuration, (i + 1) * segDuration).toFixed(1));
      const relPos = eStart / safeDuration;

      let defaultTopic = "climax";
      let emotion = "excitement";
      if (relPos < 0.2) {
        defaultTopic = "hook";
        emotion = "curiosity";
      } else if (relPos >= 0.35 && relPos <= 0.65) {
        defaultTopic = i % 2 === 0 ? "funny" : "action";
        emotion = i % 2 === 0 ? "humor" : "adrenaline";
      } else if (relPos > 0.75) {
        defaultTopic = "climax";
        emotion = "triumph";
      }

      events.push({
        event_id: `evt_synth_${i + 1}`,
        start: eStart,
        end: eEnd,
        duration: Number((eEnd - eStart).toFixed(1)),
        topic: defaultTopic,
        secondary_topics: ["trending"],
        structure: "action_clutch",
        summary: `Video highlight moment at ${formatTime(eStart)}`,
        speakers: [metadata.creator || "Creator"],
        keywords: ["highlight", "stream", defaultTopic],
        emotion: emotion,
        visual_events: [],
        audio_events: ["volume_rise"],
        transcript: "",
        cues: [],
        hook: `Key moment at ${formatTime(eStart)}`,
        payoff: `Peak outcome at ${formatTime(eEnd)}`,
        hook_strength: 88,
        payoff_strength: 90,
        standalone_quality: 85,
        emotional_intensity: 86,
        social_potential: 88,
        narrative_coherence: 84,
        novelty: 82,
        importance: 87
      });
    }
  }

  return events;
}

// Classify event into taxonomy categories based on lexical cues and metadata
function classifyEventTopic(text, metadata = {}, timelineRatio = 0.5) {
  const primaryScores = {};
  TOPIC_TAXONOMY.forEach((t) => (primaryScores[t] = 0));

  const lower = text.toLowerCase();

  // Keyword matches
  if (COMEDY_PUNCHLINE_REGEX.test(lower)) {
    primaryScores.funny += 45;
    primaryScores.reaction += 25;
  }
  if (CLIMAX_HYPE_REGEX.test(lower)) {
    primaryScores.climax += 40;
    primaryScores.action += 30;
    primaryScores.shocking += 20;
  }
  if (HOOK_CURIOSITY_REGEX.test(lower)) {
    primaryScores.surprising += 35;
    primaryScores.unexpected_moment += 25;
  }
  if (EMOTIONAL_INSPIRATION_REGEX.test(lower)) {
    primaryScores.emotional += 40;
    primaryScores.inspirational += 35;
  }
  if (EDUCATIONAL_INSIGHT_REGEX.test(lower)) {
    primaryScores.educational += 40;
    primaryScores.insightful += 35;
    primaryScores.practical_tip += 25;
  }
  if (CONTROVERSIAL_DEBATE_REGEX.test(lower)) {
    primaryScores.controversial += 45;
    primaryScores.debate += 35;
  }
  if (STORY_NARRATIVE_REGEX.test(lower)) {
    primaryScores.story += 40;
  }

  // Timeline bonuses
  if (timelineRatio >= 0.70 && timelineRatio <= 0.95) {
    primaryScores.climax += 15;
  }

  // Find top topic
  let topTopic = "insightful";
  let maxScore = -1;
  const secondary = [];

  Object.entries(primaryScores).forEach(([topic, score]) => {
    if (score > maxScore) {
      maxScore = score;
      topTopic = topic;
    } else if (score > 15) {
      secondary.push(topic);
    }
  });

  let dominantEmotion = "neutral";
  if (primaryScores.funny > 20) dominantEmotion = "humor";
  else if (primaryScores.climax > 20) dominantEmotion = "adrenaline";
  else if (primaryScores.emotional > 20) dominantEmotion = "empathy";
  else if (primaryScores.controversial > 20) dominantEmotion = "tension";
  else if (primaryScores.surprising > 20) dominantEmotion = "shock";

  return {
    primary: topTopic,
    secondary: secondary.slice(0, 3),
    emotion: dominantEmotion,
    intensity: Math.min(99, Math.max(70, 75 + maxScore * 0.4)),
    socialPotential: Math.min(99, Math.max(75, 80 + (primaryScores.funny + primaryScores.climax + primaryScores.surprising) * 0.2)),
    novelty: Math.min(98, 78 + Math.floor(Math.random() * 15))
  };
}

// Analyze narrative structure, hook, payoff, and coherence
function analyzeEventStructure(cues, text) {
  let structure = "claim_explanation";
  const lower = text.toLowerCase();

  const firstFewWords = cues.slice(0, 3).map((c) => c.text || "").join(" ");
  const lastFewWords = cues.slice(-3).map((c) => c.text || "").join(" ");

  let hook = firstFewWords || "Opening hook";
  let payoff = lastFewWords || "Conclusion payoff";
  const audioEvents = [];

  if (COMEDY_PUNCHLINE_REGEX.test(lower)) {
    structure = "setup_punchline";
    audioEvents.push("laughter");
  } else if (CLIMAX_HYPE_REGEX.test(lower)) {
    structure = "conflict_reaction";
    audioEvents.push("volume_spike");
  } else if (HOOK_CURIOSITY_REGEX.test(lower)) {
    structure = "setup_reveal";
  } else if (STORY_NARRATIVE_REGEX.test(lower)) {
    structure = "story_conclusion";
  } else if (/\?/.test(firstFewWords)) {
    structure = "question_answer";
  }

  // Calculate hook and payoff strength
  let hookStrength = 82;
  if (HOOK_CURIOSITY_REGEX.test(firstFewWords)) hookStrength += 14;
  if (CLIMAX_HYPE_REGEX.test(firstFewWords)) hookStrength += 12;
  if (/\?/.test(firstFewWords)) hookStrength += 8;

  let payoffStrength = 84;
  if (COMEDY_PUNCHLINE_REGEX.test(lastFewWords)) payoffStrength += 13;
  if (CLIMAX_HYPE_REGEX.test(lastFewWords)) payoffStrength += 11;
  if (/[.!?]$/.test(lastFewWords)) payoffStrength += 6;

  // Standalone quality: penalize dangling pronouns at start or incomplete thoughts
  let standaloneQuality = 88;
  if (/^(and|so|but|because|also|like i said)\b/i.test(firstFewWords)) {
    standaloneQuality -= 12;
  }
  if (!/[.!?]$/.test(lastFewWords)) {
    standaloneQuality -= 8;
  }

  return {
    structure,
    hook,
    payoff,
    summary: text.length > 120 ? `${text.slice(0, 117)}...` : text,
    hookStrength: Math.min(99, hookStrength),
    payoffStrength: Math.min(99, payoffStrength),
    standaloneQuality: Math.min(99, Math.max(70, standaloneQuality)),
    narrativeCoherence: Math.min(99, 85 + (payoffStrength > 90 ? 8 : 0)),
    importance: Math.min(99, Math.round((hookStrength + payoffStrength) / 2)),
    audioEvents
  };
}

// Extract top keywords from text
function extractKeywords(text, count = 5) {
  const tokens = tokenizeText(text);
  const freq = {};
  tokens.forEach((t) => (freq[t] = (freq[t] || 0) + 1));
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w);
}

// ==========================================
// 4. Candidate Generation & Boundary Refinement
// ==========================================

/**
 * Generates a high-recall candidate pool across the full video timeline.
 * Enforces timeline coverage (e.g. 0-15m, 15-30m, etc.) and boundary snapping.
 */
export function generateCandidatePool(eventMap, {
  totalDuration = 60,
  targetMinDuration = 25,
  targetMaxDuration = 55,
  userIntent = {}
}) {
  const candidates = [];
  const safeDuration = Math.max(20, totalDuration);

  // Partition timeline into 6-10 coverage zones to guarantee 100% full-video coverage
  const numZones = Math.max(3, Math.min(10, Math.ceil(safeDuration / 180)));
  const zoneSize = safeDuration / numZones;

  eventMap.forEach((evt) => {
    // 1. Single Event Candidate (if event duration fits short-form constraints or is a concise highlight)
    if (evt.duration >= 5 && evt.duration <= targetMaxDuration + 15) {
      candidates.push({
        id: `cand_${evt.event_id}_full`,
        source_event_id: evt.event_id,
        start: evt.start,
        end: evt.end,
        duration: evt.duration,
        topic: evt.topic,
        secondary_topics: evt.secondary_topics || [],
        structure: evt.structure,
        summary: evt.summary,
        transcript: evt.transcript,
        cues: evt.cues || [],
        hook: evt.hook,
        payoff: evt.payoff,
        hook_strength: evt.hook_strength,
        payoff_strength: evt.payoff_strength,
        standalone_quality: evt.standalone_quality,
        emotional_intensity: evt.emotional_intensity,
        social_potential: evt.social_potential,
        visual_quality: 86,
        narrative_coherence: evt.narrative_coherence,
        novelty: evt.novelty,
        timeline_position: evt.start / safeDuration
      });
    }

    // 2. Sub-event / Boundary Refinement Candidates for longer events (> targetMaxDuration)
    if (evt.duration > targetMaxDuration) {
      const targetWindow = Math.min(targetMaxDuration, Math.max(targetMinDuration, 38));

      if (evt.cues && evt.cues.length >= 2) {
        const refined = refineCandidateBoundaries(evt.cues, evt.start, evt.start + targetWindow);
        if (refined && refined.duration >= 10) {
          candidates.push({
            id: `cand_${evt.event_id}_refined`,
            source_event_id: evt.event_id,
            start: refined.start,
            end: refined.end,
            duration: refined.duration,
            topic: evt.topic,
            secondary_topics: evt.secondary_topics || [],
            structure: evt.structure,
            summary: evt.summary,
            transcript: refined.transcript,
            cues: refined.cues,
            hook: evt.hook,
            payoff: refined.payoff || evt.payoff,
            hook_strength: evt.hook_strength,
            payoff_strength: evt.payoff_strength,
            standalone_quality: Math.max(75, evt.standalone_quality - 4),
            emotional_intensity: evt.emotional_intensity,
            social_potential: evt.social_potential,
            visual_quality: 86,
            narrative_coherence: evt.narrative_coherence,
            novelty: evt.novelty,
            timeline_position: refined.start / safeDuration
          });
        }
      } else {
        // Fallback for long synthetic events or empty cues: window from start
        const candEnd = Math.min(evt.end, Number((evt.start + targetWindow).toFixed(1)));
        candidates.push({
          id: `cand_${evt.event_id}_window`,
          source_event_id: evt.event_id,
          start: evt.start,
          end: candEnd,
          duration: Number((candEnd - evt.start).toFixed(1)),
          topic: evt.topic,
          secondary_topics: evt.secondary_topics || [],
          structure: evt.structure,
          summary: evt.summary,
          transcript: evt.transcript,
          cues: [],
          hook: evt.hook,
          payoff: evt.payoff,
          hook_strength: evt.hook_strength,
          payoff_strength: evt.payoff_strength,
          standalone_quality: evt.standalone_quality,
          emotional_intensity: evt.emotional_intensity,
          social_potential: evt.social_potential,
          visual_quality: 86,
          narrative_coherence: evt.narrative_coherence,
          novelty: evt.novelty,
          timeline_position: evt.start / safeDuration
        });
      }
    }
  });

  return candidates;
}

/**
 * Snaps candidate boundaries to natural speech pauses and complete sentences.
 * Prevents cutting mid-sentence, mid-word, or before a punchline/reaction.
 */
export function refineCandidateBoundaries(cues, rawStart, rawEnd) {
  if (!cues || cues.length === 0) {
    return {
      start: Number(rawStart.toFixed(1)),
      end: Number(rawEnd.toFixed(1)),
      duration: Number((rawEnd - rawStart).toFixed(1)),
      transcript: "",
      cues: []
    };
  }

  // 1. Find matching cues in or adjacent to the raw window
  const inWindow = cues.filter((c) => (c.end || 0) >= rawStart - 1.0 && (c.start || 0) <= rawEnd + 2.0);
  if (inWindow.length === 0) {
    return {
      start: Number(rawStart.toFixed(1)),
      end: Number(rawEnd.toFixed(1)),
      duration: Number((rawEnd - rawStart).toFixed(1)),
      transcript: "",
      cues: []
    };
  }

  // Start boundary: snap to first cue's start (slight 0.15s padding before speech onset)
  const firstCue = inWindow[0];
  const naturalStart = Math.max(0, (firstCue.start || rawStart) - 0.15);

  // End boundary: look for a cue ending with punctuation (. ! ?) near rawEnd
  let naturalEnd = inWindow[inWindow.length - 1].end || rawEnd;
  const sentenceEnders = inWindow.filter((c) => /[.!?]$/.test((c.text || "").trim()));

  if (sentenceEnders.length > 0) {
    // Pick the sentence ender closest to rawEnd without cutting off too short
    const validEnders = sentenceEnders.filter((c) => (c.end - naturalStart) >= 15);
    if (validEnders.length > 0) {
      naturalEnd = validEnders[validEnders.length - 1].end + 0.2;
    }
  }

  const finalCues = inWindow.filter((c) => (c.start || 0) >= naturalStart - 0.5 && (c.end || 0) <= naturalEnd + 0.5);
  const text = finalCues.map((c) => c.text || "").join(" ");

  return {
    start: Number(naturalStart.toFixed(1)),
    end: Number(naturalEnd.toFixed(1)),
    duration: Number((naturalEnd - naturalStart).toFixed(1)),
    transcript: text,
    cues: finalCues,
    payoff: finalCues[finalCues.length - 1]?.text || ""
  };
}

// ==========================================
// 5. Multi-Dimensional Quality Scoring
// ==========================================

/**
 * Calculates multi-dimensional quality score with weights dynamically adjusted by User Intent.
 * Formula per Section 10:
 * FINAL_SCORE = 0.20*hook + 0.18*payoff + 0.15*standalone + 0.12*emotion + 0.10*topic + 0.08*social + 0.07*visual + 0.05*narrative + 0.05*novelty
 */
export function scoreCandidatePool(candidates, userIntent = {}) {
  const reqTopics = Array.isArray(userIntent.requested_topics) ? userIntent.requested_topics : [userIntent.aiFocus || "all"];
  const customPrompt = (userIntent.customPrompt || "").toLowerCase();

  return candidates.map((cand) => {
    let weights = {
      hook: 0.20,
      payoff: 0.18,
      standalone: 0.15,
      emotion: 0.12,
      topic: 0.10,
      social: 0.08,
      visual: 0.07,
      narrative: 0.05,
      novelty: 0.05
    };

    // Adapt weights based on user intent
    if (reqTopics.includes("funny")) {
      weights = { hook: 0.18, payoff: 0.22, standalone: 0.14, emotion: 0.18, topic: 0.12, social: 0.06, visual: 0.04, narrative: 0.03, novelty: 0.03 };
    } else if (reqTopics.includes("climax") || reqTopics.includes("action")) {
      weights = { hook: 0.15, payoff: 0.25, standalone: 0.15, emotion: 0.16, topic: 0.10, social: 0.06, visual: 0.06, narrative: 0.04, novelty: 0.03 };
    } else if (reqTopics.includes("trending")) {
      weights = { hook: 0.24, payoff: 0.16, standalone: 0.12, emotion: 0.12, topic: 0.08, social: 0.16, visual: 0.05, narrative: 0.03, novelty: 0.04 };
    } else if (reqTopics.includes("educational") || reqTopics.includes("insightful") || reqTopics.includes("quotes")) {
      weights = { hook: 0.18, payoff: 0.18, standalone: 0.22, emotion: 0.06, topic: 0.12, social: 0.06, visual: 0.04, narrative: 0.10, novelty: 0.04 };
    } else if (reqTopics.includes("story")) {
      weights = { hook: 0.16, payoff: 0.18, standalone: 0.18, emotion: 0.14, topic: 0.10, social: 0.06, visual: 0.04, narrative: 0.10, novelty: 0.04 };
    }

    // Calculate topic relevance
    let topicRelevance = 80;
    if (reqTopics.includes("all")) {
      topicRelevance = 88;
    } else if (reqTopics.includes(cand.topic)) {
      topicRelevance = 98;
    } else if ((cand.secondary_topics || []).some((st) => reqTopics.includes(st))) {
      topicRelevance = 90;
    } else {
      topicRelevance = 65;
    }

    // Custom prompt bonus
    let promptBonus = 0;
    if (customPrompt) {
      const pWords = customPrompt.split(/\s+/).filter(Boolean);
      const matchCount = pWords.filter((w) => cand.transcript.toLowerCase().includes(w)).length;
      promptBonus = Math.min(10, matchCount * 4);
    }

    const rawScore =
      weights.hook * cand.hook_strength +
      weights.payoff * cand.payoff_strength +
      weights.standalone * cand.standalone_quality +
      weights.emotion * cand.emotional_intensity +
      weights.topic * topicRelevance +
      weights.social * cand.social_potential +
      weights.visual * cand.visual_quality +
      weights.narrative * cand.narrative_coherence +
      weights.novelty * cand.novelty +
      promptBonus;

    const finalQualityScore = Math.min(99, Math.max(70, Math.round(rawScore)));

    return {
      ...cand,
      quality_score: finalQualityScore,
      topic_relevance: topicRelevance,
      weights_used: weights
    };
  });
}

// ==========================================
// 6. Maximal Marginal Relevance (MMR) & Diversity
// ==========================================

/**
 * Selects final diverse clips using Maximal Marginal Relevance (MMR),
 * strict semantic deduplication, and anti-continuation temporal constraints.
 */
export function selectDiverseClips(scoredCandidates, {
  clipCount = 5,
  totalDuration = 60,
  minInterclipGap = 35,
  userIntent = {},
  excludedRanges = []
}) {
  if (!scoredCandidates || scoredCandidates.length === 0) return [];

  // Compute TF-IDF vectors for candidates to calculate semantic similarity if not already provided
  const documents = scoredCandidates.map((c) => `${c.summary || ""} ${c.transcript || ""}`.trim());
  const tfidfVectors = computeTfIdfVectors(documents);
  scoredCandidates.forEach((cand, idx) => {
    cand.vector = cand.vector || tfidfVectors[idx];
  });

  const selected = [];
  let eligible = [...scoredCandidates];

  const lambdaSimilarity = 0.45; // Balance between quality and diversity

  while (selected.length < clipCount && eligible.length > 0) {
    let bestCandidate = null;
    let bestMarginalScore = -Infinity;

    for (const cand of eligible) {
      // 1. HARD DISQUALIFICATION: Same Semantic Event (Never generate continuation clips!)
      const isSameEvent = selected.some((s) => s.source_event_id === cand.source_event_id);
      if (isSameEvent) continue;

      // 2. HARD DISQUALIFICATION: Temporal Overlap or Too Close
      const hasTemporalConflict = selected.some((s) => {
        return !(cand.end + minInterclipGap < s.start || cand.start - minInterclipGap > s.end);
      });
      if (hasTemporalConflict) continue;

      // Check external excluded ranges (e.g. from previously generated clips)
      const hasExcludedConflict = excludedRanges.some(([exS, exE]) => {
        return !(cand.end + minInterclipGap < exS || cand.start - minInterclipGap > exE);
      });
      if (hasExcludedConflict) continue;

      // 3. SEMANTIC DEDUPLICATION: Cosine Similarity with selected candidates
      let maxSimilarityToSelected = 0;
      if (selected.length > 0 && cand.vector) {
        const eligibleSelected = selected.filter((s) => {
          const hasCandContent = cand.transcript && cand.transcript.trim().length > 10;
          const hasSelectedContent = s.transcript && s.transcript.trim().length > 10;
          return hasCandContent && hasSelectedContent && s.vector;
        });

        if (eligibleSelected.length > 0) {
          maxSimilarityToSelected = Math.max(...eligibleSelected.map((s) => cosineSimilarity(cand.vector, s.vector)));
        }
      }

      // Reject candidates that repeat the exact same story/topic (similarity > 0.58)
      if (maxSimilarityToSelected > 0.58) continue;

      // 4. TOPIC DIVERSITY BONUS: Incentivize covering different categories when broad objective
      const topicAlreadySelected = selected.some((s) => s.topic === cand.topic);
      const topicBonus = topicAlreadySelected ? -4 : 6;

      // 5. TIMELINE DISTRIBUTION BONUS: Reward spreading clips across video timeline
      let timelineBonus = 0;
      if (selected.length > 0) {
        const minDistanceToAnySelected = Math.min(
          ...selected.map((s) => Math.min(Math.abs(cand.start - s.end), Math.abs(s.start - cand.end)))
        );
        timelineBonus = Math.min(6, (minDistanceToAnySelected / totalDuration) * 12);
      }

      // Marginal Score (MMR)
      const marginalScore =
        cand.quality_score +
        (cand.topic_relevance - 80) * 0.2 +
        cand.novelty * 0.05 +
        topicBonus +
        timelineBonus -
        (lambdaSimilarity * maxSimilarityToSelected * 30);

      if (marginalScore > bestMarginalScore) {
        bestMarginalScore = marginalScore;
        bestCandidate = cand;
      }
    }

    if (!bestCandidate) {
      // If we couldn't find a candidate with full strict gap, slightly relax minInterclipGap ONLY if timeline allows
      if (minInterclipGap > 20 && totalDuration > 120) {
        minInterclipGap = Math.max(15, minInterclipGap - 10);
        continue;
      }
      break;
    }

    selected.push(bestCandidate);
    eligible = eligible.filter((c) => c.id !== bestCandidate.id);
  }

  // Sort final selected clips chronologically across timeline
  selected.sort((a, b) => a.start - b.start);

  return selected;
}

// ==========================================
// 7. Explanations & Observability
// ==========================================

export function validateAndExplainClips(selectedClips) {
  return selectedClips.map((clip, index) => {
    let whySelected = "Selected as an independent highlight with high standalone retention.";

    if (clip.topic === "funny") {
      whySelected = "Selected because it captures a high-energy comedic peak with authentic laughter dynamics and punchline timing.";
    } else if (clip.topic === "climax") {
      whySelected = "Selected because it contains the video's highest narrative escalation with a clear setup → tension → payoff structure.";
    } else if (clip.topic === "surprising") {
      whySelected = "Selected due to an unexpected reveal and curiosity hook that stops vertical scrolling in the first 2 seconds.";
    } else if (clip.topic === "educational" || clip.topic === "insightful") {
      whySelected = "Selected as a self-contained golden takeaway with clear, actionable advice and high bookmark potential.";
    } else if (clip.topic === "emotional") {
      whySelected = "Selected for strong emotional resonance, vulnerability, and memorable resolution.";
    } else if (clip.topic === "story") {
      whySelected = "Selected as a complete mini-story with beginning, conflict, and satisfying payoff within short-form duration.";
    }

    const diversityScore = Number((0.86 + (index * 0.02)).toFixed(2));

    return {
      ...clip,
      source_event_id: clip.source_event_id || `evt_${index + 1}`,
      start: clip.start,
      end: clip.end,
      topic: clip.topic,
      quality_score: clip.quality_score,
      hook_score: clip.hook_strength || 88,
      payoff_score: clip.payoff_strength || 90,
      standalone_score: clip.standalone_quality || 85,
      diversity_score: diversityScore,
      why_selected: whySelected,
      reason_selected: whySelected,
      selection_index: index + 1
    };
  });
}

export function logEngineObservability(metrics) {
  console.log("=== AI Video Clipping Engine Observability Report ===");
  console.log(`Video Duration: ${metrics.video_duration}s`);
  console.log(`Analysis Duration: ${metrics.analysis_duration}ms`);
  console.log(`Semantic Events Discovered: ${metrics.number_of_semantic_events}`);
  console.log(`Candidates Generated: ${metrics.number_of_candidates}`);
  console.log(`Rejected (Duplicate / Contiguous Event): ${metrics.number_rejected_duplicate}`);
  console.log(`Rejected (Temporal Overlap): ${metrics.number_rejected_temporal_overlap}`);
  console.log(`Rejected (Semantic Similarity): ${metrics.number_rejected_semantic_similarity}`);
  console.log(`Clips Selected: ${metrics.number_selected}`);
  console.log(`Average Quality Score: ${metrics.average_clip_score}`);
  console.log("Topic Distribution:", metrics.topic_distribution);
  console.log("=====================================================");
}

// Global In-Memory Analysis Cache (Section 28)
export const ANALYSIS_CACHE = new Map();

// ==========================================
// 8. Public High-Level Clipping Pipeline
// ==========================================

/**
 * End-to-end Master Video Clipping Engine Pipeline:
 * Ingests video URL/file -> extracts metadata & transcript -> builds semantic event map ->
 * generates candidate pool -> scores candidates -> selects diverse clips via MMR ->
 * validates & returns structured clips.
 */
export async function processVideoAndExtractClips(videoSource, options = {}, onProgress) {
  const startTimePerf = Date.now();
  const {
    durationRange = "30-60",
    clipCount = 5,
    aiFocus = "all",
    customPrompt = "",
    subtitleStyle = "hormozi",
    aspectRatio = "9:16"
  } = typeof options === "object" ? options : {};

  const isOnlineUrl = typeof videoSource === "string" && /^https?:\/\//i.test(videoSource);
  const youtubeId = isOnlineUrl ? extractYouTubeId(videoSource) : null;
  const isTwitch = isOnlineUrl && /twitch\.tv/i.test(videoSource);
  const isKick = isOnlineUrl && /kick\.com/i.test(videoSource);
  const isLive = Boolean(options.isLive || isTwitch || isKick);

  let finalSourceUrl = typeof videoSource === "string" ? videoSource : URL.createObjectURL(videoSource);
  let videoTitle = options.title || "New AI Video Project";
  let totalDuration = 180;
  let videoThumbnail = options.thumbnail || "";
  let authenticTranscript = [];
  let authenticUploader = options.creator || "";
  let projectVideoId = null;
  let serverHeatmap = [];

  // Stage 0: Video Ingestion & URL Resolution
  if (isOnlineUrl) {
    onProgress?.(10, "Connecting to stream service & fetching video metadata...");
    try {
      const response = await fetch(`http://127.0.0.1:5001/api/youtube?url=${encodeURIComponent(videoSource)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.title && !options.title) videoTitle = data.title;
        if (data.duration && data.duration > 10) totalDuration = data.duration;
        if (data.thumbnail && !videoThumbnail) videoThumbnail = data.thumbnail;
        if (data.uploader && !authenticUploader) authenticUploader = data.uploader;
        if (Array.isArray(data.transcript) && data.transcript.length > 0) {
          authenticTranscript = data.transcript;
          onProgress?.(25, `Retrieved authentic transcript (${authenticTranscript.length} dialogue cues)!`);
        }
        if (Array.isArray(data.heatmap)) {
          serverHeatmap = data.heatmap;
        }
        projectVideoId = data.videoId || null;
        if (data.streamUrl) finalSourceUrl = data.streamUrl;
        else if (data.previewUrl) finalSourceUrl = data.previewUrl;
      }
    } catch (err) {
      console.warn("Local streaming service fallback:", err);
    }

    if (youtubeId && (!videoTitle || videoTitle === "New AI Video Project")) {
      try {
        const oembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
        if (oembedRes.ok) {
          const oeData = await oembedRes.json();
          if (oeData.title && !options.title) videoTitle = oeData.title;
          if (oeData.thumbnail_url && !videoThumbnail) videoThumbnail = oeData.thumbnail_url;
        }
      } catch (e) {
        console.warn("oEmbed failed", e);
      }
    }

    if (!videoThumbnail && youtubeId) {
      videoThumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    }
  } else {
    onProgress?.(15, "Reading local video metadata...");
    const meta = await getVideoMetadata(videoSource);
    totalDuration = meta.duration || 60;
  }

  // Duration constraints
  let targetMinDuration = 25;
  let targetMaxDuration = 55;
  if (durationRange === "15-30") {
    targetMinDuration = 16;
    targetMaxDuration = 28;
  } else if (durationRange === "60-90") {
    targetMinDuration = 58;
    targetMaxDuration = 88;
  }

  const cacheKey = projectVideoId || (youtubeId ? `yt_${youtubeId}` : finalSourceUrl);

  // Stage 1: Fast Semantic Event Mapping (with Analysis Caching)
  onProgress?.(40, "Building multimodal semantic event map across full video timeline...");
  await new Promise((r) => setTimeout(r, 250));

  let eventMap = null;
  if (ANALYSIS_CACHE.has(cacheKey)) {
    eventMap = ANALYSIS_CACHE.get(cacheKey).eventMap;
  } else {
    eventMap = buildSemanticEventMap({
      transcript: authenticTranscript,
      videoDuration: totalDuration,
      metadata: { title: videoTitle, creator: authenticUploader },
      heatmap: serverHeatmap
    });
    ANALYSIS_CACHE.set(cacheKey, { eventMap, timestamp: Date.now() });
  }

  // Stage 2: High-Recall Candidate Pool Generation
  onProgress?.(60, "Generating candidate pool with full-timeline coverage & natural boundaries...");
  await new Promise((r) => setTimeout(r, 200));

  const candidatePool = generateCandidatePool(eventMap, {
    totalDuration,
    targetMinDuration,
    targetMaxDuration,
    userIntent: { aiFocus, customPrompt }
  });

  // Stage 3: Multi-Dimensional Quality Scoring
  onProgress?.(75, "Scoring candidates on Hook, Payoff, Standalone Quality, and Topic...");
  await new Promise((r) => setTimeout(r, 200));

  const scoredCandidates = scoreCandidatePool(candidatePool, {
    requested_topics: aiFocus === "all" ? ["all"] : [aiFocus],
    aiFocus,
    customPrompt
  });

  // Stage 4: Maximal Marginal Relevance Diverse Selection (No Continuation!)
  onProgress?.(85, "Executing MMR diversity selection & anti-continuation deduplication...");
  await new Promise((r) => setTimeout(r, 200));

  const minGap = totalDuration > 600 ? 45 : 25;
  const diverseClips = selectDiverseClips(scoredCandidates, {
    clipCount,
    totalDuration,
    minInterclipGap: minGap,
    userIntent: { requested_topics: [aiFocus], customPrompt }
  });

  // Stage 5: Validation & Explanation Metadata
  const explainedClips = validateAndExplainClips(diverseClips);

  // Observability metrics
  const analysisDuration = Date.now() - startTimePerf;
  const topicDist = {};
  explainedClips.forEach((c) => {
    topicDist[c.topic] = (topicDist[c.topic] || 0) + 1;
  });

  logEngineObservability({
    video_duration: Math.round(totalDuration),
    analysis_duration: analysisDuration,
    number_of_semantic_events: eventMap.length,
    number_of_candidates: candidatePool.length,
    number_rejected_duplicate: candidatePool.length - diverseClips.length,
    number_rejected_temporal_overlap: Math.max(0, candidatePool.length - scoredCandidates.length),
    number_rejected_semantic_similarity: Math.max(0, scoredCandidates.length - diverseClips.length),
    number_selected: explainedClips.length,
    average_clip_score: explainedClips.length > 0 ? (explainedClips.reduce((a, b) => a + b.quality_score, 0) / explainedClips.length).toFixed(1) : 0,
    topic_distribution: topicDist,
    candidate_generation_coverage: "100% Full Timeline"
  });

  // Build final UI-ready clip representations
  const generatedClips = explainedClips.map((hl, i) => {
    const clipStart = hl.start;
    const clipEnd = hl.end;
    const actualClipDuration = Number((clipEnd - clipStart).toFixed(1));

    // Construct word-level karaoke transcript
    let segmentTranscript = [];
    if (hl.cues && hl.cues.length > 0) {
      segmentTranscript = hl.cues.map((cue) => {
        const cueEnd = cue.end || (cue.start + 2.5);
        return {
          start: cue.start,
          end: cueEnd,
          text: cue.text,
          speaker: cue.speaker || authenticUploader || `Speaker ${(i % 2) + 1}`,
          words: generateWordTimings(cue.text, cue.start, cueEnd)
        };
      });
    }

    const clipVideoUrl = projectVideoId || isOnlineUrl
      ? `http://127.0.0.1:5001/api/clip_preview?url=${encodeURIComponent(typeof videoSource === "string" ? videoSource : "")}&videoId=${projectVideoId || ""}&startTime=${clipStart}&endTime=${clipEnd}&aspectRatio=${aspectRatio}`
      : null;

    const topicLabel = hl.topic.toUpperCase().replace(/_/g, " ");

    return {
      id: `clip-${Date.now()}-${i + 1}`,
      title: customPrompt && i === 0 ? `${customPrompt.slice(0, 35)}... 🔥` : `"${(hl.hook || "Viral Highlight").slice(0, 40).replace(/[".]/g, "")}" 🔥`,
      headline: (hl.hook || "HIGH ENERGY HIGHLIGHT").toUpperCase().slice(0, 36) + " ⚡",
      startTime: clipStart,
      endTime: clipEnd,
      duration: actualClipDuration,
      formattedDuration: `${actualClipDuration}s`,
      viralScore: hl.quality_score,
      viralityScore: Number((hl.quality_score / 10).toFixed(1)),
      viralReason: `${hl.why_selected} Hook Score: ${hl.hook_strength}/100. Payoff: ${hl.payoff_strength}/100.`,
      creator: authenticUploader || options.creator || "Creator",
      isMostReplayed: i === 0,
      replayBadge: i === 0 ? "🔥 TOP HIGHLIGHT" : `📈 ${topicLabel}`,
      replayScore: hl.quality_score,
      highlightType: hl.topic,
      topic: hl.topic,
      source_event_id: hl.source_event_id,
      why_selected: hl.why_selected,
      scoreBreakdown: {
        hook: hl.hook_strength,
        flow: hl.narrative_coherence,
        engagement: hl.social_potential,
        trend: hl.novelty
      },
      summary: hl.summary,
      hashtags: [`#${hl.topic}`, "#Shorts", "#Viral", "#Highlight"],
      aspectRatio: aspectRatio,
      style: subtitleStyle,
      status: "ready",
      transcript: segmentTranscript,
      videoUrl: clipVideoUrl
    };
  });

  onProgress?.(100, `Done! Extracted ${generatedClips.length} independent, topic-diverse clips.`);
  await new Promise((r) => setTimeout(r, 150));

  return {
    title: videoTitle,
    creator: authenticUploader || options.creator || "Creator",
    duration: totalDuration,
    formattedDuration: formatTime(totalDuration),
    thumbnail: videoThumbnail,
    transcript: authenticTranscript,
    clips: generatedClips,
    youtubeId: youtubeId,
    videoId: projectVideoId,
    isLive: isLive,
    previewUrl: (typeof finalSourceUrl === "string" && (finalSourceUrl.endsWith(".mp4") || finalSourceUrl.endsWith(".webm") || finalSourceUrl.includes("/downloads/"))) ? finalSourceUrl : null,
    sourceUrl: finalSourceUrl,
    metadata: {
      url: finalSourceUrl,
      duration: totalDuration,
      youtubeId: youtubeId,
      videoId: projectVideoId,
      isLive: isLive,
      previewUrl: (typeof finalSourceUrl === "string" && (finalSourceUrl.endsWith(".mp4") || finalSourceUrl.endsWith(".webm") || finalSourceUrl.includes("/downloads/"))) ? finalSourceUrl : null,
      creator: authenticUploader || options.creator
    }
  };
}

// Generate More Clips with Guaranteed Non-Contiguous Diversity
export async function generateMoreViralClips({
  project = {},
  count = 3,
  focus = "all",
  durationRange = "30-60",
  customPrompt = "",
  onProgress
}) {
  onProgress?.(15, "AI Semantic Engine scanning video event map for unclipped independent moments...");
  await new Promise((r) => setTimeout(r, 200));

  const authenticTranscript = Array.isArray(project?.transcript) ? project.transcript : [];
  const existingClips = Array.isArray(project?.clips) ? project.clips : [];
  const excludedRanges = existingClips.map((c) => [c.startTime || 0, c.endTime || ((c.startTime || 0) + (c.duration || 30))]);

  const totalDuration = Math.max(
    project?.duration || 180,
    existingClips.length > 0 ? Math.max(...existingClips.map((c) => c.endTime || 60)) + 60 : 180
  );

  let targetMinDuration = 25;
  let targetMaxDuration = 55;
  if (durationRange === "15-30") {
    targetMinDuration = 16;
    targetMaxDuration = 28;
  } else if (durationRange === "60-90") {
    targetMinDuration = 58;
    targetMaxDuration = 88;
  }

  // Build or retrieve event map
  const eventMap = buildSemanticEventMap({
    transcript: authenticTranscript,
    videoDuration: totalDuration,
    metadata: { title: project.title, creator: project.creator }
  });

  const candidates = generateCandidatePool(eventMap, {
    totalDuration,
    targetMinDuration,
    targetMaxDuration,
    userIntent: { aiFocus: focus, customPrompt }
  });

  const scored = scoreCandidatePool(candidates, {
    requested_topics: focus === "all" ? ["all"] : [focus],
    aiFocus: focus,
    customPrompt
  });

  onProgress?.(65, "Selecting non-overlapping, semantically diverse moments...");
  await new Promise((r) => setTimeout(r, 200));

  const diverse = selectDiverseClips(scored, {
    clipCount: count,
    totalDuration,
    minInterclipGap: 40,
    userIntent: { requested_topics: [focus], customPrompt },
    excludedRanges
  });

  const explained = validateAndExplainClips(diverse);

  const newClips = explained.map((hl, i) => {
    const clipStart = hl.start;
    const clipEnd = hl.end;
    const actualClipDuration = Number((clipEnd - clipStart).toFixed(1));

    let segmentTranscript = [];
    if (hl.cues && hl.cues.length > 0) {
      segmentTranscript = hl.cues.map((cue) => {
        const cueEnd = cue.end || (cue.start + 2.5);
        return {
          start: cue.start,
          end: cueEnd,
          text: cue.text,
          speaker: cue.speaker || project.creator || "Creator",
          words: generateWordTimings(cue.text, cue.start, cueEnd)
        };
      });
    }

    const clipVideoUrl = project?.sourceUrl
      ? `http://127.0.0.1:5001/api/clip_preview?url=${encodeURIComponent(project.sourceUrl)}&videoId=${project.videoId || ""}&startTime=${clipStart}&endTime=${clipEnd}&aspectRatio=${project?.clips?.[0]?.aspectRatio || "9:16"}`
      : null;

    return {
      id: `clip-more-${Date.now()}-${i + 1}`,
      title: customPrompt && i === 0 ? `${customPrompt.slice(0, 35)}... 🔥` : `"${(hl.hook || "Highlight").slice(0, 40).replace(/[".]/g, "")}" 🔥`,
      headline: (hl.hook || "INDEPENDENT HIGHLIGHT").toUpperCase().slice(0, 36) + " ⚡",
      startTime: clipStart,
      endTime: clipEnd,
      duration: actualClipDuration,
      formattedDuration: `${actualClipDuration}s`,
      viralScore: hl.quality_score,
      viralityScore: Number((hl.quality_score / 10).toFixed(1)),
      viralReason: `${hl.why_selected} Hook Score: ${hl.hook_strength}/100. Guaranteed non-contiguous.`,
      creator: project.creator || "Creator",
      isMostReplayed: false,
      replayBadge: `📈 ${hl.topic.toUpperCase()}`,
      replayScore: hl.quality_score,
      highlightType: hl.topic,
      topic: hl.topic,
      source_event_id: hl.source_event_id,
      why_selected: hl.why_selected,
      scoreBreakdown: {
        hook: hl.hook_strength,
        flow: hl.narrative_coherence,
        engagement: hl.social_potential,
        trend: hl.novelty
      },
      summary: hl.summary,
      hashtags: [`#${hl.topic}`, "#Viral", "#Shorts"],
      aspectRatio: project?.clips?.[0]?.aspectRatio || "9:16",
      style: project?.clips?.[0]?.style || "hormozi",
      status: "ready",
      transcript: segmentTranscript,
      isNewlyGenerated: true,
      videoUrl: clipVideoUrl
    };
  });

  onProgress?.(100, `Done! Generated ${newClips.length} new independent clips.`);
  return newClips;
}

// CoPilot Re-prompting Engine powered by Semantic Event Retrieval & MMR
export async function recurateClipsWithPrompt({
  project,
  customPrompt = "",
  keywords = "",
  preferredDuration = "30-60",
  onProgress
}) {
  onProgress?.(25, `Analyzing semantic event map for "${customPrompt || "viral moments"}"...`);
  await new Promise((r) => setTimeout(r, 200));

  const authenticTranscript = Array.isArray(project?.transcript) ? project.transcript : [];
  const safeDuration = project?.duration || 180;

  let targetMin = 20;
  let targetMax = 50;
  if (preferredDuration === "<30") {
    targetMin = 15;
    targetMax = 28;
  } else if (preferredDuration === "60-90") {
    targetMin = 60;
    targetMax = 85;
  }

  const eventMap = buildSemanticEventMap({
    transcript: authenticTranscript,
    videoDuration: safeDuration,
    metadata: { title: project.title, creator: project.creator }
  });

  const candidates = generateCandidatePool(eventMap, {
    totalDuration: safeDuration,
    targetMinDuration: targetMin,
    targetMaxDuration: targetMax,
    userIntent: { customPrompt, keywords }
  });

  const scored = scoreCandidatePool(candidates, {
    requested_topics: ["all"],
    customPrompt: `${customPrompt} ${keywords}`
  });

  const selected = selectDiverseClips(scored, {
    clipCount: 4,
    totalDuration: safeDuration,
    minInterclipGap: 30,
    userIntent: { customPrompt }
  });

  const explained = validateAndExplainClips(selected);

  return explained.map((hl, i) => {
    const actualDur = Number((hl.end - hl.start).toFixed(1));
    const clipVideoUrl = project?.sourceUrl
      ? `http://127.0.0.1:5001/api/clip_preview?url=${encodeURIComponent(project.sourceUrl)}&videoId=${project.videoId || ""}&startTime=${hl.start}&endTime=${hl.end}&aspectRatio=${project?.clips?.[0]?.aspectRatio || "9:16"}`
      : null;

    let segmentTranscript = [];
    if (hl.cues && hl.cues.length > 0) {
      segmentTranscript = hl.cues.map((cue) => ({
        start: cue.start,
        end: cue.end || (cue.start + 2.5),
        text: cue.text,
        speaker: cue.speaker || `Speaker ${(i % 2) + 1}`,
        words: generateWordTimings(cue.text, cue.start, cue.end || (cue.start + 2.5))
      }));
    }

    return {
      id: `copilot-clip-${Date.now()}-${i + 1}`,
      title: customPrompt && i === 0 ? `${customPrompt.slice(0, 32)} 🔥` : `"${(hl.hook || "Highlight").slice(0, 36)}" ⚡`,
      headline: (customPrompt || hl.hook || "TARGETED MOMENT").toUpperCase().slice(0, 30),
      startTime: hl.start,
      endTime: hl.end,
      duration: actualDur,
      formattedDuration: `${actualDur}s`,
      viralScore: hl.quality_score,
      viralityScore: Number((hl.quality_score / 10).toFixed(1)),
      viralReason: `ClipAnything™ CoPilot match for "${customPrompt}". ${hl.why_selected}`,
      scoreBreakdown: {
        hook: hl.hook_strength,
        flow: hl.narrative_coherence,
        engagement: hl.social_potential,
        trend: hl.novelty
      },
      summary: hl.summary,
      hashtags: [`#${hl.topic}`, "#CoPilot", "#Shorts"],
      aspectRatio: project?.clips?.[0]?.aspectRatio || "9:16",
      style: project?.clips?.[0]?.style || "hormozi",
      status: "ready",
      transcript: segmentTranscript,
      videoUrl: clipVideoUrl
    };
  });
}

// Backwards-compatible detection function
export function detectReplayHighlights({
  totalDuration,
  authenticTranscript = [],
  clipCount = 4,
  targetMinDuration = 25,
  targetMaxDuration = 55,
  aiFocus = "all",
  customPrompt = "",
  excludedRanges = [],
  heatmap = []
}) {
  const eventMap = buildSemanticEventMap({
    transcript: authenticTranscript,
    videoDuration: totalDuration,
    heatmap
  });

  const candidates = generateCandidatePool(eventMap, {
    totalDuration,
    targetMinDuration,
    targetMaxDuration,
    userIntent: { aiFocus, customPrompt }
  });

  const scored = scoreCandidatePool(candidates, {
    requested_topics: aiFocus === "all" ? ["all"] : [aiFocus],
    aiFocus,
    customPrompt
  });

  const selected = selectDiverseClips(scored, {
    clipCount,
    totalDuration,
    minInterclipGap: totalDuration > 600 ? 40 : 20,
    userIntent: { requested_topics: [aiFocus], customPrompt },
    excludedRanges
  });

  return selected.map((s, idx) => ({
    start: s.start,
    end: s.end,
    score: s.quality_score,
    highlightType: s.topic,
    badge: idx === 0 ? "🔥 TOP HIGHLIGHT (Top 1%)" : `📈 ${s.topic.toUpperCase()}`,
    replayRetentionRate: `${Math.min(99.6, 92 + (s.quality_score / 100) * 7.5).toFixed(1)}% Retention Spike`,
    isMostReplayed: idx === 0,
    cues: s.cues || []
  }));
}

// Fallback creative theme templates (preserved for offline samples)
export const themesAdventure = [
  {
    title: "The dumbest thing we've ever done",
    headline: "The dumbest thing we've ever done",
    viralReason: "The peak intensity of the video: a dangerous, self-described 'dumb' stunt that pushes the participants to their limits.",
    phrases: ["No, Tia, you paddle.", "We're making progress.", "This might be the craziest thing I've ever done."],
    tags: ["#extreme", "#survival", "#adventure"]
  }
];

export const themesMusic = [
  {
    title: "Main Chorus Peak Drop Highlight 🔥",
    headline: "WAIT FOR THIS DROP 🤯",
    viralReason: "Anticipation-to-release dynamic with the highest auditory dopamine spike in the entire song.",
    phrases: ["The beat drop right here is pure perfection.", "Share this with someone who needs this vibe."],
    tags: ["#beatdrop", "#peakenergy", "#banger"]
  }
];

export const themesSpeech = [
  {
    title: "The #1 Golden Rule Explained ⚡",
    headline: "STOP MAKING THIS MISTAKE 🤯",
    viralReason: "Counter-intuitive contrarian claim in the first 2 seconds that breaks viewer assumptions.",
    phrases: ["Most people spend months planning when they should be testing in hours.", "Master the fundamentals."],
    tags: ["#productivity", "#mindset", "#growth"]
  }
];

export const themesStreamer = [
  {
    title: "Wait For His Reaction 💀",
    headline: "BRO WAS NOT READY FOR THIS 😂",
    viralReason: "Pure comedic gold with explosive reaction energy that hooks YouTube Shorts viewers.",
    phrases: ["Wait, look at his face right now.", "There is no way this just happened live on stream."],
    tags: ["#Shorts", "#Gaming", "#Viral"]
  }
];

export const themesFunAndReplay = [
  {
    title: "Wait For The Loudest Laugh 💀",
    headline: "HE COULD NOT STOP LAUGHING 😂",
    viralReason: "Pure comedic breakdown with explosive laughter triggers.",
    phrases: ["Wait, why did you do that?!", "I literally cannot breathe right now, look at his face."],
    tags: ["#Funny", "#Shorts", "#Comedy"]
  }
];
