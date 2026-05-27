interface Props {
  role: 'user' | 'assistant'
  content: string
}

function renderContent(text: string) {
  return text.split('\n').map((line, lineIdx) => (
    <span key={lineIdx}>
      {lineIdx > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((segment, segIdx) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return <strong key={segIdx}>{segment.slice(2, -2)}</strong>
        }
        return segment
      })}
    </span>
  ))
}

export function ChatBubble({ role, content }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] sm:max-w-[420px]
          ${isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card shadow-editorial text-foreground'
          }
        `}
      >
        {renderContent(content)}
      </div>
    </div>
  )
}
