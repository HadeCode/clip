// Comprehensive Test Suite for Multimodal, Topic-Aware, Diverse AI Video Clipping Engine
// Covers Tests 1 through 10 and the Section 16 Continuation Regression Test.

import assert from "node:assert";
import {
  buildSemanticEventMap,
  generateCandidatePool,
  scoreCandidatePool,
  selectDiverseClips,
  validateAndExplainClips,
  computeTfIdfVectors,
  cosineSimilarity,
  TOPIC_TAXONOMY
} from "../src/utils/aiClippingEngine.js";

console.log("=================================================");
console.log("RUNNING AI VIDEO CLIPPING ENGINE TEST SUITE");
console.log("=================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// -------------------------------------------------------------
// Test 0: Section 16 Regression Test: No Continuation Bug
// -------------------------------------------------------------
runTest("Section 16 Regression: Independent Events Across Timeline (No 00:30-01:00, 00:55-01:25 sequential slices)", () => {
  // Setup 5 distinct events across a 60-minute timeline:
  // Event A: 00:00–02:00
  // Event B: 08:00–09:00
  // Event C: 17:00–18:00
  // Event D: 31:00–32:00
  // Event E: 48:00–49:00
  const mockTranscript = [
    // Event A (0-120s)
    { start: 10, end: 15, text: "Wait wait look at this, the opening discovery is insane!" },
    { start: 25, end: 32, text: "Nobody has ever found this before in history." },
    { start: 45, end: 55, text: "And that changes our entire plan for today." },

    // Event B (480-540s)
    { start: 490, end: 498, text: "Haha this is the funniest mistake Tia ever made, bro look at him!" },
    { start: 505, end: 515, text: "I literally cannot breathe right now, laughing so hard." },

    // Event C (1020-1080s)
    { start: 1030, end: 1038, text: "Here is the controversial truth nobody wants to admit." },
    { start: 1045, end: 1055, text: "Everyone who says otherwise is completely lying." },

    // Event D (1860-1920s)
    { start: 1870, end: 1878, text: "When I was young, I failed three times before I learned the secret." },
    { start: 1885, end: 1895, text: "That one lesson multiplied everything by ten." },

    // Event E (2880-2940s)
    { start: 2890, end: 2898, text: "Holy holy, watch this impossible clutch right now!" },
    { start: 2905, end: 2915, text: "No way he actually pulled off the final victory!" }
  ];

  const totalDuration = 3600; // 60 minutes
  const eventMap = buildSemanticEventMap({ transcript: mockTranscript, videoDuration: totalDuration });
  assert.ok(eventMap.length >= 5, `Expected at least 5 events, got ${eventMap.length}`);

  const candidates = generateCandidatePool(eventMap, { totalDuration, targetMinDuration: 20, targetMaxDuration: 55 });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["all"] });
  const selected = selectDiverseClips(scored, { clipCount: 5, totalDuration, minInterclipGap: 40 });

  assert.strictEqual(selected.length, 5, `Expected exactly 5 clips, got ${selected.length}`);

  // VERIFY: Clips are NOT clustered in Event A (00:00–02:00)
  const clipsInFirstFiveMinutes = selected.filter((c) => c.start < 300);
  assert.ok(
    clipsInFirstFiveMinutes.length <= 1,
    `Regression failed: Multiple clips were clustered near the beginning! Found: ${clipsInFirstFiveMinutes.length}`
  );

  // VERIFY: All 5 clips originate from distinct source events
  const eventIds = new Set(selected.map((c) => c.source_event_id));
  assert.strictEqual(
    eventIds.size,
    5,
    "Regression failed: Clips share the same source_event_id (continuation detected)!"
  );

  // VERIFY: Each clip is separated by substantial gaps across the 60m timeline
  for (let i = 0; i < selected.length - 1; i++) {
    const gap = selected[i + 1].start - selected[i].end;
    assert.ok(gap >= 35, `Clips ${i} and ${i + 1} are too close together: gap = ${gap}s`);
  }
});

