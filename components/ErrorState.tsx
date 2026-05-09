type Props = {
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-400 text-xl">
        !
      </div>
      <div>
        <p className="text-gray-700 font-medium">Something went wrong</p>
        <p className="text-sm text-gray-400 mt-1">{message ?? "Could not generate story. Please try again."}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
