import { useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Image } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = 'Write your message...' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize content only once or when value changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) exec('createLink', url);
  }, [exec]);

  const handleImage = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (url) exec('insertImage', url);
  }, [exec]);

  const handleInput = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const toolbarBtns = [
    { icon: Bold, action: () => exec('bold'), label: 'Bold' },
    { icon: Italic, action: () => exec('italic'), label: 'Italic' },
    { icon: Underline, action: () => exec('underline'), label: 'Underline' },
    { icon: List, action: () => exec('insertUnorderedList'), label: 'Bullet List' },
    { icon: ListOrdered, action: () => exec('insertOrderedList'), label: 'Numbered List' },
    { icon: Link2, action: handleLink, label: 'Insert Link' },
    { icon: Image, action: handleImage, label: 'Insert Image' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200 flex-wrap">
        {toolbarBtns.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            aria-label={btn.label}
            title={btn.label}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-ocean-100 hover:text-ocean-700 transition-colors"
          >
            <btn.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        data-ph={placeholder}
        className="px-4 py-3 min-h-[180px] max-h-[400px] overflow-y-auto text-ocean-900 text-sm leading-relaxed focus:outline-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_a]:text-ocean-600 [&_a]:underline empty:before:content-[attr(data-ph)] empty:before:text-slate-400"
      />
    </div>
  );
}