// -------------------------------------------------------------
// Test 1: Multiple Unrelated Events
// -------------------------------------------------------------
runTest("Test 1: Multiple unrelated events produce multiple independent clips", () => {
  const transcript = [
    { start: 5, end: 12, text: "What is that hidden in the cave? That looks unbelievable." },
    { start: 80, end: 88, text: "Hahaha bro that reaction was hilarious, he fell off the chair!" },
    { start: 160, end: 168, text: "Stop right now and listen to the #1 golden rule of life." },
    { start: 240, end: 250, text: "OMG holy clutch, he won the match with 1 HP left!" }
  ];

  const eventMap = buildSemanticEventMap({ transcript, videoDuration: 300 });
  const candidates = generateCandidatePool(eventMap, { totalDuration: 300 });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["all"] });
  const selected = selectDiverseClips(scored, { clipCount: 4, totalDuration: 300 });

  assert.strictEqual(selected.length, 4);
  const distinctEvents = new Set(selected.map((c) => c.source_event_id));
  assert.strictEqual(distinctEvents.size, 4, "Each clip must come from an independent event");
});

// -------------------------------------------------------------
// Test 2: One Extremely Strong Event
// -------------------------------------------------------------
runTest("Test 2: One extremely strong event does NOT generate 5 clips from the same event", () => {
  const transcript = [
    // Super loud viral moment with massive hype triggers
    { start: 20, end: 25, text: "HOLY HOLY OMG NO WAY UNBELIEVABLE INSANE!" },
    { start: 26, end: 32, text: "BRO WHAT DID HE JUST DO HE BROKE THE WORLD RECORD!" },
    { start: 33, end: 40, text: "EVERYBODY IN CHAT IS LOSING THEIR MINDS RIGHT NOW!" },
    { start: 41, end: 48, text: "I CANNOT BELIEVE THIS ACTUALLY JUST HAPPENED LIVE!" },
    { start: 49, end: 55, text: "THAT WAS THE GREATEST MOMENT IN STREAMING HISTORY!" },

    // Mild independent moments later in the video
    { start: 120, end: 130, text: "Now on another note, let's talk about the strategy we used." },
    { start: 220, end: 230, text: "Hahaha Tia tried to cook eggs and set the kitchen on fire." },
    { start: 320, end: 330, text: "Here is the fundamental lesson you need to take away." },
    { start: 420, end: 430, text: "And that is why preparation is always the key." }
  ];

  const eventMap = buildSemanticEventMap({ transcript, videoDuration: 500 });
  const candidates = generateCandidatePool(eventMap, { totalDuration: 500 });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["all"] });
  const selected = selectDiverseClips(scored, { clipCount: 4, totalDuration: 500 });

  const firstEventCount = selected.filter((c) => c.start < 60).length;
  assert.strictEqual(
    firstEventCount,
    1,
    `Expected only 1 clip from the initial strong event, got ${firstEventCount}`
  );
  assert.strictEqual(selected.length, 4, "Must select independent moments from later timeline");
});

// -------------------------------------------------------------
// Test 3: Repeated Topic Semantic Deduplication
// -------------------------------------------------------------
runTest("Test 3: Repeated topic with similar text triggers semantic deduplication", () => {
  const doc1 = "Why I decided to quit my company and leave everything behind forever.";
  const doc2 = "Why I quit my company and walked away from everything I built forever.";
  const doc3 = "The hilarious prank where we put water in the streamer shoes haha.";

  const vecs = computeTfIdfVectors([doc1, doc2, doc3]);
  const sim12 = cosineSimilarity(vecs[0], vecs[1]);
  const sim13 = cosineSimilarity(vecs[0], vecs[2]);

  assert.ok(sim12 > 0.60, `Expected high similarity between doc1 and doc2, got ${sim12}`);
  assert.ok(sim13 < 0.20, `Expected low similarity between doc1 and doc3, got ${sim13}`);

  // In selection, doc2 should be rejected as a duplicate of doc1
  const candidates = [
    {
      id: "c1",
      source_event_id: "e1",
      start: 10,
      end: 40,
      quality_score: 95,
      topic_relevance: 90,
      novelty: 80,
      summary: doc1,
      transcript: doc1,
      vector: vecs[0]
    },
    {
      id: "c2",
      source_event_id: "e2",
      start: 100,
      end: 130,
      quality_score: 93,
      topic_relevance: 90,
      novelty: 80,
      summary: doc2,
      transcript: doc2,
      vector: vecs[1]
    },
    {
      id: "c3",
      source_event_id: "e3",
      start: 200,
      end: 230,
      quality_score: 88,
      topic_relevance: 85,
      novelty: 85,
      summary: doc3,
      transcript: doc3,
      vector: vecs[2]
    }
  ];

  const selected = selectDiverseClips(candidates, { clipCount: 2, totalDuration: 300 });
  const ids = selected.map((s) => s.id);
  assert.ok(ids.includes("c1"), "c1 should be selected");
  assert.ok(!ids.includes("c2"), "c2 must be deduplicated due to high semantic similarity to c1");
  assert.ok(ids.includes("c3"), "c3 should be selected as the diverse alternative");
});

