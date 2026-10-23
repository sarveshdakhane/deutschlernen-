type Props = {
  message?: string;
};

export default function LoadingState({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin" />
      <p className="text-sm text-slate-400">{message ?? "Generating your story with Claude…"}</p>
    </div>
  );
}
