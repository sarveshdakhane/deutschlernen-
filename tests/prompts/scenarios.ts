import { ReadingType } from "../../lib/types";

export type RegressionScenario = {
  name: string;
  type: ReadingType;
  topic: string;
};

// The 10 representative categories requested for prompt regression testing.
// `topic` is passed as the topicOverride param to buildPromptForType so the
// test targets this exact scenario instead of whatever the daily rotation
// would otherwise pick.
export const REGRESSION_SCENARIOS: RegressionScenario[] = [
  { name: "hotel", type: "speaking", topic: "someone calling a hotel to ask about available rooms, prices, and check-in/check-out dates for a specific weekend" },
  { name: "restaurant", type: "speaking", topic: "a customer ordering food at a restaurant and asking the waiter questions about the menu" },
  { name: "shopping", type: "speaking", topic: "a customer asking a shop assistant for help finding the right size of clothing" },
  { name: "doctor", type: "dialogue", topic: "a patient describing symptoms to a doctor and discussing treatment options" },
  { name: "travel", type: "dialogue", topic: "two friends planning a train trip across Germany and negotiating the itinerary and dates" },
  { name: "school", type: "speaking", topic: "a student asking a teacher for help understanding a homework assignment" },
  { name: "phone-call", type: "dialogue", topic: "a person calling a company's customer service line about a billing problem" },
  { name: "job-interview", type: "dialogue", topic: "a job applicant and an interviewer discussing the applicant's experience and expectations" },
  { name: "friend-conversation", type: "dialogue", topic: "two friends catching up after not seeing each other for months" },
  { name: "family-conversation", type: "dialogue", topic: "a parent and adult child discussing weekend plans and disagreeing politely" },
];