// -------------------------------------------------------------
// Test 4: Two Adjacent but Unrelated Events
// -------------------------------------------------------------
runTest("Test 4: Two adjacent but completely unrelated events can both be selected", () => {
  const transcript = [
    { start: 10, end: 35, text: "Hahaha this joke was so funny everyone in the room laughed so hard." },
    // 35s gap
    { start: 72, end: 100, text: "Stop right now. Look at this ancient skull buried beneath the rock." }
  ];

  const eventMap = buildSemanticEventMap({ transcript, videoDuration: 150 });
  assert.strictEqual(eventMap.length, 2);
  assert.notStrictEqual(eventMap[0].topic, eventMap[1].topic);

  const candidates = generateCandidatePool(eventMap, { totalDuration: 150 });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["all"] });
  const selected = selectDiverseClips(scored, { clipCount: 2, totalDuration: 150, minInterclipGap: 25 });

  assert.strictEqual(selected.length, 2, "Both unrelated events should be selected");
});

// -------------------------------------------------------------
// Test 5: One Long Story
// -------------------------------------------------------------
runTest("Test 5: One long story produces one coherent clip rather than multiple continuation slices", () => {
  const transcript = [
    { start: 10, end: 20, text: "When I was twenty years old, I lost every single dollar I had." },
    { start: 21, end: 32, text: "I slept in my car for six months thinking my life was completely ruined." },
    { start: 33, end: 45, text: "Then one morning, an old friend called me with an opportunity." },
    { start: 46, end: 58, text: "And that taught me to never ever give up when things look dark." },
    // Separate unrelated moment
    { start: 150, end: 180, text: "Look at this insane jump from the cliff into the ocean!" }
  ];

  const eventMap = buildSemanticEventMap({ transcript, videoDuration: 250 });
  const candidates = generateCandidatePool(eventMap, { totalDuration: 250, targetMaxDuration: 55 });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["all"] });
  const selected = selectDiverseClips(scored, { clipCount: 2, totalDuration: 250 });

  // Story event should have at most 1 clip
  const storyClips = selected.filter((c) => c.start < 70);
  assert.strictEqual(storyClips.length, 1, "Expected exactly 1 coherent clip for the story, not multiple slices");
});

// -------------------------------------------------------------
// Test 6: Diverse Selection Across Categories
// -------------------------------------------------------------
runTest("Test 6: Funny + Emotional + Climax + Insight produces diverse selection", () => {
  const transcript = [
    { start: 10, end: 35, text: "Hahaha dying of laughter, bro is hilarious joke prank fail!" },
    { start: 100, end: 125, text: "I started crying tears, this inspired me deeply, never give up hope." },
    { start: 200, end: 225, text: "HOLY OMG NO WAY UNREAL CLUTCH FINAL BOSS BANGER!" },
    { start: 300, end: 325, text: "Here is the #1 rule and formula for success and discipline." }
  ];

  const eventMap = buildSemanticEventMap({ transcript, videoDuration: 400 });
  const topics = eventMap.map((e) => e.topic);
  assert.ok(topics.includes("funny"), "Should classify funny");
  assert.ok(topics.includes("emotional") || topics.includes("inspirational"), "Should classify emotional");
  assert.ok(topics.includes("climax") || topics.includes("action"), "Should classify climax");
  assert.ok(topics.includes("educational") || topics.includes("insightful"), "Should classify educational");

  const candidates = generateCandidatePool(eventMap, { totalDuration: 400 });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["all"] });
  const selected = selectDiverseClips(scored, { clipCount: 4, totalDuration: 400 });

  const selectedTopics = new Set(selected.map((s) => s.topic));
  assert.ok(selectedTopics.size >= 3, `Expected at least 3 distinct topics, got ${selectedTopics.size}`);
});

