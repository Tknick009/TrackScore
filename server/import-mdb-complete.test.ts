import { generateEventName, MDBEvent } from "./import-mdb-complete";

interface TestCase {
  description: string;
  event: MDBEvent;
  expected: string;
}

const testCases: TestCase[] = [
  // Test "G" for Girls → Women's
  {
    description: 'Uppercase "G" should map to Women\'s',
    event: { Event_sex: "G", Event_dist: 100, Event_stroke: "A" },
    expected: "Women's 100m Dash"
  },
  {
    description: 'Lowercase "g" should map to Women\'s',
    event: { Event_sex: "g", Event_dist: 100, Event_stroke: "A" },
    expected: "Women's 100m Dash"
  },
  
  // Test "COED" variants → Mixed
  {
    description: 'Uppercase "COED" should map to Mixed',
    event: { Event_sex: "COED", Event_dist: 400, Event_stroke: "A", Ind_rel: "R" },
    expected: "Mixed 4x100m Relay"
  },
  {
    description: 'Lowercase "coed" should map to Mixed',
    event: { Event_sex: "coed", Event_dist: 400, Event_stroke: "A", Ind_rel: "R" },
    expected: "Mixed 4x100m Relay"
  },
  {
    description: 'Uppercase "CO-ED" should map to Mixed',
    event: { Event_sex: "CO-ED", Event_dist: 400, Event_stroke: "A", Ind_rel: "R" },
    expected: "Mixed 4x100m Relay"
  },
  {
    description: 'Lowercase "co-ed" should map to Mixed',
    event: { Event_sex: "co-ed", Event_dist: 400, Event_stroke: "A", Ind_rel: "R" },
    expected: "Mixed 4x100m Relay"
  },
  
  // Test "BOTH" → Mixed
  {
    description: 'Uppercase "BOTH" should map to Mixed',
    event: { Event_sex: "BOTH", Event_dist: 400, Event_stroke: "A", Ind_rel: "R" },
    expected: "Mixed 4x100m Relay"
  },
  {
    description: 'Lowercase "both" should map to Mixed',
    event: { Event_sex: "both", Event_dist: 400, Event_stroke: "A", Ind_rel: "R" },
    expected: "Mixed 4x100m Relay"
  },
  
  // Test "B" for Boys → Men's
  {
    description: 'Uppercase "B" should map to Men\'s',
    event: { Event_sex: "B", Event_dist: 100, Event_stroke: "A" },
    expected: "Men's 100m Dash"
  },
  {
    description: 'Lowercase "b" should map to Men\'s',
    event: { Event_sex: "b", Event_dist: 100, Event_stroke: "A" },
    expected: "Men's 100m Dash"
  },
  
  // Test existing functionality still works
  {
    description: 'Uppercase "W" should still map to Women\'s',
    event: { Event_sex: "W", Event_dist: 200, Event_stroke: "A" },
    expected: "Women's 200m Dash"
  },
  {
    description: 'Uppercase "F" should still map to Women\'s',
    event: { Event_sex: "F", Event_dist: 200, Event_stroke: "A" },
    expected: "Women's 200m Dash"
  },
  {
    description: 'Uppercase "M" should default to Men\'s',
    event: { Event_sex: "M", Event_dist: 400, Event_stroke: "B" },
    expected: "Men's 400m Run"
  },
  {
    description: 'Uppercase "X" should map to Mixed',
    event: { Event_sex: "X", Event_dist: 1600, Event_stroke: "B", Ind_rel: "R" },
    expected: "Mixed 4x400m Relay"
  },
  
  // Test field events with different genders
  {
    description: 'Girls High Jump',
    event: { Event_sex: "G", Event_dist: 0, Event_stroke: "K" },
    expected: "Women's High Jump"
  },
  {
    description: 'Boys Shot Put',
    event: { Event_sex: "B", Event_dist: 0, Event_stroke: "M" },
    expected: "Men's Shot Put"
  },
  {
    description: 'Mixed Long Jump',
    event: { Event_sex: "COED", Event_dist: 0, Event_stroke: "L" },
    expected: "Mixed Long Jump"
  },
];

function runTests() {
  console.log("\n🧪 Running Gender Code Normalization Tests\n");
  console.log("=".repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const result = generateEventName(testCase.event);
    const isPass = result === testCase.expected;
    
    if (isPass) {
      passed++;
      console.log(`✅ PASS: ${testCase.description}`);
      console.log(`   Input: Event_sex="${testCase.event.Event_sex}", Event_dist=${testCase.event.Event_dist}, Event_stroke="${testCase.event.Event_stroke}", Ind_rel="${testCase.event.Ind_rel || 'I'}"`);
      console.log(`   Result: "${result}"`);
    } else {
      failed++;
      console.log(`❌ FAIL: ${testCase.description}`);
      console.log(`   Input: Event_sex="${testCase.event.Event_sex}", Event_dist=${testCase.event.Event_dist}, Event_stroke="${testCase.event.Event_stroke}", Ind_rel="${testCase.event.Ind_rel || 'I'}"`);
      console.log(`   Expected: "${testCase.expected}"`);
      console.log(`   Got:      "${result}"`);
    }
    console.log("");
  }
  
  console.log("=".repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed (${testCases.length} total)\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
