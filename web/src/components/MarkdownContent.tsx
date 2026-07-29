import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} rel="noreferrer" target="_blank">
              {children}
            </a>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