// -------------------------------------------------------------
// Test 7: User Asks Specifically for Funny
// -------------------------------------------------------------
runTest("Test 7: User asks specifically for funny -> final results dominated by funny candidates", () => {
  const transcript = [
    { start: 10, end: 35, text: "Hahaha dying of laughter, bro is hilarious comedy fail joke!" },
    { start: 100, end: 125, text: "Deep philosophical reflection on the meaning of the universe." },
    { start: 200, end: 225, text: "Lmao he did the goofy ridiculous prank again haha!" }
  ];

  const eventMap = buildSemanticEventMap({ transcript, videoDuration: 300 });
  const candidates = generateCandidatePool(eventMap, { totalDuration: 300 });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["funny"], aiFocus: "funny" });
  const selected = selectDiverseClips(scored, { clipCount: 2, totalDuration: 300, userIntent: { requested_topics: ["funny"] } });

  const funnyClips = selected.filter((c) => c.topic === "funny" || (c.secondary_topics || []).includes("funny"));
  assert.ok(funnyClips.length >= 1, "Results must prioritize funny candidates");
  assert.strictEqual(selected[0].topic, "funny", "Top selected clip must be funny");
});

// -------------------------------------------------------------
// Test 8: User Asks Specifically for Climax
// -------------------------------------------------------------
runTest("Test 8: User asks specifically for climax -> narrative-payoff candidates prioritized", () => {
  const transcript = [
    { start: 10, end: 35, text: "Simple introduction and general housecleaning notes." },
    { start: 100, end: 130, text: "HOLY SHIT NO WAY OMG HE PULLED OFF THE FINAL CLUTCH BANGER!" }
  ];

  const eventMap = buildSemanticEventMap({ transcript, videoDuration: 200 });
  const candidates = generateCandidatePool(eventMap, { totalDuration: 200 });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["climax"], aiFocus: "climax" });
  const selected = selectDiverseClips(scored, { clipCount: 1, totalDuration: 200, userIntent: { requested_topics: ["climax"] } });

  assert.strictEqual(selected[0].topic, "climax");
  assert.ok(selected[0].payoff_strength >= 90, "Climax clip must have high payoff strength");
});

// -------------------------------------------------------------
// Test 9: Long Video Timeline Coverage
// -------------------------------------------------------------
runTest("Test 9: Long video candidate discovery covers the complete timeline", () => {
  const longDuration = 7200; // 2 hours (120 minutes)
  const eventMap = buildSemanticEventMap({ transcript: [], videoDuration: longDuration });

  assert.ok(eventMap.length >= 15, `Expected at least 15 events across 2h, got ${eventMap.length}`);
  const maxEnd = Math.max(...eventMap.map((e) => e.end));
  assert.ok(maxEnd >= longDuration * 0.9, "Candidate discovery must reach the end of the video");

  const candidates = generateCandidatePool(eventMap, { totalDuration: longDuration });
  const scored = scoreCandidatePool(candidates, { requested_topics: ["all"] });
  const selected = selectDiverseClips(scored, { clipCount: 6, totalDuration: longDuration });

  assert.strictEqual(selected.length, 6);
  // Ensure clips are distributed across beginning, middle, and end
  assert.ok(selected[0].start < 2400, "First clip should be in first third");
  assert.ok(selected[selected.length - 1].end > 4000, "Last clip should be in final portion");
});

// -------------------------------------------------------------
// Test 10: Validation & Explanations Metadata Structure
// -------------------------------------------------------------
runTest("Test 10: Output contains structured explanations, topics, and why_selected", () => {
  const mockSelected = [
    {
      id: "c1",
      topic: "climax",
      hook: "Holy watch this play",
      payoff: "He won the match",
      hook_strength: 95,
      payoff_strength: 97,
      source_event_id: "evt_1",
      quality_score: 96
    }
  ];

  const explained = validateAndExplainClips(mockSelected);
  assert.strictEqual(explained.length, 1);
  assert.ok(explained[0].why_selected.length > 15, "Must contain explanatory rationale");
  assert.strictEqual(explained[0].topic, "climax");
  assert.strictEqual(explained[0].source_event_id, "evt_1");
});

console.log("\n=================================================");
console.log(`ALL ${passedCount} / ${totalCount} TESTS PASSED SUCCESSFULLY!`);
console.log("=================================================");
