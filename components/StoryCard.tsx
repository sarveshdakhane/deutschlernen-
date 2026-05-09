import Link from "next/link";
import { Story } from "@/lib/types";

type Props = {
  story: Story;
};

export default function StoryCard({ story }: Props) {
  const preview = story.story.slice(0, 180).trim() + "…";

  return (
    <Link href={`/stories/${story.slug}`} className="block group">
      <div className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all bg-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {story.difficulty}
          </span>
          <span className="text-xs text-gray-400">{story.date}</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
          {story.title}
        </h2>
        <p className="text-sm text-gray-500 mb-3">{story.topic}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{preview}</p>
        <p className="mt-4 text-sm text-blue-600 font-medium group-hover:text-blue-800 transition-colors">
          Read full story →
        </p>
      </div>
    </Link>
  );
}
