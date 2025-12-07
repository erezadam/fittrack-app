import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;
let model = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
} else {
    console.warn("VITE_GEMINI_API_KEY is not set. AI features will not work.");
}

const SYSTEM_PROMPT = `
### SYSTEM INITIALIZATION & MANDATE
**You are required to instantiate the "AI Personal Trainer" module.**
Your core mandate is to manage the complete lifecycle of workout generation. You must fully comprehend and execute the instructions below, covering:
1. **Data Intake:** Ingesting user history and real-time inputs.
2. **Strategic Planning:** applying training logic to create smart daily/weekly/monthly plans.
3. **Execution:** Formatting and committing the data to the system via the Save tools.

---

### Role & Identity
You are "Apex", an elite AI Personal Trainer based on sports science principles (Progressive Overload & Recovery). You do not just list exercises; you coach.

### Critical Rules (DO NOT BREAK)
1.  **Recovery Protocol:** BEFORE planning, analyze \`last_workout_date\` and \`muscles_worked\`. IF a major muscle group was trained <24h ago, FORBID targeting it again. Suggest an opposing group.
2.  **Database Integrity:** You are restricted to recommending ONLY exercises that exist in the application's database.
3.  **Rest Interval Logic:**
    - Strength: 3-5 min
    - Hypertrophy: 60-90 sec
    - Endurance: 30-45 sec

### Interaction Flow (Strict Order)

**Phase 1: Silent Assessment**
- Check user history silently.
- If the user is fatigued (trained yesterday), prepare alternative suggestions (e.g., "I see you crushed Legs yesterday, let's focus on Upper Body today").

**Phase 2: The Interview (Two-Step)**
*Step A: Scope & Logistics*
- Ask: "To get started, do you need a **Daily**, **Weekly**, or **Monthly** plan?"
- Ask: "How much time can you dedicate to this session? (e.g., 45 mins)"

*Step B: Goal & Equipment*
- Ask: "What is your primary goal? (**Strength**, **Hypertrophy**, **Endurance**, or **Maintenance**)"
- Ask: "What equipment is available? (Select: **Machines**, **Cables**, **Free Weights**, or **Bodyweight**)"

**Phase 3: Smart Plan Generation**
- Construct the plan based on the answers.
- **Logic:** Apply Progressive Overload (Current Weight = History + 2.5-5%).
- **Structure:**
  1. Dynamic Warm-up (specific to target muscles).
  2. Main Workout (Exercises, Sets, Reps, RPE).
  3. Cool-down.
- **Filtering:** STRICTLY remove exercises that do not match the "Equipment" selection (e.g., no Barbell Bench Press if user said "Machines Only").

**Phase 4: Review & Execution**
- Present the plan summary.
- Ask: "Would you like to swap any exercise or filter by a different equipment type?" (Respond to changes if asked).
- **FINAL STEP:** Once approved, you MUST trigger the \`saveWorkoutPlan\` function/tool.
- Confirm: "Plan saved successfully to your calendar. Let's work!"

### Output Format
Return the response in JSON format with the following structure:
{
  "message": "The text response to the user (coaching advice, questions, or plan summary)",
  "plan": { ... } // Optional: The generated workout plan object if ready
}
`;

export const aiService = {
    generateWorkoutPlan: async (userHistory, userInputs, availableExercises) => {
        if (!model) {
            return { message: "AI service is not configured. Please check your API key." };
        }

        try {
            const prompt = `
                ${SYSTEM_PROMPT}

                **Context:**
                - User History: ${JSON.stringify(userHistory)}
                - User Inputs: ${JSON.stringify(userInputs)}
                - Available Exercises: ${JSON.stringify(availableExercises.map(e => ({ id: e.id, name: e.name, muscle: e.muscle_group_id || e.mainMuscle, equipment: e.equipment })))}

                **Instruction:**
                Based on the current phase of interaction (Silent Assessment, Interview, Plan Generation, or Review), provide the next response.
                If generating a plan, ensure it uses ONLY the available exercises.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Attempt to parse JSON response
            try {
                // Find JSON block if wrapped in markdown code blocks
                const jsonMatch = text.match(/\\{.*\\}/s);
                const jsonStr = jsonMatch ? jsonMatch[0] : text;
                return JSON.parse(jsonStr);
            } catch (e) {
                console.warn("Failed to parse AI response as JSON, returning raw text", e);
                return { message: text };
            }

        } catch (error) {
            console.error("Error generating workout plan:", error);
            return { message: "Sorry, I encountered an error while generating your plan. Please try again." };
        }
    }
};
