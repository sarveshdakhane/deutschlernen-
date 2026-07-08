type Props = {
  message?: string;
};

export default function LoadingState({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{message ?? "Generating your story with Claude…"}</p>
    </div>
  );
}
