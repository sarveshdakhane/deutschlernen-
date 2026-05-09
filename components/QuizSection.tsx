type Props = {
  readingQuestions: string[];
  writingPrompts: string[];
};

export default function QuizSection({ readingQuestions, writingPrompts }: Props) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-4">Quiz</h3>
      <p className="text-xs text-gray-500 mb-4 italic">Answer all questions in full sentences.</p>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Reading Comprehension</h4>
        <ol className="space-y-3">
          {readingQuestions.map((q, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{q}</p>
                <div className="mt-2 h-px bg-gray-100 w-full print:h-8 print:border-b print:border-dashed print:border-gray-300" />
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Writing Practice</h4>
        <ol className="space-y-4">
          {writingPrompts.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{p}</p>
                <div className="mt-2 space-y-1 print:space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-px bg-gray-100 print:h-8 print:border-b print:border-dashed print:border-gray-300" />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
