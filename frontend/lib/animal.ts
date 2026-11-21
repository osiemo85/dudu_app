import type { AdvisoryContext } from "./advisory";
export type AnimalRequest = {
  language: "en" | "sw";
  species: string | null;
  group_name: string;
  age_group: string;
  symptoms: string[];
  observations: string;
  duration_days: number | null;
  affected: number;
  herd_size: number;
  county: string | null;
  area: string | null;
  warning_signs: string[];
  warning_check: boolean;
  vaccination: string;
  feeding_changes: string;
  introductions: string;
  photo_attached: boolean;
};
export type AnimalResult = AdvisoryContext & {
  status: "urgent_referral" | "needs_clarification" | "possible_matches";
  urgency: string;
  species: string | null;
  possibilities: { id: string; name: string; matched_symptoms: string[] }[];
  clarification: string | null;
  next_actions: string[];
  photo_analysis: string;
  review_route: "veterinarian";
};
export type AnimalCase = {
  id: number;
  created_at: string;
  observation: AnimalRequest;
  result: AnimalResult;
};
export const speciesOptions = [
  ["cattle", "Cattle", "Ng’ombe"],
  ["goat", "Goats", "Mbuzi"],
  ["sheep", "Sheep", "Kondoo"],
  ["chicken", "Chickens", "Kuku"],
];
export const symptomOptions = [
  ["cough", "Coughing", "Kukohoa"],
  ["nasal_discharge", "Nasal discharge", "Kamasi puani"],
  ["diarrhoea", "Diarrhoea", "Kuharisha"],
  ["poor_appetite", "Reduced appetite", "Kupungua hamu ya kula"],
  ["itching", "Itching", "Kuwashwa"],
  ["skin_lesions", "Skin lesions", "Vidonda vya ngozi"],
  ["udder_swelling", "Swollen udder", "Kiwele kuvimba"],
  ["milk_change", "Changed milk", "Maziwa kubadilika"],
];
export const warningOptions = [
  ["breathing_difficulty", "Difficulty breathing", "Kupumua kwa shida"],
  ["unable_to_stand", "Unable to stand", "Kushindwa kusimama"],
  ["sudden_deaths", "Sudden deaths", "Vifo vya ghafla"],
  ["rapid_spread", "Signs spreading rapidly", "Dalili kuenea haraka"],
];
