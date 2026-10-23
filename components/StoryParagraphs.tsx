type Props = {
  paragraphs: string[];
};

export default function StoryParagraphs({ paragraphs }: Props) {
  return (
    <>
      {paragraphs.map((text, i) => (
        <p
          key={i}
          className="text-[17px] sm:text-[18px] leading-[1.85] sm:leading-[1.9] text-gray-800 text-left sm:text-justify hyphens-none"
          lang="de"
        >
          {text}
        </p>
      ))}
    </>
  );
}
