import React from "react";
import {
  AIStudyRecommendation,
  RecommendedAction,
} from "@/services/aiService"; // Adjust path if needed

// --- Icons (using your style) ---
const IconAI = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 15m0 0l-.813.904M9 15v.904M9 15c0-1.667.68-3.19 1.76-4.24M18 10a8.25 8.25 0 01-1.443 4.542l.024.023-.024-.023a8.25 8.25 0 01-4.302 2.122M15 9.75a8.96 8.96 0 01-4.302 2.122M15 9.75c0-4.625-3.52-8.44-8.25-8.941M15 9.75S14.72 6.75 12 6.75c-2.72 0-3 3-3 3m0 0v.904m0-1.204c-.628-.19-1.297-.315-2-.375M3 15c0-1.667.68-3.19 1.76-4.24M3 15c0 4.625 3.52 8.44 8.25 8.941a8.96 8.96 0 004.302-2.122m-8.25 3.122v.904M3 15l-.813.904M3 15l.813.904m0 0V15m0 0c.628-.19 1.297-.315 2-.375m0 0c1.667 0 3.19.68 4.24 1.76M12 21c-2.72 0-3-3-3-3" /></svg>
);
const IconQuiz = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
);
const IconNote = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
);
const IconSummary = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V17.25zm0 2.25h.008v.008H8.25v-.008zm3.75-6h.008v.008H12v-.008zm0 2.25h.008v.008H12v-.008zm0 2.25h.008v.008H12v-.008zm3.75-6h.008v.008H15.75v-.008zm0 2.25h.008v.008H15.75v-.008zm0 2.25h.008v.008H15.75v-.008zM5.625 3.75H4.75A2.25 2.25 0 002.5 6v12.75c0 1.242.984 2.25 2.25 2.25h10.5A2.25 2.25 0 0017.5 18.75V6.75c0-1.242-.984-2.25-2.25-2.25H13.5m-7.875 0h1.25m-1.25 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25h1.25m-7.5 0h7.5m-7.5 0H5.625M5.625 3.75h.008v.008H5.625V3.75z" /></svg>
);
const IconFlashcard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
);
const IconGlossary = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m-1.125 0H6.75A2.25 2.25 0 004.5 6v12a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 18v-2.625m-7.5 0v.008v.008H12v-.008v-.008H12z" /></svg>
);
const IconQnA = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-6.375 3h9M3.375 5.25c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>
);
const IconDefault = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
);
// --- End Icons ---

// Helper function to get an icon for the action
const getActionIcon = (action: RecommendedAction) => {
  const props = { className: "w-5 h-5 mr-2 flex-shrink-0" };
  switch (action) {
    case "AI_MENTOR":
      return <IconAI {...props} />;
    case "TAKE_QUIZ":
      return <IconQuiz {...props} />;
    case "VIEW_SUMMARY":
      return <IconSummary {...props} />;
    case "STUDY_FLASHCARDS":
      return <IconFlashcard {...props} />;
    case "REVIEW_NOTES":
      return <IconNote {...props} />;
    case "CHECK_GLOSSARY":
      return <IconGlossary {...props} />;
    case "VIEW_QA_PAIRS":
      return <IconQnA {...props} />;
    default:
      return <IconDefault {...props} />;
  }
};

// Helper function to get the color for the priority
const getPriorityStyles = (priority: "High" | "Medium") => {
  return priority === "High"
    ? {
        borderColor: "border-red-500",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        textColor: "text-red-700 dark:text-red-400",
        label: "High Priority",
      }
    : {
        borderColor: "border-yellow-500",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        textColor: "text-yellow-700 dark:text-yellow-400",
        label: "Medium Priority",
      };
};

interface RecommendationCardProps {
  rec: AIStudyRecommendation;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ rec }) => {
  const styles = getPriorityStyles(rec.priority);
  const icon = getActionIcon(rec.action);

  return (
    <div
      className={`mb-4 w-full rounded-lg border-l-4 p-4 shadow-md ${styles.borderColor} ${styles.bgColor}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex items-center text-sm font-semibold ${styles.textColor}`}
        >
          {icon}
          {styles.label}
        </span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Avg. Score: {rec.score.toFixed(0)}%
        </span>
      </div>
      <h3 className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-100">
        {rec.topic_name}
      </h3>
      <p className="mt-1 text-slate-700 dark:text-slate-300">
        {rec.recommendation_text}
      </p>
    </div>
  );
};

export default RecommendationCard;