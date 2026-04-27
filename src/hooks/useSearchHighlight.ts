import { useEffect } from 'react';

// TS declarations for CSS Custom Highlight API
declare global {
  interface CSS {
    highlights: {
      set(name: string, highlight: any): void;
      delete(name: string): void;
      clear(): void;
    };
  }
}

export function useSearchHighlight(ref: React.RefObject<HTMLElement | null>, query: string) {
  useEffect(() => {
    if (!('highlights' in CSS)) return;
    
    if (!ref.current || !query) {
      CSS.highlights.delete('search-highlight');
      return;
    }

    const q = query.toLowerCase();

    function updateHighlight() {
      if (!ref.current) return;
      const treeWalker = document.createTreeWalker(ref.current, NodeFilter.SHOW_TEXT);
      const ranges: Range[] = [];
      
      let node = treeWalker.nextNode();
      while (node) {
        const text = node.nodeValue?.toLowerCase() || '';
        let index = 0;
        while ((index = text.indexOf(q, index)) !== -1) {
          const range = new Range();
          range.setStart(node, index);
          range.setEnd(node, index + q.length);
          ranges.push(range);
          index += q.length;
        }
        node = treeWalker.nextNode();
      }
      
      const highlight = new Highlight(...ranges);
      CSS.highlights.set('search-highlight', highlight);
    }

    // 初始化高亮
    updateHighlight();

    // 监听 DOM 变化以实时更新高亮
    const observer = new MutationObserver(updateHighlight);
    observer.observe(ref.current, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    
    return () => {
      observer.disconnect();
      CSS.highlights.delete('search-highlight');
    };
  }, [ref, query]);
}
