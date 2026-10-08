import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  stage?: 'soon' | 'ended'
  daysLeft?: number
  companyName?: string
}

const PRICING_URL = 'https://app.inreco.co.za/pricing'

const TrialEndingEmail = ({ stage = 'soon', daysLeft = 2, companyName }: Props) => {
  const ended = stage === 'ended'
  const hello = companyName ? `Hi ${companyName} team,` : 'Hi there,'
  const preview = ended
    ? 'Your iNRECO free trial has ended — pick a plan to keep CARA on your side.'
    : `Your iNRECO free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>iNRECO</Text>
          <Heading style={h1}>
            {ended ? 'Your free trial has ended' : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
          </Heading>
          <Text style={text}>{hello}</Text>
          <Text style={text}>
            {ended
              ? 'Thanks for trying iNRECO. Your 7-day free trial is over, so CARA and your document tools are paused for now.'
              : 'Thanks for trying iNRECO, your pocket labour consultant. Your 7-day free trial is almost over.'}
          </Text>
          <Text style={text}>
            Choose a plan to keep asking CARA questions, creating warnings, contracts and hearing documents, and verifying sick notes. Your saved documents and company details stay right where you left them.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={PRICING_URL} style={button}>
              {ended ? 'Choose a plan' : 'Keep my access'}
            </Button>
          </Section>
          <Text style={muted}>
            Questions? Just reply to this email or WhatsApp us from inside the app.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TrialEndingEmail,
  subject: (d: Record<string, any>) =>
    d?.stage === 'ended'
      ? 'Your iNRECO free trial has ended'
      : `Your iNRECO free trial ends in ${d?.daysLeft ?? 2} days`,
  displayName: 'Trial ending reminder',
  previewData: { stage: 'soon', daysLeft: 2, companyName: 'Pudding & Puddles' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '520px' }
const brand = { fontSize: '18px', fontWeight: 700, color: '#1d4ed8', margin: '0 0 16px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 14px' }
const muted = { fontSize: '13px', lineHeight: '20px', color: '#64748b' }
const button = {
  backgroundColor: '#1d4ed8', color: '#ffffff', padding: '14px 28px',
  borderRadius: '10px', fontSize: '16px', fontWeight: 700, textDecoration: 'none',
}
