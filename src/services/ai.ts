import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, Highlight } from '../types'
import { meetings } from '../data/meetings'

function summarizeMeeting(m: typeof meetings[0]) {
  return {
    title: m.title,
    participants: m.participants.map(p => p.name),
    summary: m.summary.executive,
    topics: m.summary.keyTopics,
    decisions: m.summary.decisions,
    actions: m.actionItems.map(a => `**${a.title}**\n   - Assigned to: ${a.assignee}\n   - Due: ${a.dueDate}\n   - Status: ${a.status}`),
    highlights: m.highlights.map(h => ({ title: h.title, speaker: h.speaker, time: h.timestamp, desc: h.description })),
  }
}

const CONTEXT_CACHE: Record<string, ReturnType<typeof summarizeMeeting>> = {}
meetings.forEach(m => { CONTEXT_CACHE[m.id] = summarizeMeeting(m) })

export async function queryMeeting(
  meetingId: string,
  query: string,
  _conversationHistory: ChatMessage[],
): Promise<{ answer: string; highlights: Highlight[] }> {
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800))

  const meeting = meetings.find(m => m.id === meetingId)
  if (!meeting) {
    return {
      answer: 'I couldn\'t find that meeting in the context. Could you try rephrasing your question?',
      highlights: [],
    }
  }

  const ctx = CONTEXT_CACHE[meetingId]
  const q = query.toLowerCase()

  const highlights: Highlight[] = []

  if (/decision|decided|agree|commit/.test(q)) {
    const answer = `Here are the key decisions from **${ctx.title}**:\n\n${ctx.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n\n')}`
    ctx.highlights.filter(h => h.title).slice(0, 2).forEach(h => {
      const src = meeting.highlights.find(mh => mh.title === h.title)
      if (src) highlights.push({ id: uuidv4(), meetingId, timestamp: src.timestamp, title: src.title, description: src.description, speaker: src.speaker, type: 'decision' })
    })
    return { answer, highlights }
  }

  if (/action|task|todo|assign/.test(q)) {
    const pending = meeting.actionItems.filter(a => a.status === 'pending')
    const answer = pending.length > 0
      ? `Here are the pending action items from **${ctx.title}**:\n\n${pending.map((a, i) => `${i + 1}. **${a.title}**\n   - Assigned to: ${a.assignee}\n   - Due: ${a.dueDate}`).join('\n\n')}`
      : `There are no pending action items for **${ctx.title}**. All ${meeting.actionItems.length} items have been completed.`
    meeting.actionItems.slice(0, 2).forEach(a => {
      highlights.push({ id: uuidv4(), meetingId, timestamp: a.sourceTimestamp, title: a.title, description: `Assigned to ${a.assignee}, due ${a.dueDate}`, speaker: a.assignee, type: 'action' })
    })
    return { answer, highlights }
  }

  if (/topic|subject|discuss|main/.test(q)) {
    return { answer: `The main topics discussed in **${ctx.title}** were:\n\n${ctx.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nThese topics shaped the meeting's direction and the decisions that followed.`, highlights: [] }
  }

  if (/summar|overview|recap/.test(q)) {
    return { answer: `**${ctx.title}**\n\n${ctx.summary}\n\n**Participants:** ${ctx.participants.join(', ')}`, highlights: [] }
  }

  if (/highlight|key moment|important/.test(q)) {
    if (ctx.highlights.length === 0) return { answer: `No highlights were flagged for **${ctx.title}**.`, highlights: [] }
    return { answer: `Here are the highlights from **${ctx.title}**:\n\n${ctx.highlights.map((h, i) => `${i + 1}. **${h.title}** (${formatTimestamp(h.time)})\n   - ${h.speaker}: "${h.desc}"`).join('\n\n')}`, highlights: [] }
  }

  if (/who|attend|participant|people/.test(q)) {
    return { answer: `**${ctx.participants.length} participants** in **${ctx.title}**:\n\n${ctx.participants.map(p => `- ${p}`).join('\n')}`, highlights: [] }
  }

  if (/sentiment|tone|mood|feeling/.test(q)) {
    const s = meeting.summary.sentiment
    const label = s === 'positive' ? 'Positive' : s === 'neutral' ? 'Neutral' : 'Mixed'
    const detail = s === 'positive' ? 'The meeting was generally constructive and forward-looking.' : s === 'neutral' ? 'The meeting was informational with no strong positive or negative signals.' : 'The meeting had both positive and challenging moments.'
    return { answer: `The sentiment of **${ctx.title}** was **${label}**. ${detail}`, highlights: [] }
  }

  const speakerMatch = ctx.participants.find(p => q.includes(p.split(' ')[0].toLowerCase()))
  if (speakerMatch && /say|mention|talk|state|remark|comment/.test(q)) {
    const pId = meeting.participants.find(p => p.name === speakerMatch)?.id
    if (pId) {
      const relevantSegs = meeting.transcript.filter(seg => seg.speakerId === pId).slice(0, 4)
      const speakerName = speakerMatch
      if (relevantSegs.length > 0) {
        const quotes = relevantSegs.map(seg => `> ${seg.text}`).join('\n\n')
        return { answer: `Here's what **${speakerName}** said:\n\n${quotes}`, highlights: [] }
      }
      return { answer: `**${speakerName}** participated in the meeting but no individual quotes were recorded for them in the transcript.`, highlights: [] }
    }
  }

  const topicMatch = ctx.topics.find(t => q.includes(t.toLowerCase()))
  if (topicMatch) {
    const relevantSegs = meeting.transcript.filter(seg => {
      const text = seg.text.toLowerCase()
      return text.includes(topicMatch.toLowerCase()) || text.includes(topicMatch.toLowerCase().replace(/[^a-z0-9]/g, ''))
    }).slice(0, 3)
    const relatedDecisions = ctx.decisions.filter(d => d.toLowerCase().includes(topicMatch.toLowerCase()) || d.toLowerCase().includes(topicMatch.toLowerCase().replace(/[^a-z0-9]/g, '')))
    let answer = `Here's what was discussed about **${topicMatch}** in **${ctx.title}**:\n\n`
    if (relevantSegs.length > 0) {
      answer += relevantSegs.map(seg => `> ${seg.text}`).join('\n\n')
    } else {
      answer += `The topic "${topicMatch}" was a key theme in the meeting.\n\n`
    }
    if (relatedDecisions.length > 0) {
      answer += `\n**Related decisions:**\n${relatedDecisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
    }
    return { answer, highlights: [] }
  }

  return {
    answer: `Based on **${ctx.title}** (${meeting.date.split('T')[0]}):\n\n${ctx.summary}\n\n**Main topics:** ${ctx.topics.join(', ')}\n\n**Participants:** ${ctx.participants.join(', ')}\n\n**Decisions:** ${ctx.decisions.length} key decisions were made.\n\nWould you like me to elaborate on any specific aspect?`,
    highlights: [],
  }
}

export async function searchMeetings(query: string): Promise<{ meetingId: string; excerpt: string; score: number }[]> {
  await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400))

  const results: { meetingId: string; excerpt: string; score: number }[] = []
  const q = query.toLowerCase()

  meetings.forEach(meeting => {
    const ctx = CONTEXT_CACHE[meeting.id]
    let score = 0
    let excerpt = ''

    if (meeting.title.toLowerCase().includes(q)) score += 10
    ctx.topics.forEach(topic => {
      if (topic.toLowerCase().includes(q)) score += 5
    })
    ctx.decisions.forEach(d => {
      if (d.toLowerCase().includes(q)) { score += 3; excerpt = d }
    })
    meeting.transcript.forEach(seg => {
      if (seg.text.toLowerCase().includes(q)) {
        score += 1
        if (!excerpt) excerpt = seg.text.slice(0, 200)
      }
    })
    meeting.summary.keyTopics.forEach(t => {
      if (t.toLowerCase().includes(q)) { score += 4; if (!excerpt) excerpt = t }
    })

    if (score > 0) {
      if (!excerpt && ctx.summary) {
        excerpt = ctx.summary.slice(0, 200) + '...'
      }
      results.push({ meetingId: meeting.id, excerpt: excerpt || ctx.summary.slice(0, 200), score })
    }
  })

  return results.sort((a, b) => b.score - a.score).slice(0, 5)
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
