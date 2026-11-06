import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  title?: string
  employeeName?: string
  caseNumber?: string
  typeLabel?: string
  dueLabel?: string
  source?: string
  dueDateText?: string
  mayExtendToText?: string
  daysLeft?: number
  stage?: number
}

const TRACKER_URL = 'https://app.inreco.co.za/account-app/deadlines'

function whenText(daysLeft: number) {
  if (daysLeft < 0) return `passed ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago`
  if (daysLeft === 0) return 'is today'
  if (daysLeft === 1) return 'is tomorrow'
  return `is in ${daysLeft} days`
}

const CcmaDeadlineReminderEmail = ({
  title = 'Your matter',
  employeeName,
  caseNumber,
  typeLabel = 'CCMA deadline',
  dueLabel = 'Your deadline',
  source,
  dueDateText = '',
  mayExtendToText,
  daysLeft = 0,
}: Props) => {
  const when = whenText(daysLeft)
  const preview = `${title}: deadline ${when} (${dueDateText}).`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>iNRECO</Text>
          <Heading style={h1}>
            {daysLeft < 0 ? 'A tracked deadline has passed' : daysLeft === 0 ? 'Deadline is today' : daysLeft === 1 ? 'Deadline is tomorrow' : `Deadline in ${daysLeft} days`}
          </Heading>
          <Section style={card}>
            <Text style={label}>Matter</Text>
            <Text style={value}>{title}{employeeName ? ` — ${employeeName}` : ''}</Text>
            {caseNumber ? (<><Text style={label}>Case number</Text><Text style={value}>{caseNumber}</Text></>) : null}
            <Text style={label}>Type</Text>
            <Text style={value}>{typeLabel}</Text>
            <Text style={label}>What is due</Text>
            <Text style={value}>{dueLabel}</Text>
            <Text style={label}>Date</Text>
            <Text style={{ ...value, fontWeight: 700 }}>{dueDateText} ({when})</Text>
            {mayExtendToText ? (
              <Text style={muted}>
                This date falls on a weekend or public holiday, so the last day may move to {mayExtendToText}. Don't rely on the extra time — act by {dueDateText} if you can.
              </Text>
            ) : null}
            {source ? <Text style={muted}>Based on: {source}</Text> : null}
          </Section>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={TRACKER_URL} style={button}>Open my deadlines</Button>
          </Section>
          <Text style={muted}>
            This date was worked out from what you entered in iNRECO. It is general guidance, not legal advice: a bargaining council may have jurisdiction, time limits can be extended or condoned, and the right start date can be disputed. Confirm with a labour-law practitioner before you rely on it.
          </Text>
          <Text style={muted}>
            You get this email because email reminders are on for this deadline. Switch them off on the deadline, or mark it done, in the app.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CcmaDeadlineReminderEmail,
  subject: (d: Record<string, any>) => {
    const n = Number(d?.daysLeft ?? 0)
    const t = d?.title ? String(d.title).slice(0, 60) : 'your matter'
    if (n < 0) return `Deadline passed: ${t}`
    if (n === 0) return `Due today: ${t}`
    if (n === 1) return `Due tomorrow: ${t}`
    return `${n} days left: ${t}`
  },
  displayName: 'CCMA deadline reminder',
  previewData: {
    title: 'J. Mokoena dismissal',
    employeeName: 'Jabu Mokoena',
    typeLabel: 'Unfair dismissal referral (30 days)',
    dueLabel: 'Last day for the employee to refer the dismissal dispute to the CCMA or bargaining council',
    source: 'Labour Relations Act 66 of 1995, s191(1)(b)(i)',
    dueDateText: 'Tue 1 Dec 2026',
    daysLeft: 3,
    stage: 3,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '520px' }
const brand = { fontSize: '18px', fontWeight: 700, color: '#1d4ed8', margin: '0 0 16px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '0 0 16px' }
const card = { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }
const label = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: '#64748b', margin: '8px 0 2px' }
const value = { fontSize: '15px', lineHeight: '22px', color: '#0f172a', margin: '0 0 4px' }
const muted = { fontSize: '13px', lineHeight: '20px', color: '#64748b', margin: '10px 0 0' }
const button = {
  backgroundColor: '#1d4ed8', color: '#ffffff', padding: '14px 28px',
  borderRadius: '10px', fontSize: '16px', fontWeight: 700, textDecoration: 'none',
}
