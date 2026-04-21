"use client";

import { useMemo } from "react";
import { marked, type Tokens } from "marked";

interface ArticleContentProps {
  content: string;
}

export function ArticleContent({ content }: ArticleContentProps) {
  const html = useMemo(() => {
    const renderer = new marked.Renderer();

    renderer.heading = function ({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens);
      const id = text
        .toLowerCase()
        .replace(/<[^>]*>/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    };

    const originalTable = renderer.table.bind(renderer);
    renderer.table = function (token: Tokens.Table) {
      const inner = originalTable(token);
      return `<div class="overflow-x-auto">${inner}</div>`;
    };

    renderer.blockquote = function ({ tokens }: Tokens.Blockquote) {
      const body = this.parser.parse(tokens);
      const isWarning = body.includes("<strong>Important");
      const isNote = body.includes("<strong>Note");
      const variant = isWarning ? "warning" : isNote ? "info" : "info";
      const colors = {
        info: "bg-[#dbeafe] border-blue-300",
        warning: "bg-[#fef3c7] border-amber-300",
      };
      return `<div class="callout ${colors[variant]} border-l-4 rounded-lg p-4 my-4">${body}</div>`;
    };

    return marked.parse(content, { renderer, gfm: true }) as string;
  }, [content]);

  return (
    <div
      className="article-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
